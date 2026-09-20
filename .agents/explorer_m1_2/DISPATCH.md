## 2026-09-17T01:44:45Z

You are Explorer 2 for Milestone 1: Query Pipeline & Session Analytics.
Your working directory is: /Users/aditya/workspace/hh4u/.agents/explorer_m1_2
Read:
- /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md
- /Users/aditya/workspace/hh4u/.agents/orchestrator_chatbot/PROJECT.md
- Existing models in /Users/aditya/workspace/hh4u/backend/src/models/ (especially Level1Question, Answer, ConsultationQuery, ChatbotSession, NeedsReviewQuery, QueryClickStats)

Your task:
1. Design the query pipeline service (`backend/src/services/chatbotService.ts`):
   - Input processing (voice transcription via STT or text, language detection, translation to English via LLM).
   - Embedding generation (1536-dim) via EmbeddingService.
   - Vector similarity search against active `Level1Question` documents.
   - Top 3-5 candidate ranking with confidence scores.
   - Threshold evaluation against `MATCH_CONFIDENCE_THRESHOLD` (default 0.75).
   - High confidence + `direct_answer`: lookup `Answer`, return answer details.
   - High confidence + `consultation`: lookup `ConsultationQuery`, return diagnostic Yes/No questions.
   - Low confidence (< threshold): create entry in `NeedsReviewQuery`, return graceful fallback response.
   - Session logging: save interaction to `ChatbotSession` with inputMode, originalLanguage, translatedQueryText, top 3-5 match candidates with score, and matched question ID.
   - Click stats: atomically increment `clickCount` in `QueryClickStats` using `$inc`.
2. Detail exact database queries, transactions or error recovery, and data shapes.
3. Write a comprehensive technical blueprint to /Users/aditya/workspace/hh4u/.agents/explorer_m1_2/handoff.md.
4. Send a message to your orchestrator when done with a summary and the path to your handoff.md.
