## 2026-09-17T01:44:45Z
You are Explorer 1 for Milestone 1: AI Service Abstractions & Vector Matcher.
Your working directory is: /Users/aditya/workspace/hh4u/.agents/explorer_m1_1
Read:
- /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md
- /Users/aditya/workspace/hh4u/.agents/orchestrator_chatbot/PROJECT.md
- Existing models in /Users/aditya/workspace/hh4u/backend/src/models/

Your task:
1. Design the exact TypeScript interfaces for the vendor-agnostic AI service layer (LLM, Embeddings, STT, TTS) in `backend/src/services/ai/types.ts`.
2. Design deterministic mock implementations for offline testing without real API keys (`MockLLMService`, `MockEmbeddingService`, `MockSTTService`, `MockTTSService`). Detail exact return structures and predictable behaviors.
3. Design a dependency injection service container (`aiContainer.ts`) providing `getAIServices()`, `setAIServices()`, `resetAIServices()`.
4. Design the vector similarity utility (`backend/src/utils/vectorSimilarity.ts`) computing cosine similarity between query embeddings and active `Level1Question` embeddings, handling candidate ranking and edge cases.
5. Design configuration module `backend/src/config/chatbotConfig.ts` with `MATCH_CONFIDENCE_THRESHOLD` (env or 0.75 default).
6. Write a comprehensive technical blueprint to /Users/aditya/workspace/hh4u/.agents/explorer_m1_1/handoff.md.
7. Send a message to your orchestrator when done with a summary and the path to your handoff.md.
