# Direct multilingual search and Cloud Translation

## Approved behavior
- English, Hindi, Marathi and Hinglish queries go directly to the hosted Gemini embedding model. No question translation, answer generation, or LLM classification.
- Keep canonical questions in English and use indexed Atlas vector search; no multilingual copies of the entire corpus. Keep the existing embedding model/dimensions/input convention so stored vectors remain compatible. Rebuild and evaluate all vectors before changing the model.
- Detect reply language in parallel with embedding generation using Google Cloud Translation. Conservative local shortcuts cover clear English and common Hindi/Marathi phrases; ambiguous input uses Cloud detection. Preserve language on consultation sessions.
- Batch saved answer fields or guidance questions through Cloud Translation NMT only. English bypasses translation. Hindi in Latin script uses Cloud romanization; unsupported scripts fail explicitly rather than falling back to an LLM.
- Cache translations on demand by source-content hash, language, provider and configuration. Cache query vectors by model/dimension/input. Persist bounded-lifetime cache entries, combine simultaneous identical calls, and retain bounded process caches. Never cache sessions.

## Implementation sequence
1. Add Cloud Translation REST adapter using existing google-auth-library and server-side Application Default Credentials. Explicit project/location configuration; no keys in Android. Add timeouts, typed errors and no automatic LLM fallback.
2. Add durable TTL cache and use it for answer translation and embeddings. Preserve URLs, numbers, potency and configured protected terms; validate translated fields before caching.
3. Replace sequential classification/translation with concurrent detection and original-text embedding. Keep canonical question IDs and existing branch selection. Add score margin and configurable threshold. Reject invalid embeddings rather than inventing fallback vectors.
4. Keep Atlas as production search engine; disable full-corpus fallback in production unless explicitly enabled. Add vector audit/rebuild command and request timing telemetry.
5. Add Android ten-second slow-request message and cancel actions; preserve 40-second network deadline. Add response language/request metadata and timing logs without symptom text.
6. Run mocked API/regression tests and Android build. Provide a multilingual evaluation fixture and explicit benchmark command reporting accuracy, p50/p95 and failures separately at concurrency ten.

## Activation and validation
- Configure GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, Cloud Translation API and ADC credentials; grant roles/cloudtranslate.user. GEMINI_API_KEY is used for embeddings only.
- Enable Mongo TTL indexes and verify Atlas vector_index (1536 dimensions) is ready. Audit/rebuild if stored vectors were generated with a different model or the historical fabricated-vector fallback.
- Evaluate Hindi, Marathi, Hinglish, English, negations, ambiguity, unrelated queries and long answers. Tune threshold/margin against reviewed expected question IDs. Cache hits and cold requests must be reported separately.
- Target p95 <= 7 seconds and ordinary responses <= 10 seconds; these are unverified targets until a real device/mobile-network run and configured APIs are available. Failures are not successful fast answers.
- No prepaid translations, hosting purchases, live DB rewrites or automatic production deployment in this change. Translation quality and query-to-ID fixtures need owner review before production acceptance.
