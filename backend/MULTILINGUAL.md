# Multilingual query flow

The existing Gemini embeddings and MongoDB Atlas vector search are unchanged.

1. One Gemini request detects the actual language, classifies intent, and translates the question to English. Latin script is not assumed to be English: romanized Indian languages use tags such as `hi-Latn`.
2. The existing embedding and vector-search pipeline searches using the English question.
3. For direct answers, the database answer and its display fields are translated in one batch. There is no separate answer-writing call. English database answers skip output translation.
4. For consultation, all diagnostic questions are translated together. Their IDs are unchanged. The detected language is saved in the session. Submission uses the original English branch rules and translates the selected answer fields together, without detecting the language again.

The translator is prompted for India's 22 scheduled languages and mixed/romanized input. This is model-based support, not a guarantee of translation quality for every dialect. Native-speaker review of clinical content remains necessary before claiming language-quality coverage.

Successful translations and input analysis are cached in process for one hour, up to 1,000 entries per language-service instance. Keys include source content and target language. Editing database text therefore invalidates the corresponding cached translation automatically. Concurrent identical translations share one request. Cache is lost on server restart; it is not a persistent pretranslated database. Sessions and entire user responses are not shared across callers.

Only display text is translated. IDs and video URLs are retained. Instructions tell the translator to preserve medicine names, units, negations, and dose notation. Numeric quantities are validated before accepting output. Incomplete, malformed, failed, or timed-out translations return `503` with `TRANSLATION_UNAVAILABLE`. Android displays a retry message rather than silently replacing a translation failure with an English offline answer.

## Configuration and verification

- Uses the existing `GEMINI_API_KEY` and `GEMINI_LLM_MODEL`; no model/provider migration.
- `TRANSLATION_TIMEOUT_MS`: defaults to 8000, bounded to 1000–15000 per translation request. This is a failure deadline, not a 5–7 second end-to-end promise.
- No SDK retry cascade for translation calls.
- Local deterministic tests: `node node_modules/jest/bin/jest.js tests/localization.test.ts tests/multilingualFlow.test.ts --runInBand`.
- Optional live language/timing check, with credentials configured: `node -r ts-node/register scripts/check_localization.ts`. Uses synthetic Hindi, Hinglish, and Tamil messages. Measures translation steps only, not database/network end-to-end latency.
- Deploy the updated backend for server-side behavior. Rebuild/install Android for translation-error handling. Offline keyword lookup is unchanged and does not acquire an offline translation model in this change.

## Options for a 5–7 second target (not implemented)

- Pretranslate stored answers and diagnostic questions when an administrator publishes content. Serve translations by answer/question version and language. Retains English search and removes output translation from normal requests.
- Use a dedicated translation service such as Cloud Translation for the input step, with the existing vector search. Benchmark the chosen languages and romanization coverage first.
- Benchmark cross-language retrieval using the existing multilingual embedding model, combined with pretranslated answers. This could remove input translation, but changes the requested English-first flow and requires approval plus retrieval-quality tests.

An always-available backend near its database and AI endpoints, warm caches, and stage-level p50/p95 latency measurements are required before making a dependable response-time claim. A shorter timeout alone does not make an answer arrive faster.
