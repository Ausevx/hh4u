# Bundled English search

The APK includes `assets/knowledge_base.json` with 184 saved questions and answers. No first-run download, sign-in, or backend connection is needed for English text searches.

On the first search, the app imports the bundle into Room. If the database is empty after an upgrade or restore, it imports the bundle again even if old synchronization preferences remain. Background downloads do not hold the local search lock. Empty or failed downloads preserve the available local records.

Search compares English keywords with saved questions, tags, and follow-up questions, including common variants such as “tummy”/“stomach” and “hurts”/“pain”. It ranks matching topics and shows the best saved answer with its matched question. It does not generate a new answer or translate offline. Unmatched questions show a message suggesting simpler English keywords.

Guided consultation uses saved branches when available. The current bundle has follow-up questions but no answer branches; in that case the result is explicitly labeled general guidance, not an answer tailored to the yes/no responses.

## Verify on a phone

Install `app/build/outputs/apk/debug/app-debug.apk`. Enable airplane mode before opening the app. Enter “headache”, “my tummy hurts”, or “burning while urinating”, then select Direct Answer. Saved text should appear without an online request. Videos and the phone's speech service may still need internet; typing works offline.

## Automated verification

Run `gradlew.bat :app:assembleDebug :app:testDebugUnitTest -PofflineTestsOnly=true`.

The focused tests use the real APK asset and an in-memory Room database. They cover first-use import without network access, stale preference recovery, keyword matching, unmatched input, empty-server protection, local searching during a stalled download, and clearly labeled general consultation guidance. This option isolates these tests from legacy UI tests referencing removed screens.

Every build validates that the bundle is nonempty and that each record has a unique ID, a question, and an answer. Regenerate and rebuild the bundle when publishing updated database content; online synchronization can update installed copies when a connection is available.
