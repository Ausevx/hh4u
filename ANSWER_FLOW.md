# Saved-answer display

English direct answers and resolved consultation answers display the database's `answerText` verbatim, below “Dr. Anjali Jariwala's / Practical Advice”. The app no longer repeats the answer in a prescription card. Each distinct YouTube video URL in the answer or video field gets its own tap-to-play embedded iframe. Video playback requires internet.

Recognized English queries bypass language detection and answer translation. Uncertain wording still uses language detection so Romanized Indian languages are not mistaken for English. The existing embedding/vector search remains unchanged and still uses its configured embedding API.

Other-language queries are translated into English for database matching. The saved answer is translated back into the detected language, without generating new advice. Consultation sessions retain that language through the diagnostic questions and final answer. Translation failures return a retry error instead of presenting an English answer as a translation.

Unmatched queries receive a fixed no-match message, translated when needed. Complete query responses are not cached, so edited database answers and new consultation sessions remain current; the existing content-based translation cache is retained.

Offline keyword search continues to use the English database bundled with the APK. Its source notice is separate from the unchanged saved answer. Offline translation is not provided.

Deploy the updated backend as well as installing the updated APK to activate the complete online flow. Response time still depends on embedding, database, and (for other languages) translation latency.

Validation: backend TypeScript check; multilingual flow, localization, and English fast-path tests; focused Android offline and video-link tests using `-PofflineTestsOnly=true`; debug APK build. Live translation quality and device video playback require an online device check.
