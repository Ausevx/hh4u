# Milestone M2 Worker: Excel Parser Service & Knowledge Base Seed Script

## Working Directory
/Users/aditya/workspace/hh4u/.agents/worker_m2_excel/

## Exclusive File Ownership
- backend/src/services/excelParserService.ts
- backend/src/scripts/seedKnowledgeBase.ts
- backend/package.json (only adding "seed" script)
- backend/tests/excelParser.test.ts
- backend/tests/seedKnowledgeBase.test.ts

## Inputs
- Reference request: /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md
- Project scope & milestones: /Users/aditya/workspace/hh4u/PROJECT.md
- Seed file: /Users/aditya/workspace/hh4u/database-dummy.xlsx
- Explorer 1 handoff & proposed code: /Users/aditya/workspace/hh4u/.agents/explorer_m2_parser/handoff.md, /Users/aditya/workspace/hh4u/.agents/explorer_m2_parser/proposed_excelParserService.ts
- Explorer 2 handoff & proposed code: /Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/handoff.md, /Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/proposed_excelParserService.ts, /Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/proposed_excelParser.test.ts
- Explorer 3 handoff & proposed code: /Users/aditya/workspace/hh4u/.agents/explorer_m2_seed_script/handoff.md

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. **Excel Parser Service (`backend/src/services/excelParserService.ts`)**:
   - Implement `parseExcelBuffer` and `parseExcelFile` using the proposed code from Explorer 1 & 2.
   - Implement `ExcelValidationError` (statusCode 400).
   - Ensure strict ZIP magic byte checking (`0x50, 0x4B`), sheet validation, header validation, row trimming, YouTube URL extraction, and stats calculation.
2. **Knowledge Base Seed Script (`backend/src/scripts/seedKnowledgeBase.ts`)**:
   - Implement the complete seed script per Explorer 3's report.
   - Connects to MongoDB Atlas via `connectDB()` (`DB_NAME=hh4u`).
   - Uses `parseExcelFile` on `database-dummy.xlsx`.
   - Generates embeddings via `getAIServices().embedding`.
   - Idempotently upserts:
     - 184 Level 1 questions into `level1questions`
     - 184 Consultation queries into `consultationqueries`
     - 220 Answers into `answers` (184 direct level1 answers + 36 diagnostic question answers)
     - 1 default admin user `admin@healinghands4u.com` into `admins`
   - Validates post-seed counts and logs summary.
3. **Update `backend/package.json`**:
   - Add `"seed": "ts-node src/scripts/seedKnowledgeBase.ts"` to `scripts`.
4. **Unit & Integration Tests**:
   - Implement `backend/tests/excelParser.test.ts` (boundary cases, corrupted buffers, missing sheets/columns).
   - Implement `backend/tests/seedKnowledgeBase.test.ts` (programmatic seed verification).
5. **Execution & Verification**:
   - Run `npx ts-node src/scripts/seedKnowledgeBase.ts` and verify that the seed script successfully populates MongoDB Atlas with all 184 questions, 184 consultation queries, and 220 answers.
   - Run `npm test` across all backend test suites and confirm 100% pass.
6. Write your handoff report to `/Users/aditya/workspace/hh4u/.agents/worker_m2_excel/handoff.md` with full command outputs and pass confirmation, then message the orchestrator.
