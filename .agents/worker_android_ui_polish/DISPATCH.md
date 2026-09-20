# Dispatch — worker_android_ui_polish

## Objective
Apply the 2 advisory refinements identified by Challenger 1:
1. In `app/src/main/java/com/healinghands4u/presentation/navigation/AppNavHost.kt`:
   In `onDiseaseClick`, URL-encode the query string before appending to route:
   `val encoded = java.net.URLEncoder.encode(query, "UTF-8")`
   `navController.navigate("${Screen.ChatbotQuery.route}?initialQuery=$encoded")`
   And in `ChatbotQueryScreen` (or where initialQuery is decoded), ensure URL decoding if needed or verify that compose navigation decodes it automatically.
2. In `app/src/main/java/com/healinghands4u/presentation/home/HomeScreen.kt:224`:
   Ensure `DoctorContactFooter` retains `TestTags.FOOTER_CARD` so automated tests can query `FOOTER_CARD` uniformly across all screens including Home.
3. Run `./gradlew assembleDebug` and `./gradlew cleanTestDebugUnitTest testDebugUnitTest` to verify all 93+ tests pass with 0 failures.


## 2026-09-17T23:07:25Z
You are the Polish Worker for the Healing Hands4U Android UI project.
Your working directory is: /Users/aditya/workspace/hh4u/.agents/worker_android_ui_polish/
Original parent conversation ID: 44b12c5c-1fb4-4491-a8c3-ef335cbdd2b4

MANDATORY: Read /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md and /Users/aditya/workspace/hh4u/.agents/worker_android_ui_polish/DISPATCH.md before starting work.
Study the findings in /Users/aditya/workspace/hh4u/.agents/challenger_android_ui_1/handoff.md.

Your tasks:
1. In `AppNavHost.kt`, in `onDiseaseClick = { query -> ... }`, encode query with `java.net.URLEncoder.encode(query, "UTF-8")` so ampersands (`&`) in condition names like "Acid Reflux & GERD" are not truncated by navigation query delimiter parsing. In `ChatbotQueryScreen`, decode the query with `java.net.URLDecoder.decode(initialQuery, "UTF-8")` if needed so the user sees clean text.
2. In `HomeScreen.kt:224`, ensure `DoctorContactFooter` retains `TestTags.FOOTER_CARD` (either removing the override or applying both tags) so `FOOTER_CARD` can be queried uniformly across all screens.
3. Run `./gradlew assembleDebug` and `./gradlew cleanTestDebugUnitTest testDebugUnitTest` to verify all 93 tests pass cleanly.
