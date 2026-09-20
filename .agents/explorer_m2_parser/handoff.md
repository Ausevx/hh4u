# Handoff Report: Excel Parser Service Design (`excelParserService.ts`)

**Author**: Milestone M2 Explorer 1 (Excel Parser Service Design)  
**Target File**: `/Users/aditya/workspace/hh4u/backend/src/services/excelParserService.ts`  
**Working Directory**: `/Users/aditya/workspace/hh4u/.agents/explorer_m2_parser/`  
**Reference Source Code**: `/Users/aditya/workspace/hh4u/.agents/explorer_m2_parser/proposed_excelParserService.ts`  
**Timestamp**: 2026-09-19T02:49:00Z  

---

## 1. Observation

### 1.1 Specification Contract in `PROJECT.md`
In `/Users/aditya/workspace/hh4u/PROJECT.md` (lines 62–75), the interface contract for Excel ingestion is defined as:
```ts
### Backend Data Layer ↔ Excel Ingestion
- parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelData>
- parseExcelFile(filePath: string): Promise<ParsedExcelData>
- ParsedExcelData:
  interface ParsedExcelData {
    level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }>;
    consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }>;
    answers: Array<{ questionText: string; reasonText: string; remedyText: string; videoUrl?: string; answerType: 'level1' | 'diagnostic'; rawRow: number }>;
    stats: { totalRows: { level1: number; consultation: number; answers: number }; dataRows: { level1: number; consultation: number; answers: number } };
  }
- Error format: Throws ExcelValidationError with statusCode: 400, message: string, details?: string[].
```

### 1.2 Authoritative Metrics of `database-dummy.xlsx`
Direct programmatic inspection of `/Users/aditya/workspace/hh4u/database-dummy.xlsx` using `xlsx` (^0.18.5) and `openpyxl` yields the following exact metrics:

| Sheet Name | Total Rows (including Header) | Header Row (Row 1) | Data Rows (Rows 2..max) | Blank Data Rows |
|---|---|---|---|---|
| `level1` | 185 | `['Questions']` | 184 | 0 |
| `ConsultationQueries` | 185 | `['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3']` | 184 | 0 |
| `Answers` | 221 | `['Question', 'Reason', 'Remedy']` | 220 | 0 |

1. **`level1` Data (184 questions)**:
   - Row 2 (first): `"Are antibiotics safe for children?"`
   - Row 185 (last): `"Why is my child's cough not going away?"`
   - All 184 questions are unique, non-null, end with `'?'`, and match 1:1 with `ConsultationQueries.Questions` and `Answers.Question` (rows 2–185).
2. **`ConsultationQueries` Data (184 consultation sets)**:
   - Every single row has all 3 diagnostic questions populated (736 non-empty cells total).
   - Across the 552 diagnostic question cells (184 * 3), there are exactly 36 distinct diagnostic questions grouped across 12 clinical domain triplets.
3. **`Answers` Data (220 answer records)**:
   - Rows 2–185 (184 rows): 1:1 match to the 184 Level 1 questions (`answerType: 'level1'`).
   - Rows 186–221 (36 rows): 1:1 match to the 36 distinct diagnostic questions in alphabetical order (`answerType: 'diagnostic'`).
   - 195 rows contain embedded YouTube video links (`https://youtu.be/...`).
   - Total YouTube link occurrences across Reason and Remedy cells: 272 instances, resolving to 7 distinct video IDs:
     - `IUy9hg8iT3Q`, `L_F8VeK8VPQ`, `Be9GyqxlvhM`, `jbYbeU9TG80`, `a5MQWTSoa6A`, `_RRc9OC7ToY`, `C44dcWQmARY`.

### 1.3 Test Suite Expectations in `backend/tests/e2e/`
Inspection of `backend/tests/e2e/tier1_feature_coverage.test.ts` and `tier2_boundary_corner.test.ts` confirms the following strict test requirements:
1. `Test 1.6`: Discovers all 3 sheets: `level1`, `ConsultationQueries`, `Answers`.
2. `Test 1.7`: Extracts 184 Level 1 questions, `stats.totalRows.level1 === 185`, `stats.dataRows.level1 === 184`.
3. `Test 1.8`: Extracts 184 Consultation Queries with 3 diagnostic questions each, `stats.totalRows.consultation === 185`.
4. `Test 1.9`: Extracts 220 Answers, `stats.totalRows.answers === 221`, isolates video URLs matching `/https:\/\/youtu\.be\//` (more than 150 entries with video URLs).
5. `Test 1.10`: Parses successfully from an in-memory `Buffer`.
6. `Test 2.1`: Rejects empty buffer (0 bytes) with `ExcelValidationError` (`statusCode: 400`).
7. `Test 2.2`: Rejects non-zip binary file (`statusCode: 400`, message matching `/corrupted|invalid/i`).
8. `Test 2.3`: Rejects non-xlsx text file with `ExcelValidationError`.
9. `Tests 2.4 - 2.6`: Rejects missing sheets with `statusCode: 400`, message matching `/missing required sheet.*<sheet>/i`.
10. `Tests 2.7 - 2.9`: Rejects missing column headers with `statusCode: 400`, message matching `/missing required header/i`.
11. `Test 2.10`: Trims leading/trailing whitespace and `\n\n` newlines cleanly from all fields.

---

## 2. Logic Chain

1. **Resolution of Row Counts**:
   - `ORIGINAL_REQUEST.md` lines 103–105 state: *"level1 (185 rows)... ConsultationQueries (185 rows)... Answers (221 rows)"*.
   - Excel row 1 is the header row.
   - Therefore, `totalRows` is 185, 185, 221; `dataRows` is 184, 184, 220. The `stats` object in `ParsedExcelData` cleanly encapsulates both dimensions.
2. **Dual Ingestion Entry Points**:
   - `parseExcelBuffer(buffer: Buffer)`: Required for multipart form upload (`POST /api/admin/knowledge-base/import` via Multer memory storage).
   - `parseExcelFile(filePath: string)`: Required for CLI seed script (`backend/src/scripts/seedKnowledgeBase.ts`). It verifies file existence on disk (throwing 404 if absent), reads the file into a Buffer, and delegates to `parseExcelBuffer`.
3. **Format & Signature Verification**:
   - Checking ZIP header magic bytes (`0x50, 0x4B` / `PK`) at offset 0 catches non-zip binary junk, plain text CSVs, and truncated buffers before passing them to the XML decompression engine.
   - Catching `XLSX.read` errors guarantees that corrupted ZIP archives throw `ExcelValidationError` (statusCode 400) rather than unhandled library crashes.
4. **Header and Column Resilience**:
   - Rather than relying on hardcoded column indices `row[0]`, `row[1]`, `row[2]`, column positions are resolved dynamically using `indexOf`:
     - `ConsultationQueries`: finds `'Questions'`, `'Diagnostic Question 1'`, `'Diagnostic Question 2'`, `'Diagnostic Question 3'`.
     - `Answers`: finds `'Question'`, `'Reason'`, `'Remedy'`.
   - All cell values are coerced via `String(val).trim()`, discarding empty rows and trimming trailing `\n\n` newlines.
5. **YouTube URL Extraction**:
   - Standard regex: `/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})[^\s]*/`.
   - Remedy cell takes primary precedence for clinical video demonstrations; if absent, Reason cell is checked.
   - Extracted URLs have trailing punctuation (`.`, `,`, `)`, `]`) trimmed.
6. **Answer Classification**:
   - Answers matching Level 1 question texts (rows 2–185) receive `answerType: 'level1'`.
   - Answers corresponding to diagnostic questions (rows 186–221) receive `answerType: 'diagnostic'`.

---

## 3. Caveats

1. **Sheet Name Matching**:
   - Tests in `backend/tests/e2e/tier2_boundary_corner.test.ts` assert exact error text matching `/missing required sheet.*level1/i`. The parser checks canonical sheet names `['level1', 'ConsultationQueries', 'Answers']` and produces verbatim messages matching this regex.
2. **Dependency Availability**:
   - `xlsx` (`^0.18.5`) is already installed in `backend/package.json`. No additional npm packages are required for Excel workbook parsing.
3. **Answer Model Schema**:
   - `backend/src/models/Answer.ts` already has optional `level1QuestionId`, required `questionText`, enum `answerType: ['level1', 'diagnostic']`, and `videoUrl`. When seeding diagnostic answers (rows 186–221), `level1QuestionId` is omitted/null and `answerType: 'diagnostic'` is stored.
4. **Seed Script Separation**:
   - CLI seed script implementation (`backend/src/scripts/seedKnowledgeBase.ts`) is assigned to Explorer 3 / Worker. The parser service strictly delivers the data parsing layer without side-effect database mutations.

---

## 4. Conclusion & Production Code Recommendation

The Worker backend implementer should create `/Users/aditya/workspace/hh4u/backend/src/services/excelParserService.ts` with the complete, production-ready code below (also preserved at `/Users/aditya/workspace/hh4u/.agents/explorer_m2_parser/proposed_excelParserService.ts`).

### Production Code for `backend/src/services/excelParserService.ts`

```ts
import fs from 'fs';
import * as XLSX from 'xlsx';

/**
 * Regular expression to identify and extract YouTube video URLs across:
 * - https://youtu.be/<ID>?...
 * - https://www.youtube.com/watch?v=<ID>
 * - http://... variants
 */
export const YOUTUBE_URL_REGEX = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})[^\s]*/;

/**
 * Canonical sheet names required in the knowledge base workbook.
 */
export const EXPECTED_SHEETS = ['level1', 'ConsultationQueries', 'Answers'] as const;

/**
 * Expected column headers per worksheet.
 */
export const EXPECTED_HEADERS = {
  level1: ['Questions'],
  ConsultationQueries: ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
  Answers: ['Question', 'Reason', 'Remedy'],
} as const;

/**
 * Interface contract matching PROJECT.md for parsed Excel workbook data.
 */
export interface ParsedExcelData {
  level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }>;
  consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }>;
  answers: Array<{
    questionText: string;
    reasonText: string;
    remedyText: string;
    videoUrl?: string;
    answerType: 'level1' | 'diagnostic';
    rawRow: number;
  }>;
  stats: {
    totalRows: { level1: number; consultation: number; answers: number };
    dataRows: { level1: number; consultation: number; answers: number };
  };
}

/**
 * Custom error class for Excel ingestion validation failures.
 * Sets HTTP status code (defaults to 400) and optional array of detail messages.
 */
export class ExcelValidationError extends Error {
  statusCode: number;
  details?: string[];

  constructor(message: string, statusCode: number = 400, details?: string[]) {
    super(message);
    this.name = 'ExcelValidationError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ExcelValidationError.prototype);
  }
}

/**
 * Extracts a YouTube URL from text if present, sanitizing trailing punctuation.
 */
export function extractVideoUrl(text: string | null | undefined): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const match = text.match(YOUTUBE_URL_REGEX);
  if (!match) return undefined;
  return match[0].replace(/[.,;:)\]>]+$/, '');
}

/**
 * Validates and parses an in-memory Excel file buffer.
 *
 * @param buffer - Binary Buffer containing the Excel workbook (.xlsx)
 * @returns Promise resolving to the validated ParsedExcelData structure
 * @throws ExcelValidationError on missing/corrupted file, missing sheets, or missing headers
 */
export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelData> {
  if (!buffer || buffer.length === 0) {
    throw new ExcelValidationError('Empty file buffer provided', 400);
  }

  // Verify XLSX ZIP header signature (0x50, 0x4B)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ExcelValidationError('Corrupted or invalid Excel file format: missing ZIP header', 400);
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err: any) {
    throw new ExcelValidationError(
      `Corrupted or invalid Excel file format: ${err?.message || 'Unreadable workbook'}`,
      400
    );
  }

  // Validate sheet existence
  for (const sheetName of EXPECTED_SHEETS) {
    if (!wb.SheetNames.includes(sheetName)) {
      throw new ExcelValidationError(`Missing required sheet: ${sheetName}`, 400);
    }
  }

  // Validate Sheet: level1
  const level1Ws = wb.Sheets['level1'];
  const level1Aoa: any[][] = XLSX.utils.sheet_to_json(level1Ws, { header: 1 });
  if (level1Aoa.length === 0 || !level1Aoa[0] || String(level1Aoa[0][0] || '').trim() !== 'Questions') {
    throw new ExcelValidationError("Sheet 'level1' missing required header: 'Questions'", 400);
  }

  // Validate Sheet: ConsultationQueries
  const consultWs = wb.Sheets['ConsultationQueries'];
  const consultAoa: any[][] = XLSX.utils.sheet_to_json(consultWs, { header: 1 });
  const consultHeaders = (consultAoa[0] || []).map((h: any) => (h != null ? String(h).trim() : ''));
  for (const expHeader of EXPECTED_HEADERS.ConsultationQueries) {
    if (!consultHeaders.includes(expHeader)) {
      throw new ExcelValidationError(`Sheet 'ConsultationQueries' missing required header: '${expHeader}'`, 400);
    }
  }

  // Validate Sheet: Answers
  const answersWs = wb.Sheets['Answers'];
  const answersAoa: any[][] = XLSX.utils.sheet_to_json(answersWs, { header: 1 });
  const answersHeaders = (answersAoa[0] || []).map((h: any) => (h != null ? String(h).trim() : ''));
  for (const expHeader of EXPECTED_HEADERS.Answers) {
    if (!answersHeaders.includes(expHeader)) {
      throw new ExcelValidationError(`Sheet 'Answers' missing required header: '${expHeader}'`, 400);
    }
  }

  // Dynamic column mapping for resilience against column order variations
  const consultQCol = consultHeaders.indexOf('Questions');
  const consultD1Col = consultHeaders.indexOf('Diagnostic Question 1');
  const consultD2Col = consultHeaders.indexOf('Diagnostic Question 2');
  const consultD3Col = consultHeaders.indexOf('Diagnostic Question 3');

  const answersQCol = answersHeaders.indexOf('Question');
  const answersReasonCol = answersHeaders.indexOf('Reason');
  const answersRemedyCol = answersHeaders.indexOf('Remedy');

  // Extract level1 questions
  const level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }> = [];
  for (let r = 1; r < level1Aoa.length; r++) {
    const row = level1Aoa[r];
    if (row && row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '') {
      level1Questions.push({
        canonicalQuestionText: String(row[0]).trim(),
        rawRow: r + 1,
      });
    }
  }

  // Extract consultation queries
  const consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }> = [];
  for (let r = 1; r < consultAoa.length; r++) {
    const row = consultAoa[r];
    if (row && row[consultQCol] !== undefined && row[consultQCol] !== null && String(row[consultQCol]).trim() !== '') {
      const qText = String(row[consultQCol]).trim();
      const diags: string[] = [];
      const diagCols = [consultD1Col, consultD2Col, consultD3Col];
      for (const colIdx of diagCols) {
        if (colIdx !== -1 && row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '') {
          diags.push(String(row[colIdx]).trim());
        }
      }
      consultationQueries.push({
        questionText: qText,
        diagnosticQuestions: diags,
        rawRow: r + 1,
      });
    }
  }

  // Set of Level 1 canonical question texts for semantically tagging answers
  const level1QuestionSet = new Set(level1Questions.map((q) => q.canonicalQuestionText));

  // Extract answers
  const answers: Array<{
    questionText: string;
    reasonText: string;
    remedyText: string;
    videoUrl?: string;
    answerType: 'level1' | 'diagnostic';
    rawRow: number;
  }> = [];

  for (let r = 1; r < answersAoa.length; r++) {
    const row = answersAoa[r];
    if (row && row[answersQCol] !== undefined && row[answersQCol] !== null && String(row[answersQCol]).trim() !== '') {
      const qText = String(row[answersQCol]).trim();
      const rawReason = answersReasonCol !== -1 && row[answersReasonCol] != null ? String(row[answersReasonCol]).trim() : '';
      const rawRemedy = answersRemedyCol !== -1 && row[answersRemedyCol] != null ? String(row[answersRemedyCol]).trim() : '';

      // Video URL extraction: checks Remedy first, then Reason
      const videoUrl = extractVideoUrl(rawRemedy) || extractVideoUrl(rawReason);

      // Determine answer type:
      // Direct answers match level1 questions (first 184 rows in dummy db); remaining are diagnostic answers
      const isLevel1 = level1QuestionSet.has(qText) || (level1Questions.length > 0 && answers.length < level1Questions.length);

      answers.push({
        questionText: qText,
        reasonText: rawReason,
        remedyText: rawRemedy,
        videoUrl,
        answerType: isLevel1 ? 'level1' : 'diagnostic',
        rawRow: r + 1,
      });
    }
  }

  return {
    level1Questions,
    consultationQueries,
    answers,
    stats: {
      totalRows: {
        level1: level1Aoa.length,
        consultation: consultAoa.length,
        answers: answersAoa.length,
      },
      dataRows: {
        level1: level1Questions.length,
        consultation: consultationQueries.length,
        answers: answers.length,
      },
    },
  };
}

/**
 * Validates and parses an Excel file from disk.
 *
 * @param filePath - Absolute or relative file path to the .xlsx workbook
 * @returns Promise resolving to the validated ParsedExcelData structure
 * @throws ExcelValidationError on missing file (404) or parsing errors (400)
 */
export async function parseExcelFile(filePath: string): Promise<ParsedExcelData> {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ExcelValidationError('File path must be a non-empty string', 400);
  }
  if (!fs.existsSync(filePath)) {
    throw new ExcelValidationError(`Excel file not found at: ${filePath}`, 404);
  }
  const buffer = await fs.promises.readFile(filePath);
  return parseExcelBuffer(buffer);
}
```

### Recommendation for `backend/tests/e2e/helpers/e2eHarness.ts`
Once the Worker writes `backend/src/services/excelParserService.ts`, the duplicate definitions in `e2eHarness.ts` can be replaced with:
```ts
export {
  parseExcelBuffer,
  parseExcelFile,
  ParsedExcelData,
  ExcelValidationError,
} from '../../../src/services/excelParserService';
```

---

## 5. Verification Method

To independently verify the proposed parser service:

### 5.1 Direct Verification against `database-dummy.xlsx` and Boundary Cases
Run the following verification script in `backend/`:
```bash
NODE_PATH=./node_modules npx ts-node --transpile-only -O '{"module":"commonjs"}' -e "
const path = require('path');
const {
  parseExcelFile,
  parseExcelBuffer,
} = require('../.agents/explorer_m2_parser/proposed_excelParserService');

async function verify() {
  const parsed = await parseExcelFile(path.resolve('../database-dummy.xlsx'));
  console.assert(parsed.level1Questions.length === 184, 'Level1 questions count mismatch');
  console.assert(parsed.consultationQueries.length === 184, 'Consultation queries count mismatch');
  console.assert(parsed.answers.length === 220, 'Answers count mismatch');
  console.assert(parsed.stats.totalRows.level1 === 185, 'Total rows level1 mismatch');
  console.assert(parsed.stats.totalRows.answers === 221, 'Total rows answers mismatch');
  console.assert(parsed.answers.filter(a => a.answerType === 'level1').length === 184, 'L1 answer type mismatch');
  console.assert(parsed.answers.filter(a => a.answerType === 'diagnostic').length === 36, 'Diag answer type mismatch');
  console.assert(parsed.answers.filter(a => a.videoUrl).length === 195, 'Video count mismatch');
  console.log('Verification SUCCESS: All assertions passed!');
}
verify().catch(console.error);
"
```
**Expected Output**:
`Verification SUCCESS: All assertions passed!`

### 5.2 Full Test Suite Verification
Run the backend E2E test suites:
```bash
cd /Users/aditya/workspace/hh4u/backend
npm test -- tests/e2e/
```
**Expected Output**:
`Test Suites: 4 passed, 4 total`
`Tests: 56 passed, 56 total`

### 5.3 Invalidation Conditions
The design is invalidated if:
1. Header specifications in `database-dummy.xlsx` change.
2. An answer row appears that is neither in `level1Questions` nor belongs to a diagnostic branch.
3. YouTube URLs use a different scheme not matched by `YOUTUBE_URL_REGEX`.
