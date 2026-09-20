# Dispatch — spec_miner_android_ui

## 2026-09-17T22:44:05Z

**Objective**: Extract all precise specifications from PRD v3 and related documentation in `/Users/aditya/workspace/hh4u/` for the Android Jetpack Compose UI.

**Scope boundaries**:
- Inspect PRD documents (e.g. `PRD_v3.md`, `docs/`, `PROJECT.md`, etc.).
- Extract complete color tokens for "Trusted Teal" design system (Light Mode and Dark Mode hex codes, surface values, dark tint values).
- Extract Typography specifications (Sora font for headings, IBM Plex Sans for body text, weights, line heights, font sizes).
- Extract specifications for all 13 reusable UI components: `BrandRow`, `TipCard`, `MiniCard`, `TabBar` (bottom nav with center FAB), `ChatHeader`, `ChatBubble`, `QuickReplyChip`, `YesNoCard`, `RxCard`, `VideoLink`, `TagChip`, `PlanStep`, and `DoctorContactFooter`. Verify SVG line-art icon requirements.
- Extract specifications for the 6 core screens: Home Dashboard, Disease Directory, Personalized Planner, Chatbot Query (Text/Voice input), Consultation (Yes/No flow), Chatbot Answer. Extract mock data requirements and navigation flows.

**Output**: Write a comprehensive specification report to `/Users/aditya/workspace/hh4u/.agents/spec_miner_android_ui/handoff.md`.
