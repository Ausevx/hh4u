## 2026-09-21T09:06:15Z

You are the Project Orchestrator for the Healing Hands4U app ecosystem (Android + Express backend + React admin panel).

Working directory: /Users/aditya/workspace/hh4u/.agents/orchestrator_fix_crash_vector_upload/
Project root: /Users/aditya/workspace/hh4u
User Request authoritative source: /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md (check the latest section dated 2026-09-21T09:06:15Z).

## Requirements Overview:

### R1. Fix App Crash on Launch
The Android app (Jetpack Compose, Hilt DI) crashes immediately on open after the latest changes. The most likely cause is the `AuthViewModel.init` block calling `firebaseAuthManager.getCurrentUser()` which calls `FirebaseAuth.getInstance()` — if Firebase isn't initialized yet at that point, or if the Hilt injection graph fails, the app crashes. The `ProfileMenu.kt` composable also calls `FirebaseAuth.getInstance().currentUser` directly at composition time which could crash if Firebase isn't ready.

Fix the crash so the app opens reliably. Wrap all `FirebaseAuth.getInstance()` calls in try-catch to handle Firebase not being initialized. The app must survive even if Firebase is misconfigured or unavailable — defaulting to guest mode.

### R2. Fix Vector Search Pipeline (Remedies Not Found)
When a user types "vomiting" or "headache" in the chatbot, the backend returns no results even though matching remedies exist in the MongoDB Atlas database. The vector search pipeline in `backend/src/services/vectorSearchService.ts` uses MongoDB Atlas `$vectorSearch` with a fallback to in-memory cosine similarity.

Diagnose and fix why queries don't match. Likely causes:
- The `Level1Question` documents in MongoDB may not have embeddings generated yet (the `embedding` field may be empty/missing)
- The MongoDB Atlas vector search index may not be created
- The embedding generation on the seed/upload path may be broken

Ensure the backend has a startup check or API endpoint that:
1. Verifies the vector search index exists (or creates it)
2. Verifies Level1Question documents have embeddings
3. Re-generates embeddings for any documents missing them

Add a backend health/diagnostic endpoint at `GET /api/admin/vector-status` that reports: total Level1Questions, how many have embeddings, whether the Atlas vector index exists, and the Gemini API key status.

### R3. Admin Panel Upload: Overwrite vs Append Toggle
The admin panel's `BulkUploadModal.tsx` currently uploads Excel files to the backend. Add a toggle (switch or radio buttons) in the upload modal that lets the admin choose:
- **Append** (default): Add new entries alongside existing ones
- **Overwrite**: Delete all existing entries first, then insert the new ones

The backend bulk upload endpoint must respect this flag. Show a confirmation dialog when "Overwrite" is selected warning that all existing data will be replaced.

### R4. Clarify APK Rebuild Behavior
The APK is a static file served from the admin panel (`admin-panel/public/healing-hands-4u.apk`). It does NOT auto-rebuild when someone uploads data. Add a small info banner or tooltip on the admin panel's dashboard near the APK download button explaining: "This APK connects to the live backend. Database changes via upload take effect immediately — no APK rebuild needed."

## Acceptance Criteria:

### App Stability
- [ ] The Android app opens without crashing on a fresh install
- [ ] The app works even if Firebase Auth is completely misconfigured (graceful fallback to guest)
- [ ] `./gradlew assembleDebug` compiles successfully
- [ ] The Login screen → "Continue as Guest" → Chatbot screen flow works end-to-end

### Vector Search
- [ ] `npm run build` in `backend/` compiles successfully
- [ ] `GET /api/admin/vector-status` returns a JSON report of embedding health
- [ ] The backend has logic to generate missing embeddings on startup or via an admin API call
- [ ] Querying "vomiting" or "headache" via `POST /api/chatbot/query` returns relevant results when matching Level1Questions exist in the database with embeddings

### Admin Upload Toggle
- [ ] The BulkUploadModal shows an Overwrite/Append toggle
- [ ] Selecting "Overwrite" shows a confirmation warning
- [ ] The backend bulk upload endpoint accepts and respects the `mode` parameter
- [ ] Existing data is preserved on Append, fully replaced on Overwrite

### APK Info
- [ ] The admin dashboard shows an informational note near the APK download button
