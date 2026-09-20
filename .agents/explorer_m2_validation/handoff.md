# Milestone M2 Explorer 2 Handoff Report: Excel Validation & Error Handling

**Agent**: `explorer_m2_validation` (Milestone M2 Explorer 2)  
**Working Directory**: `/Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/`  
**Timestamp**: 2026-09-19T02:50:00Z  
**Target Files**:
- `/Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/proposed_excelParserService.ts`
- `/Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/proposed_excelParser.test.ts`
- Target implementation paths:
  - `backend/src/services/excelParserService.ts`
  - `backend/tests/excelParser.test.ts`

---

## 1. Observation

### 1.1 Requirements & Interface Contracts
- **`ORIGINAL_REQUEST.md` (lines 100–142)**:
  - Line 114–116: *"Build a parser that reads .xlsx files matching the structure of database-dummy.xlsx (3 sheets: level1, ConsultationQueries, Answers), validates the data, and upserts it into the MongoDB Atlas collections."*
  - Line 130–133: Acceptance criteria:
    - *"A programmatic test parses database-dummy.xlsx and verifies that 185 level1 questions, 185 consultation query sets, and 221 answers are extracted."*
    - *"The parser rejects a malformed file (missing required columns) with a clear error message instead of silently failing."*
- **`PROJECT.md` (lines 62–75)**:
  - Interface Contract:
    ```ts
    parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelData>
    parseExcelFile(filePath: string): Promise<ParsedExcelData>

    interface ParsedExcelData {
      level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }>;
      consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }>;
      answers: Array<{ questionText: string; reasonText: string; remedyText: string; videoUrl?: string; answerType: 'level1' | 'diagnostic'; rawRow: number }>;
      stats: { totalRows: { level1: number; consultation: number; answers: number }; dataRows: { level1: number; consultation: number; answers: number } };
    }
    ```
  - Error format: Throws `ExcelValidationError` with `statusCode: 400`, `message: string`, `details?: string[]`.
- **`backend/package.json`**:
  - `xlsx: ^0.18.5` is installed and ready in `dependencies`.

### 1.2 Ground Truth Dataset Inspection (`database-dummy.xlsx`)
Direct node/xlsx execution against `/Users/aditya/workspace/hh4u/database-dummy.xlsx`:
- File size: `53,008` bytes.
- Magic bytes: `0x50, 0x4B` (`'PK'`).
- Sheet names: `['level1', 'ConsultationQueries', 'Answers']`.
- Row and column metrics:
  - `level1`: 185 total rows (Row 1 header: `['Questions']`, Rows 2–185: 184 question strings).
  - `ConsultationQueries`: 185 total rows (Row 1 header: `['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3']`, Rows 2–185: 184 question sets with 3 diagnostic questions each).
  - `Answers`: 221 total rows (Row 1 header: `['Question', 'Reason', 'Remedy']`, Rows 2–221: 220 answer items; rows 2–185 match Level 1 questions, rows 186–221 match the 36 unique diagnostic questions).
  - YouTube video URLs: Exactly 195 of the 220 answers contain embedded `youtu.be` links.

### 1.3 Existing E2E Boundary Test Suite
Inspection of `/Users/aditya/workspace/hh4u/backend/tests/e2e/tier2_boundary_corner.test.ts` (lines 30–120) revealed the exact assertions and regex expectations tested across the application:
```ts
Test 2.1: Empty buffer (0 bytes) -> rejects.toThrow(ExcelValidationError) with { statusCode: 400 }
Test 2.2: Corrupted non-zip binary -> message matching /corrupted|invalid/i, statusCode: 400
Test 2.3: Non-xlsx text file -> throws ExcelValidationError, statusCode: 400
Test 2.4: Missing required sheet 'level1' -> message matching /missing required sheet.*level1/i, statusCode: 400
Test 2.5: Missing required sheet 'ConsultationQueries' -> message matching /missing required sheet.*ConsultationQueries/i, statusCode: 400
Test 2.6: Missing required sheet 'Answers' -> message matching /missing required sheet.*Answers/i, statusCode: 400
Test 2.7: Sheet 'level1' missing column header 'Questions' -> message matching /missing required header.*Questions/i, statusCode: 400
Test 2.8: Sheet 'ConsultationQueries' missing diagnostic header -> message matching /missing required header/i, statusCode: 400
Test 2.9: Sheet 'Answers' missing 'Remedy' header -> message matching /missing required header/i, statusCode: 400
Test 2.10: String fields with whitespace and trailing newlines trimmed cleanly
```
Executing `npm test -- tests/e2e/tier2_boundary_corner.test.ts` passed 25 of 25 tests in 2.668 seconds.

---

## 2. Logic Chain

1. **Error Classification & Architecture**:
   - `ExcelValidationError` must extend JavaScript `Error` with `statusCode: number` (default `400`).
   - For file system operations, missing file paths should trigger `statusCode: 404` to distinguish not-found errors from client syntax errors.
   - Using `Object.setPrototypeOf(this, new.target.prototype)` ensures that `instanceof ExcelValidationError` and `instanceof Error` hold true even when transpiled to CommonJS or run inside Jest VM modules.
   - Implementing `toJSON()` ensures clean serialization when formatted as JSON responses in Express middleware.

2. **Validation Pipeline Sequence**:
   To guarantee fail-fast behavior with minimal overhead, validations must execute in strict chronological order:
   - **Step 1: Input Type & Length Check**: Detect `null`, `undefined`, non-buffer objects, or `buffer.length === 0`. Throw `ExcelValidationError('Empty file buffer provided', 400)`.
   - **Step 2: Binary Signature (Magic Byte) Check**: XLSX files are PKZip archives. If `buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B`, reject with `'Corrupted or invalid Excel file format: missing ZIP header'` (status 400). This immediately traps CSVs, plain text, PNG, PDF, and corrupt binary fragments.
   - **Step 3: ZIP Integrity Trapping**: Wrap `XLSX.read(buffer, { type: 'buffer' })` in a `try/catch` block. If internal ZIP parsing fails due to truncation or corruption, catch the error and rethrow as `ExcelValidationError('Corrupted or invalid Excel file format: ...', 400)`.
   - **Step 4: Mandatory Sheets Verification**: Verify presence of `'level1'`, `'ConsultationQueries'`, and `'Answers'`. Implement case-insensitive comparison (`s.trim().toLowerCase() === target.toLowerCase()`) so user variations like `'Level1'` or `'answers'` are accommodated while missing sheets throw `Missing required sheet: <SheetName>` with status 400. Safely ignore extra sheets (e.g. `'Metadata'`, `'Sheet1'`).
   - **Step 5: Column Header Verification**: For each worksheet, extract the first row as an Array of Arrays (AoA) and clean/trim each header string:
     - `level1`: must contain `'Questions'`. Throw `Sheet 'level1' missing required header: 'Questions'`.
     - `ConsultationQueries`: must contain `'Questions'`, `'Diagnostic Question 1'`, `'Diagnostic Question 2'`, `'Diagnostic Question 3'`. Throw `Sheet 'ConsultationQueries' missing required header: '<Header>'`.
     - `Answers`: must contain `'Question'`, `'Reason'`, `'Remedy'`. Note the singular `'Question'`. Throw `Sheet 'Answers' missing required header: '<Header>'`.
   - **Step 6: Dynamic Column Resolution**: Rather than hardcoding column indices (0, 1, 2, 3), lookup indices via `headers.indexOf(headerName)`. This makes the parser tolerant to shifted column orders (e.g. Remedy before Reason).

3. **Data Sanitization & Extraction Logic**:
   - Discard blank/ghost rows where the primary question column is empty or whitespace-only.
   - Coerce non-string cell values (numbers, booleans) with `String(val).trim()`.
   - Strip leading/trailing whitespace and trailing `\n\n` or `\r\n`.
   - Extract YouTube URLs via `YOUTUBE_URL_REGEX`, prioritizing `remedyText` then `reasonText`.
   - Classify answers: First `level1Questions.length` rows (or matching Level 1 question text) receive `answerType: 'level1'`; subsequent rows receive `answerType: 'diagnostic'`.
   - Compute `stats`: `totalRows` equals sheet AoA length; `dataRows` equals non-empty extracted data objects.

4. **Unit Test Suite Design (`backend/tests/excelParser.test.ts`)**:
   - Self-contained unit tests using in-memory `.xlsx` buffers generated via `xlsx.utils.aoa_to_sheet`.
   - 36 distinct test cases organized across 10 boundary categories:
     1. Buffer input boundaries (null, undefined, 0-byte, non-buffer).
     2. Binary format & magic byte boundaries (short buffer, text, CSV, PDF, PNG, corrupt zip).
     3. File path boundaries (empty, non-string, 404 non-existent file).
     4. Sheet existence boundaries (missing level1, missing ConsultationQueries, missing Answers, 0 sheets, case variations, extra sheets).
     5. Column header boundaries (missing each header, whitespace trimming, column re-ordering).
     6. Row sanitization & boundary data (trailing newlines, ghost rows, non-string coercion, partial diagnostics, empty remedy/reason, 8000+ char strings).
     7. Media extraction (youtu.be, youtube.com, priority, no URL, query params).
     8. Answer classification (level1 vs diagnostic).
     9. Error class architecture (inheritance, status codes, details, toJSON).
     10. Real dataset verification (`database-dummy.xlsx` extracting 184 L1, 184 consult, 220 answers, 195 videos).

---

## 3. Caveats

1. **Row Count Nomenclature in PRD vs Physical Excel**:
   `ORIGINAL_REQUEST.md` refers to 185 Level 1 questions and 221 Answers. Physical verification proves row 1 is the column header. Thus there are **184 data questions** and **220 data answers**. Our parser interface resolves this by returning both:
   - `stats.totalRows`: `{ level1: 185, consultation: 185, answers: 221 }`
   - `stats.dataRows`: `{ level1: 184, consultation: 184, answers: 220 }`
2. **Plural vs Singular Header Name**:
   `level1` and `ConsultationQueries` use `'Questions'` (plural), whereas `Answers` uses `'Question'` (singular). The parser strictly validates this difference and rejects files where `Answers` has `'Questions'` with HTTP 400.
3. **Dynamic vs Hardcoded Column Indices**:
   The parser uses dynamic `indexOf()` lookups on row 1 headers. This guarantees resilience if clinic staff rearranges column order in Excel.

---

## 4. Conclusion

1. **Production Parser Specification**:
   The proposed service implementation has been written to:
   `/Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/proposed_excelParserService.ts`
   It is fully typed, conforms to `PROJECT.md` contracts, passes strict magic byte and schema validations, and extracts all 184 questions, 184 consultation queries, and 220 answers with 195 YouTube video links.
2. **Production Test Specification**:
   The proposed test suite has been written to:
   `/Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/proposed_excelParser.test.ts`
   It contains 36 exhaustive unit tests verifying all edge cases and boundary conditions.
3. **Worker Implementation Plan**:
   - The Worker can copy `proposed_excelParserService.ts` to `backend/src/services/excelParserService.ts`.
   - The Worker can copy `proposed_excelParser.test.ts` to `backend/tests/excelParser.test.ts`.
   - Add `"test:unit": "jest tests/excelParser.test.ts"` or run with `npm test -- tests/excelParser.test.ts`.

---

## 5. Verification Method

To independently verify the proposed parser and test suite:

```bash
# 1. Inspect proposed implementation files
cat /Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/proposed_excelParserService.ts
cat /Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/proposed_excelParser.test.ts

# 2. Execute verification script in backend directory
cd /Users/aditya/workspace/hh4u/backend
NODE_PATH=./node_modules npx ts-node -T -e "
import { parseExcelFile, parseExcelBuffer } from '../.agents/explorer_m2_validation/proposed_excelParserService';
(async () => {
  const data = await parseExcelFile('../database-dummy.xlsx');
  console.log('L1 Questions:', data.level1Questions.length);
  console.log('Consultations:', data.consultationQueries.length);
  console.log('Answers:', data.answers.length);
  console.log('Stats:', data.stats);
  console.log('Sample Video:', data.answers[0].videoUrl);
})();
"

# Expected Output:
# L1 Questions: 184
# Consultations: 184
# Answers: 220
# Stats: { totalRows: { level1: 185, consultation: 185, answers: 221 }, dataRows: { level1: 184, consultation: 184, answers: 220 } }
# Sample Video: https://youtu.be/L_F8VeK8VPQ?si=eEQ7kT9d7s2Wv5G_

# 3. Verify existing boundary test suite remains 100% green
npm test -- tests/e2e/tier2_boundary_corner.test.ts
# Expected: 25 passed, 25 total
```

Invalidation conditions:
- Any failure in `tier2_boundary_corner.test.ts`.
- Any missing required sheet or header failing to throw `ExcelValidationError` with `statusCode === 400`.
- Missing or malformed YouTube regex extraction.
