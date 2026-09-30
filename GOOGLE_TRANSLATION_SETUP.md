# Google Cloud Translation setup and release checks

The backend now uses Gemini only for embeddings. Cloud Translation Advanced NMT handles language detection, answer/guidance translation, and Hindi romanization. No LLM writes clinical text. Do not deploy before configuring Cloud Translation.

## Configure your Google project
1. Create/select a Google Cloud project, enable billing, and enable Cloud Translation API (`translate.googleapis.com`). Gemini billing/keys and Cloud Translation credentials are separate configuration.
2. Create a service account with `roles/cloudtranslate.user`. Prefer workload identity/Application Default Credentials on supported hosting. On Railway, securely mount a service-account credential file and set `GOOGLE_APPLICATION_CREDENTIALS` to its server path. Do not commit it or put it in Android. Keep credentials out of chat.
3. Set `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION=us-central1`. Retain `GEMINI_API_KEY` and `GEMINI_EMBEDDING_MODEL=gemini-embedding-2`. Set `NODE_ENV=production` and `USE_MOCK_AI=false`.
4. Optional `TRANSLATION_PROTECTED_TERMS` is a pipe-separated list of medicine names to preserve exactly. Optional `GOOGLE_TRANSLATION_GLOSSARY` is a full glossary resource in the same location; use compatible language-pair configuration. Configure separately if you need several language pairs. Numbers, potency notations and links are protected automatically. Automated checks do not establish medical translation accuracy.
5. Allow MongoDB to create `contentcacheentries` and its TTL index on `expiresAt` (expireAfterSeconds=0). This cache retains answer translations for 30 days and query vectors/detection for one day; process caches are bounded to 500 entries. Keys are content hashes. Detection records contain only a language code; vector records contain a vector. Translation records contain translated saved advice, not user symptoms. TTL expiry is asynchronous but expired entries are never returned.

## Validate and release
- `node node_modules/typescript/bin/tsc` builds backend output.
- `node dist/scripts/auditSearch.js` checks active vector dimensions and Atlas `vector_index` readiness. It does not call paid APIs or edit questions. For historical vectors with unknown provenance or possible fabricated fallback vectors, explicitly run `node dist/scripts/auditSearch.js --rebuild` in a maintenance window. This spends embedding credits and updates embeddings, preserving original question IDs. Back up first. Canonical source changes during rebuild are skipped by the update filter. Existing raw input convention and 1536 dimensions are retained.
- Fill and review `tests/fixtures/multilingual-benchmark.json` with expected question IDs/null for no confident answer; set reviewed=true only after human review. Add language-specific paraphrases, negations and ambiguous cases before calibration.
- `node dist/scripts/benchmarkSearch.js https://YOUR-BACKEND tests/fixtures/multilingual-benchmark.json` runs two passes at concurrency ten. It creates normal query sessions and may spend credits. It reports incorrect confident matches and failures independently of latency. First pass is labelled unknown cache state, not falsely called cold. For a genuine cold test use an isolated staging database/process, never delete production caches for a benchmark.
- Compare with a baseline build in staging on the same fixture. Calibrate `MATCH_CONFIDENCE_THRESHOLD` and `MATCH_SCORE_MARGIN`; defaults 0.75/0.03 are provisional, not proven multilingual cutoffs. Rebuild before changing embedding models; matching dimension alone is not compatibility.
- Confirm `/health` returns `searchFlow=multilingual-cloud-v1`, correct revision, translationConfigured=true. This boolean checks project configuration, not valid IAM/billing or provider availability.
- Test answers, consultation branches, Hindi and Marathi meanings, Hinglish output, dose/URL preservation and edited-content cache invalidation. Observe `chatbot_timing` logs for language/embedding/search/translation/lookup and total. `X-Request-Id` correlates calls. Logs omit symptom text.
- Install the APK and measure real phone-network completion/rendering. `SearchTiming` logcat events measure HTTP duration; do not call these UI-render timings. Text does not wait for video loading. Cancel is available; slow status appears after ten seconds; the 40-second network limit remains.

## Language behavior and limitations
English skips translation. Common Hindi/Marathi/Hinglish phrases use conservative local language recognition; uncertain language uses Cloud detection, concurrently with embedding. Low-confidence detection asks for language selection. A hint is not blanket permission to mislabel non-English text as English.
Hinglish is searched directly; answers are English-to-Hindi NMT followed by Hindi-to-Latin romanization, cached together. This gives Romanized Hindi, not guaranteed colloquial code-mixed Hinglish. Cloud romanization is a preview feature; test the actual account/region. Marathi-script answers are supported. Romanized Marathi output is not documented as supported by Google; select Marathi to get Marathi script. No generative fallback is used.
Translation batches over 28,000 characters currently return a clear error rather than silently truncating advice. No measured 5–7 second promise can be made until configured-provider and Android tests pass. No upfront translation of all 5,000 questions is needed.

Official references:
- https://docs.cloud.google.com/translate/docs/setup
- https://docs.cloud.google.com/translate/docs/detect-language
- https://docs.cloud.google.com/translate/docs/translate-text
- https://docs.cloud.google.com/translate/docs/advanced/romanize-text
- https://docs.cloud.google.com/translate/docs/languages
