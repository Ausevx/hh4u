# Excel Knowledge Base Specification & Schema Discovery Report

**File Path**: `/Users/aditya/workspace/hh4u/.agents/spec_miner_survey_excel/handoff.md`  
**Target File**: `/Users/aditya/workspace/hh4u/database-dummy.xlsx`  
**Reference Specification**: `/Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md` (lines 100–142)  
**Timestamp**: 2026-09-19T02:18:00Z  

---

## 1. Observation

Direct inspection of `/Users/aditya/workspace/hh4u/database-dummy.xlsx` using Python `openpyxl` revealed the following exact metrics, structures, and contents:

### 1.1 Workbook Overview & Dimensions
- **File path**: `/Users/aditya/workspace/hh4u/database-dummy.xlsx` (File size: 53,008 bytes)
- **Sheets present**: Exactly 3 sheets: `['level1', 'ConsultationQueries', 'Answers']`
- **Sheet state**: All sheets are visible; no hidden sheets, rows, or defined names.

| Sheet Name | Max Row (`ws.max_row`) | Max Column (`ws.max_column`) | Header Row (Row 1) | Data Rows (Rows 2..max) | Blank Data Rows |
|---|---|---|---|---|---|
| `level1` | 185 | 1 | `['Questions']` | 184 | 0 |
| `ConsultationQueries` | 185 | 4 | `['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3']` | 184 | 0 |
| `Answers` | 221 | 3 | `['Question', 'Reason', 'Remedy']` | 220 | 0 |

> **Critical Note on Row Counts**:
> In `ORIGINAL_REQUEST.md` (lines 103–105, 126, 131), the specifications refer to:
> - `level1` (185 rows)
> - `ConsultationQueries` (185 rows)
> - `Answers` (221 rows)
> Physical Excel inspection confirms that row 1 is the column header in every sheet. Therefore, the workbook contains:
> - **184 unique Level 1 Questions** (Rows 2–185)
> - **184 Consultation Query Sets** (Rows 2–185)
> - **220 Answers** (Rows 2–221)
> Row index 185 is the last row of `level1` and `ConsultationQueries`. Row index 221 is the last row of `Answers`. The numbers 185 and 221 in the PRD correspond to the 1-indexed Excel row coordinate (`max_row`).

### 1.2 Column Statistics & Data Quality

#### Sheet: `level1`
- **Header**: `['Questions']` (exact case, no extra whitespace)
- **Data Rows**: 184
- **Null Values**: 0
- **Data Type**: All values are `str`
- **Length**: Min = 27 characters, Max = 79 characters, Mean = 45.9 characters
- **Punctuation**: 100% of questions (184/184) end with `'?'`
- **Uniqueness**: 184 distinct questions (0 duplicates)
- **First record (Row 2)**: `"Are antibiotics safe for children?"`
- **Last record (Row 185)**: `"Why is my child's cough not going away?"`

#### Sheet: `ConsultationQueries`
- **Header**: `['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3']`
- **Data Rows**: 184
- **Null Values**: 0 across all 4 columns (736 cells populated)
- **Data Type**: All values are `str`
- **Column 1 (`Questions`)**:
  - Exactly matches `level1.Questions` row-for-row in identical order (184/184 match).
- **Column 2 (`Diagnostic Question 1`)**: Lengths: Min = 53, Max = 93, Mean = 83.7 chars.
- **Column 3 (`Diagnostic Question 2`)**: Lengths: Min = 59, Max = 91, Mean = 82.1 chars.
- **Column 4 (`Diagnostic Question 3`)**: Lengths: Min = 48, Max = 104, Mean = 91.8 chars.
- **Punctuation**: 100% of diagnostic questions end with `'?'`.

#### Sheet: `Answers`
- **Header**: `['Question', 'Reason', 'Remedy']` (Note singular `'Question'` instead of `'Questions'`)
- **Data Rows**: 220
- **Null Values**: 0 across all 3 columns (660 cells populated)
- **Data Type**: All values are `str`
- **Column 1 (`Question`)**:
  - Rows 2–185 (184 rows): Exactly match the 184 Level 1 questions in the exact same sequence.
  - Rows 186–221 (36 rows): Contain the 36 distinct Diagnostic Questions from `ConsultationQueries`, sorted alphabetically.
- **Column 2 (`Reason`)**:
  - Lengths: Min = 98, Max = 311, Mean = 199.5 chars.
  - Contains medical rationale, pathology, and Ayurvedic dosha explanations (e.g. Vata, Pitta, Kapha, Agni, Meda Dhatu).
  - 120 of 220 rows contain embedded YouTube video links (`https://youtu.be/...`).
- **Column 3 (`Remedy`)**:
  - Lengths: Min = 128, Max = 280, Mean = 196.4 chars.
  - Contains lifestyle advice, diet, herbal remedies (e.g., Haridra/turmeric in milk, ginger tea, triphala), and pranayama practices.
  - 152 of 220 rows contain embedded YouTube video links (`https://youtu.be/...`).
- **Formatting**: Every cell in `Reason` and `Remedy` concludes with `\n\n` before the optional video URL or at cell termination.

### 1.3 URL & Video Link Distribution in `Answers`
- **Both Reason & Remedy contain URLs**: 77 rows
- **Only Reason contains URLs**: 43 rows
- **Only Remedy contains URLs**: 75 rows
- **Neither Reason nor Remedy contains URLs**: 25 rows
- **Total URL instances**: 272 URLs
- **Domains**: 100% `youtu.be` (`https://youtu.be/<VIDEO_ID>?si=...`)
- **Unique Video IDs**: Exactly 7 unique videos are shared across all 272 references:
  1. `IUy9hg8iT3Q` (109 occurrences)
  2. `L_F8VeK8VPQ` (58 occurrences)
  3. `Be9GyqxlvhM` (38 occurrences)
  4. `jbYbeU9TG80` (37 occurrences)
  5. `a5MQWTSoa6A` (14 occurrences)
  6. `_RRc9OC7ToY` (11 occurrences)
  7. `C44dcWQmARY` (5 occurrences)

---

## 2. Logic Chain

### 2.1 Resolution of the 185 / 221 Row Count Discrepancy
1. **Observation**: Excel worksheets index rows starting at 1. Row 1 contains column titles (`Questions`, `Diagnostic Question 1`, etc.).
2. **Observation**: Python `openpyxl` reports `sheet.max_row = 185` for `level1` and `ConsultationQueries`, and `sheet.max_row = 221` for `Answers`.
3. **Deduction**: The data records are located on rows 2 through 185 (184 data records) and rows 2 through 221 (220 data records).
4. **Impact on Verification & Seed Scripts**: A parser counting extracted business objects will yield:
   - `level1_questions`: 184 items
   - `consultation_queries`: 184 items
   - `answers`: 220 items
   To satisfy tests checking for `185` and `221`, the test or parser documentation must specify whether the assertion checks `rows.length === 184` (data rows) or `sheet.rowCount === 185` (including header).

### 2.2 Relational Architecture Between Sheets
1. **Observation**: Comparing `level1.Questions` (184 items) with `ConsultationQueries.Questions` (184 items) shows 100% exact character equality in the identical row sequence.
2. **Observation**: `ConsultationQueries` has 184 rows * 3 diagnostic questions = 552 diagnostic question cells.
3. **Observation**: Across all 552 cells, there are exactly 36 unique question strings grouped into 12 clinical domain triplets:
   - Generic/Pediatric/Systemic: 98 questions
   - Breathing/Cough/Asthma: 14 questions
   - Respiratory/Infection/Fever: 12 questions
   - Diabetes/Blood Sugar: 11 questions
   - Thyroid/Metabolism/Weight: 10 questions
   - Joint/Musculoskeletal Pain: 10 questions
   - Blood Pressure/Hypertension: 9 questions
   - Chronic Fatigue/Anaemia: 8 questions
   - Headache/Migraine: 4 questions
   - Acid Reflux/GERD: 3 questions
   - Abdominal Pain/Bowel: 3 questions
   - Dizziness/Vertigo: 2 questions
   - *Sum*: 98 + 14 + 12 + 11 + 10 + 10 + 9 + 8 + 4 + 3 + 3 + 2 = 184 questions.
4. **Observation**: `Answers` contains 220 rows.
   - Rows 2–185 correspond 1:1 to the 184 Level 1 questions.
   - Rows 186–221 correspond 1:1 to the 36 unique diagnostic questions (alphabetically ordered).
   - 184 + 36 = 220.
5. **Deduction**: The `Answers` sheet is a unified answers repository providing:
   - Primary direct answers to all Level 1 questions.
   - Specific modular answers for each diagnostic question branch in the consultation flow.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Excel Parser | Workbook Structure Ingestion | Parser loads `.xlsx` buffer/file and validates existence of 3 mandatory sheets (`level1`, `ConsultationQueries`, `Answers`). | Binary `.xlsx` file buffer | In-memory sheet representations | Throws 400 with missing sheet name if any required sheet is absent. | `database-dummy.xlsx` & `ORIGINAL_REQUEST.md` |
| 2 | Excel Parser | Column Header Validation | Validates required column headers on row 1 for each sheet (`Questions` for `level1`; `Questions`, `Diagnostic Question 1..3` for `ConsultationQueries`; `Question`, `Reason`, `Remedy` for `Answers`). | Sheet header row | Column index map | Throws 400 indicating missing column names and expected headers. | `database-dummy.xlsx` sheet headers |
| 3 | Excel Parser | Row Trimming & Blank Stripping | Strips leading/trailing whitespace, discards completely empty rows, and handles Excel ghost rows beyond data boundary. | Sheet rows | Cleaned string tuples | Skips trailing empty rows; rejects rows with empty primary question keys. | `openpyxl` inspection |
| 4 | Data Extraction | Video URL Extraction | Extracts embedded YouTube links (`https://youtu.be/...`) from `Reason` and `Remedy` cells into a standalone `videoUrl` field. | Cell string with optional URL | Cleaned text + `videoUrl` string | If no URL present, `videoUrl` is set to `null`/`undefined`. | Pattern analysis on `Answers` sheet |
| 5 | Cross-Sheet Linking | Level1-to-Consultation Foreign Key Linking | Matches `ConsultationQueries.Questions` to `Level1Question` documents by canonical text to establish `level1QuestionId`. | `canonicalQuestionText` | Linked `ConsultationQuery` record | Reports unlinked questions if consultation questions don't match level1. | Referential analysis |
| 6 | Cross-Sheet Linking | Level1-to-Answer Foreign Key Linking | Matches rows 2–185 of `Answers.Question` to `Level1Question` documents to establish primary answer records. | `Question` text | Linked primary `Answer` record | Flags missing answer records for Level 1 questions. | Referential analysis |
| 7 | Cross-Sheet Linking | Diagnostic Answer Branch Resolution | Maps rows 186–221 of `Answers.Question` to the 36 unique diagnostic questions, allowing consultation branches to reference resolved answer IDs. | Diagnostic question text | Linked branch `Answer` record | Falls back to default Level 1 answer if diagnostic answer is missing. | Triplet & cluster analysis |
| 8 | Database Seeding | Idempotent Bulk Upsert | Upserts records into MongoDB collections (`level1questions`, `consultationqueries`, `answers`) without generating duplicate entries on re-run. | Parsed question, consultation, and answer datasets | Upsert summary (inserted, updated counts) | Rolls back or aborts on partial validation failure before database mutation. | `ORIGINAL_REQUEST.md` R2 & acceptance criteria |
| 9 | Vector Search | Question Embedding Generation | Generates 1536-dimensional vector embeddings for all 184 Level 1 questions upon ingestion for Atlas Vector Search. | `canonicalQuestionText` | Vector array `number[1536]` | Uses active EmbeddingService (or mock embedding in test mode). | `Level1Question.ts` & R1 requirements |
| 10 | Admin Portal | Bulk File Upload Endpoint | REST endpoint `POST /api/admin/knowledge-base/upload` supporting `multipart/form-data` file upload for admin users. | `file` (`.xlsx`), JWT Admin token | `{ success: true, counts: { questions: 184, consultations: 184, answers: 220 } }` | Returns 401 if unauthenticated; 400 for malformed files. | `ORIGINAL_REQUEST.md` R2, R4 |

---

## 4. Edge Cases

| # | Feature | Input | Observed / Required Behavior |
|---|---------|-------|-------------------------------|
| 1 | File Upload | Non-xlsx file (e.g. `.csv`, `.pdf`, `.txt`, `.png`) | Parser rejects immediately with 400 Bad Request: `"Invalid file type. Please upload a valid .xlsx file."` |
| 2 | File Upload | Corrupted or 0-byte `.xlsx` file | Parser library throws ZIP/format error; handler catches and returns 400: `"Corrupted or unreadable Excel file."` |
| 3 | Sheet Ingestion | Missing one of the 3 required sheets (e.g. `Answers` missing) | Returns 400 Bad Request: `"Missing required sheet: 'Answers'. Expected sheets: level1, ConsultationQueries, Answers."` |
| 4 | Sheet Ingestion | Extra sheets present (e.g. `Sheet1`, `Metadata`) | Parser processes only the 3 canonical sheets and safely ignores extra sheets without throwing errors. |
| 5 | Sheet Ingestion | Sheet name casing variation (e.g. `Level1` or `answers`) | Parser performs case-insensitive sheet name matching (`sheet.trim().toLowerCase()`) to ensure robustness. |
| 6 | Header Validation | Missing required column (e.g. `Diagnostic Question 3` missing) | Returns 400 Bad Request: `"Sheet 'ConsultationQueries' is missing required column: 'Diagnostic Question 3'."` |
| 7 | Header Validation | Singular vs Plural mismatch (`Question` vs `Questions`) | Handled cleanly: `level1` expects `Questions`, `ConsultationQueries` expects `Questions`, `Answers` expects `Question`. |
| 8 | Row Ingestion | Empty or whitespace-only cells in `Questions` | Row is rejected with validation error: `"Row <X> in sheet '<Sheet>' has an empty question text."` |
| 9 | Row Ingestion | Non-string data in question cell (e.g. numeric `12345` or Date) | Parser coerces cell value using `String(cell.value).trim()` if convertible, or flags type error. |
| 10 | Content Formatting | Cells with trailing newlines (`\n\n`) | Parser trims trailing whitespace and newlines before storing into MongoDB document fields. |
| 11 | URL Parsing | URLs in `Reason` vs `Remedy` vs both | Parser checks both columns for `https?://[^\s]+`. Extracts first valid URL as `videoUrl` and strips the URL string from the text body to keep content clean. |
| 12 | URL Parsing | Video URL format variation (`youtu.be/ID` vs `youtube.com/watch?v=ID`) | Regular expression extracts video ID independently of URL query parameters (e.g. `?si=...`). |
| 13 | Referential Integrity | Question in `ConsultationQueries` not present in `level1` | Upload pre-validation reports referential discrepancy: `"Consultation query on row <X> does not match any Level 1 question."` |
| 14 | Referential Integrity | Duplicate questions within the same sheet | Upsert logic uses question text as unique natural key; updates the existing document rather than creating duplicates. |
| 15 | Diagnostic Linking | Answer row 186–221 has no Level 1 question | Answer schema must allow `level1QuestionId` to be optional or store `questionText` / `answerType: 'diagnostic'` to avoid Mongoose validation failure. |

---

## 5. Data Mapping: Excel to MongoDB Document Schemas

### 5.1 `Level1Question` Document Mapping
Source: Sheet `level1` (Rows 2..185)  
Target Collection: `level1questions`

| Excel Source | MongoDB Field | Type | Transformation / Default | Sample Value |
|---|---|---|---|---|
| N/A | `_id` | `ObjectId` | Auto-generated by MongoDB | `ObjectId("66ea01...")` |
| `Questions` | `canonicalQuestionText` | `String` | `cell.value.trim()` (required, indexed) | `"Are antibiotics safe for children?"` |
| Derived | `embedding` | `[Number]` | Generated 1536-dim vector via active embedding service | `[0.012, -0.045, ...]` (1536 floats) |
| Derived | `tags` | `[String]` | Extracted domain keywords or cluster name | `["pediatrics", "antibiotics"]` |
| Default | `isActive` | `Boolean` | `true` | `true` |
| Default | `version` | `Number` | `1` | `1` |
| System | `createdAt` | `Date` | Timestamp | `2026-09-19T02:10:00Z` |
| System | `updatedAt` | `Date` | Timestamp | `2026-09-19T02:10:00Z` |

### 5.2 `ConsultationQuery` Document Mapping
Source: Sheet `ConsultationQueries` (Rows 2..185)  
Target Collection: `consultationqueries`

| Excel Source | MongoDB Field | Type | Transformation / Default | Sample Value |
|---|---|---|---|---|
| N/A | `_id` | `ObjectId` | Auto-generated by MongoDB | `ObjectId("66ea02...")` |
| `Questions` | `level1QuestionId` | `ObjectId` | Look up `Level1Question` where `canonicalQuestionText == Questions.trim()` | `ObjectId("66ea01...")` |
| `Diagnostic Question 1` | `diagnosticQuestions[0]` | `Object` | `{ id: 'q1', questionText: cell.value.trim() }` | `{ id: "q1", questionText: "Have you been experiencing the problem described in your question repeatedly or persistently?" }` |
| `Diagnostic Question 2` | `diagnosticQuestions[1]` | `Object` | `{ id: 'q2', questionText: cell.value.trim() }` | `{ id: "q2", questionText: "Does anything specific make the problem described in your question worse or trigger it?" }` |
| `Diagnostic Question 3` | `diagnosticQuestions[2]` | `Object` | `{ id: 'q3', questionText: cell.value.trim() }` | `{ id: "q3", questionText: "Do you have any other significant symptoms occurring along with the problem described in your question?" }` |
| Derived | `answerBranches` | `[Object]` | Generated branches with conditions mapping to primary or diagnostic answer IDs | `[{ conditions: { q1: 'yes', q2: 'yes', q3: 'yes' }, resolvedAnswerId: ObjectId("...") }]` |
| System | `updatedAt` | `Date` | Timestamp | `2026-09-19T02:10:00Z` |

### 5.3 `Answer` Document Mapping
Source: Sheet `Answers` (Rows 2..221)  
Target Collection: `answers`

#### Direct Level 1 Answers (Rows 2..185):
| Excel Source | MongoDB Field | Type | Transformation / Default | Sample Value |
|---|---|---|---|---|
| N/A | `_id` | `ObjectId` | Auto-generated by MongoDB | `ObjectId("66ea03...")` |
| `Question` | `level1QuestionId` | `ObjectId` | Look up `Level1Question` where `canonicalQuestionText == Question.trim()` | `ObjectId("66ea01...")` |
| `Question` | `questionText` | `String` | `cell.value.trim()` | `"Are antibiotics safe for children?"` |
| `Reason` + `Remedy` | `answerText` | `String` | Combined cleaned `Reason` and `Remedy` (URLs stripped) | `"The available information does not detail antibiotic safety profiles... Use synthetic antibiotics only..."` |
| Derived | `dosageInstructions` | `String` | Extracted dosage advice (or optional/undefined) | `"Consult pediatrician before administering."` |
| `Remedy` | `homeRemedyText` | `String` | Cleaned `Remedy` text (URLs stripped) | `"For a safe, natural, whole-plant antibacterial alternative, offer your child daily turmeric (Haridra) boiled in milk."` |
| `Reason` / `Remedy` | `videoUrl` | `String` | Regex extracted `https://youtu.be/...` link | `"https://youtu.be/L_F8VeK8VPQ?si=eEQ7kT9d7s2Wv5G_"` |
| Derived | `answerType` | `String` | `'level1'` | `'level1'` |
| System | `updatedAt` | `Date` | Timestamp | `2026-09-19T02:10:00Z` |

#### Diagnostic Question Answers (Rows 186..221):
| Excel Source | MongoDB Field | Type | Transformation / Default | Sample Value |
|---|---|---|---|---|
| N/A | `_id` | `ObjectId` | Auto-generated by MongoDB | `ObjectId("66ea04...")` |
| Derived | `level1QuestionId` | `ObjectId` (optional) | Optional/null, or linked to first Level 1 question in domain cluster | `null` |
| `Question` | `questionText` | `String` | `cell.value.trim()` (the diagnostic question text) | `"Are you currently taking any medicine or supplement that may affect your blood pressure?"` |
| `Reason` + `Remedy` | `answerText` | `String` | Combined cleaned `Reason` and `Remedy` | `"Modern BP drugs like Amlodipine mask or alter your current state of dosha imbalance (Vikruti)..."` |
| `Remedy` | `homeRemedyText` | `String` | Cleaned `Remedy` text | `"Undergo a clinical Nadi Pariksha (pulse reading). Concurrently use whole turmeric boiled in milk daily."` |
| `Reason` / `Remedy` | `videoUrl` | `String` | Regex extracted `https://youtu.be/...` link | `"https://youtu.be/IUy9hg8iT3Q?si=vCbFRH1mhn8rNv2c"` |
| Derived | `answerType` | `String` | `'diagnostic'` | `'diagnostic'` |
| System | `updatedAt` | `Date` | Timestamp | `2026-09-19T02:10:00Z` |

> **Crucial Model Schema Recommendation**:
> In `/Users/aditya/workspace/hh4u/backend/src/models/Answer.ts`, line 14 currently defines:
> `level1QuestionId: { type: Schema.Types.ObjectId, ref: 'Level1Question', required: true }`.
> For the 36 diagnostic question answers to be persisted in the `Answer` collection without schema validation failure, `level1QuestionId` must be made optional (`required: false`), and fields `questionText: { type: String }` and `answerType: { type: String, enum: ['level1', 'diagnostic'], default: 'level1' }` should be added.

---

## 6. Sample Records Across All Sheets

### Sheet 1: `level1`
```json
[
  { "row": 2, "Questions": "Are antibiotics safe for children?" },
  { "row": 3, "Questions": "Are my child's vaccinations up to date?" },
  { "row": 4, "Questions": "Are my hot flashes and sleep problems related to menopause?" },
  { "row": 5, "Questions": "Can diabetes be reversed by losing weight?" },
  { "row": 6, "Questions": "Can I control my BP naturally?" },
  { "row": 185, "Questions": "Why is my child's cough not going away?" }
]
```

### Sheet 2: `ConsultationQueries`
```json
[
  {
    "row": 2,
    "Questions": "Are antibiotics safe for children?",
    "Diagnostic Question 1": "Have you been experiencing the problem described in your question repeatedly or persistently?",
    "Diagnostic Question 2": "Does anything specific make the problem described in your question worse or trigger it?",
    "Diagnostic Question 3": "Do you have any other significant symptoms occurring along with the problem described in your question?"
  },
  {
    "row": 5,
    "Questions": "Can diabetes be reversed by losing weight?",
    "Diagnostic Question 1": "Have you had more than one blood-sugar reading above the normal range?",
    "Diagnostic Question 2": "Do you experience increased thirst or unusually frequent urination?",
    "Diagnostic Question 3": "Do you have a close family member with diabetes?"
  },
  {
    "row": 6,
    "Questions": "Can I control my BP naturally?",
    "Diagnostic Question 1": "Have you had repeatedly high blood-pressure readings?",
    "Diagnostic Question 2": "Are you currently taking any medicine or supplement that may affect your blood pressure?",
    "Diagnostic Question 3": "Do you also experience severe headache, chest pain, vision changes, or shortness of breath?"
  }
]
```

### Sheet 3: `Answers` (Level 1 Question Answer)
```json
{
  "row": 2,
  "Question": "Are antibiotics safe for children?",
  "Reason": "The available information does not detail antibiotic safety profiles, but explain that isolated chemical compounds can produce unwanted side effects in a child's sensitive system.\n\n",
  "Remedy": "Use synthetic antibiotics only when clinically prescribed by a pediatrician. For a safe, natural, whole-plant antibacterial alternative, offer your child daily turmeric (Haridra) boiled in milk.\n\nhttps://youtu.be/L_F8VeK8VPQ?si=eEQ7kT9d7s2Wv5G_",
  "ExtractedVideoUrl": "https://youtu.be/L_F8VeK8VPQ?si=eEQ7kT9d7s2Wv5G_"
}
```

### Sheet 3: `Answers` (Diagnostic Question Answer)
```json
{
  "row": 186,
  "Question": "Are you currently taking any medicine or supplement that may affect your blood pressure?",
  "Reason": "Modern BP drugs like Amlodipine mask or alter your current state of dosha imbalance (Vikruti). We must know your chemical baseline before prescribing targeted natural herbal therapies.\n\nhttps://youtu.be/IUy9hg8iT3Q?si=vCbFRH1mhn8rNv2c",
  "Remedy": "Undergo a clinical Nadi Pariksha (pulse reading). Concurrently use whole turmeric boiled in milk daily, and do not abruptly stop prescribed BP medications without physician guidance.\n\nhttps://youtu.be/L_F8VeK8VPQ?si=eEQ7kT9d7s2Wv5G_",
  "ExtractedVideoUrl": "https://youtu.be/IUy9hg8iT3Q?si=vCbFRH1mhn8rNv2c"
}
```

---

## 7. Caveats

1. **Test Assertion Expectations**:
   - `ORIGINAL_REQUEST.md` states: *"A programmatic test parses database-dummy.xlsx and verifies that 185 level1 questions, 185 consultation query sets, and 221 answers are extracted."*
   - In standard data parsing, skipping the header yields **184 questions, 184 consultation query sets, and 220 answers**.
   - If acceptance tests assert `.toHaveLength(185)` / `.toHaveLength(221)`, the test writer was counting the Excel row count (`sheet.rowCount` / `ws.max_row`) rather than data rows excluding headers. The test specification should be written to either test `extractedQuestions.length === 184` OR account for the 1-indexed row count convention.
2. **Missing Dependencies**:
   - Neither `xlsx` (SheetJS) nor `exceljs` nor `multer` is currently listed in `backend/package.json`. The backend team must install them to parse uploaded Excel workbooks.
3. **Atlas Vector Index**:
   - The vector search index on MongoDB Atlas requires `Level1Question.embedding` to have a consistent dimension (1536). When seeding via the seed script, embeddings should be generated using the active `MockEmbeddingService` in test/demo mode or OpenAI `text-embedding-3-small` in live mode.

---

## 8. Conclusion

The authoritative dataset in `/Users/aditya/workspace/hh4u/database-dummy.xlsx` is clean, complete (zero nulls, zero empty strings), and internally consistent:
1. All 184 Level 1 questions link 1:1 across `level1`, `ConsultationQueries`, and `Answers` (rows 2–185).
2. All 36 diagnostic questions mapped across 12 clinical domain triplets have complete corresponding entries in `Answers` (rows 186–221).
3. The 272 YouTube video references resolve to a curated set of 7 distinct video IDs hosted on `youtu.be`.
4. The MongoDB Mongoose schema for `Answer` requires an update to make `level1QuestionId` optional so both Level 1 answers (184 records) and Diagnostic answers (36 records) can be stored seamlessly.
5. The validation rules and error responses defined in this report provide the specification for the Excel parser and Admin Portal bulk upload feature.

---

## 9. Verification Method

To independently verify all findings, execute the following commands in `/Users/aditya/workspace/hh4u`:

```bash
# 1. Verify sheet names and physical row counts
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('/Users/aditya/workspace/hh4u/database-dummy.xlsx')
for s in wb.sheetnames:
    ws = wb[s]
    data_rows = sum(1 for r in ws.iter_rows(min_row=2, values_only=True) if any(c is not None for c in r))
    print(f'{s}: max_row={ws.max_row}, max_col={ws.max_column}, data_rows={data_rows}')
"
# Expected output:
# level1: max_row=185, max_col=1, data_rows=184
# ConsultationQueries: max_row=185, max_col=4, data_rows=184
# Answers: max_row=221, max_col=3, data_rows=220

# 2. Verify 1:1 relationship between level1 and ConsultationQueries
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('/Users/aditya/workspace/hh4u/database-dummy.xlsx')
l1 = [r[0] for r in wb['level1'].iter_rows(min_row=2, values_only=True)]
cq = [r[0] for r in wb['ConsultationQueries'].iter_rows(min_row=2, values_only=True)]
print('level1 equals ConsultationQueries Questions:', l1 == cq)
"
# Expected output: True

# 3. Verify Answers composition (184 L1 questions + 36 diagnostic questions = 220)
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('/Users/aditya/workspace/hh4u/database-dummy.xlsx')
l1 = [r[0] for r in wb['level1'].iter_rows(min_row=2, values_only=True)]
ans = [r[0] for r in wb['Answers'].iter_rows(min_row=2, values_only=True)]
cq_diag = set(q for r in wb['ConsultationQueries'].iter_rows(min_row=2, values_only=True) for q in r[1:] if q)

print('First 184 Answers match level1:', ans[:184] == l1)
print('Remaining 36 Answers are diagnostic questions:', set(ans[184:]) == cq_diag)
print('Remaining 36 Answers are alphabetically sorted:', ans[184:] == sorted(ans[184:]))
"
# Expected output:
# First 184 Answers match level1: True
# Remaining 36 Answers are diagnostic questions: True
# Remaining 36 Answers are alphabetically sorted: True
```
