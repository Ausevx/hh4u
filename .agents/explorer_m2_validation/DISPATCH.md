# Milestone M2 Explorer 2: Excel Validation & Error Handling

## Working Directory
/Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/

## Inputs
- Reference request: /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md
- Project scope & milestones: /Users/aditya/workspace/hh4u/PROJECT.md
- Excel Spec Miner handoff: /Users/aditya/workspace/hh4u/.agents/spec_miner_survey_excel/handoff.md
- E2E Test Writer handoff: /Users/aditya/workspace/hh4u/.agents/test_writer_e2e/handoff.md

## Instructions
1. Read /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md and /Users/aditya/workspace/hh4u/PROJECT.md.
2. Investigate strict validation and error handling for `excelParserService.ts`:
   - Rejection of empty/null buffer.
   - Rejection of non-zip or corrupted binary files (magic bytes `0x50, 0x4B`).
   - Case-insensitive check for mandatory sheets: `level1`, `ConsultationQueries`, `Answers`.
   - Mandatory header verification:
     - `level1`: column header `Questions`
     - `ConsultationQueries`: headers `Questions`, `Diagnostic Question 1`, `Diagnostic Question 2`, `Diagnostic Question 3`
     - `Answers`: headers `Question`, `Reason`, `Remedy`
   - Custom `ExcelValidationError` class with `statusCode = 400` and descriptive messages.
3. Design comprehensive unit test suite in `backend/tests/excelParser.test.ts` verifying all valid and invalid cases.
4. Provide concrete code and test specifications for the Worker.
5. Write your handoff report to `/Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/handoff.md` and message the orchestrator.

## 2026-09-19T02:44:25Z
You are Milestone M2 Explorer 2 (Excel Validation & Error Handling) for Healing Hands4U.
Your working directory is: /Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/
Task assignment: /Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/DISPATCH.md
Reference request: /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md
Project architecture: /Users/aditya/workspace/hh4u/PROJECT.md

Instructions:
1. Investigate validation rules and error responses for `excelParserService.ts` (rejection of non-xlsx files, ZIP signature check, missing sheets, missing column headers).
2. Design custom `ExcelValidationError` (statusCode 400).
3. Design unit test suite `backend/tests/excelParser.test.ts` verifying all boundary cases.
4. Provide complete code and test specifications for the Worker.
5. Write your handoff report to /Users/aditya/workspace/hh4u/.agents/explorer_m2_validation/handoff.md and message the orchestrator.
