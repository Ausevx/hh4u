## 2026-09-17T03:34:56Z
You are the Implementation Worker for Iteration 2 of the Chatbot Engine backend project.
Your working directory is: /Users/aditya/workspace/hh4u/.agents/worker_m1_2

READ THESE DOCUMENTS FIRST:
- /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md
- /Users/aditya/workspace/hh4u/.agents/orchestrator_chatbot/PROJECT.md
- /Users/aditya/workspace/hh4u/.agents/reviewer_2/handoff.md
- /Users/aditya/workspace/hh4u/.agents/challenger_1/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
- backend/src/services/chatbotService.ts
- backend/src/controllers/chatbotController.ts
- backend/tests/**

TASKS TO REMEDIATE:
1. Fix `QueryClickStats` guest user filter in `backend/src/services/chatbotService.ts`:
   In `statsFilter` around line 141:
   Currently:
   ```typescript
   const statsFilter: any = {
     level1QuestionId: topCandidate.level1QuestionId,
   };
   if (parsedUserId) {
     statsFilter.userId = parsedUserId;
   }
   ```
   When `parsedUserId` is null/undefined (guest request), `statsFilter` omits `userId`, which causes MongoDB `findOneAndUpdate` to match ANY existing document for that `level1QuestionId`, mistakenly incrementing a registered user's click count.
   Fix this so that guest queries partition cleanly:
   ```typescript
   const statsFilter: any = {
     level1QuestionId: topCandidate.level1QuestionId,
     userId: parsedUserId || null,
   };
   ```
   And in `$setOnInsert`:
   `firstAskedAt: new Date()`, `userId: parsedUserId || null`, `...(input.userEmail ? { userEmail: input.userEmail } : {})`.
   Ensure that guest queries never contaminate or increment registered user records.
2. Fix controller error status codes in `backend/src/controllers/chatbotController.ts`:
   In `handleQuery` and `handleConsultationAnswer`, catch blocks should return HTTP 500 for unhandled runtime/database exceptions rather than defaulting to HTTP 400.
   Specifically:
   ```typescript
   const status = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
   ```
   and for consultation answer, check 404 for not-found errors, 400 for validation errors, and 500 for internal server errors.
3. Verify test suites:
   Run `npm run build` and `npm test` in `backend/`. Ensure all tests across all test suites (functional, adversarial, stress, challenger, auth) pass with 100% success and exit code 0.
4. Document all changes and test outputs in `/Users/aditya/workspace/hh4u/.agents/worker_m1_2/handoff.md`.
5. Send a message to your orchestrator when done.
