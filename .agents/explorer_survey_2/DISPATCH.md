## 2026-09-20T17:23:00Z

Investigate the backend Chatbot routes, query pipeline, and Jest tests:
1. Locate and examine all routes and controllers handling `/api/chatbot/query` (or `/chatbot/query`), consultation queries, and answer generation.
2. Search for any hardcoded stub string responses across the backend (specifically "Here is your personalized homeopathic..." or similar canned responses).
3. Examine existing Jest test suites (in `backend/tests/` or `backend/src/**/__tests__/`) to see how chatbot query endpoints are tested.
4. Determine what tests exist, how they currently handle AI services, and what new or updated Jest tests are required to verify that querying `/api/chatbot/query` hits Gemini (or an HTTP-level mock of the Gemini API) and returns dynamically generated LLM answers rather than hardcoded stubs.
5. Provide concrete recommendations for eliminating stubs in controllers/pipelines and updating the Jest test suite to meet the acceptance criteria.
