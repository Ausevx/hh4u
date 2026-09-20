# UI Specification Mining Report — Healing Hands4U Android UI

**Date**: 2026-09-17T22:50:00Z  
**Agent**: spec_miner_android_ui (Specification Miner)  
**Parent**: 44b12c5c-1fb4-4491-a8c3-ef335cbdd2b4 (orchestrator_android_ui)  
**Status**: Hard Handoff (Complete Specification Discovery)

---

## 1. Observation

Direct observations from inspecting the authoritative project sources:
1. **Authoritative PRD v3**: Located at `/Users/aditya/Downloads/Healing-Hands4U-PRD-v3.md` (Total lines: 512, 27,072 bytes).
   - Section 12 Addendum (Lines 463–508): Explicitly defines the "Trusted Teal" visual design system, complete color token tables for Light and Dark modes, typography rules (Sora and IBM Plex Sans from Google Fonts), the complete inventory of 13 reusable UI components, and the strict design rule prohibiting emojis in favor of line-art SVG icons.
   - Section 4 (Lines 52–75): Information Architecture detailing user navigation flows from Auth to Home, Planner, Disease List, Chatbot Query, Consultation Q&A, and Chatbot Answer.
   - Section 6 (Lines 87–182): Chatbot engine specification, query resolution pipeline, dual intent branching (`direct_answer` vs `consultation`), language fidelity, and in-app video links.
   - Section 7 (Lines 183–378): Full MongoDB collection schemas (`level1_questions`, `answers`, `consultation_queries`, `chatbot_sessions`, `query_click_stats`, `app_database_versions`) and REST API contracts (`POST /chatbot/query`, `POST /chatbot/consultation-answer`).
   - Section 9 (Lines 397–430): Android app suggested architecture (Hilt, Retrofit, Room, domain use cases, Presentation layers).
2. **Founder Wireframe & Flow Diagram**: Located at `/Users/aditya/Downloads/Untitled-2026-09-06-1544.svg` and `Untitled-2026-09-06-1544.png`.
   - Contains verbatim wireframe text:
     - Home banner: `"Welcome : Username"`, `"Dr. Anjali Jariwala's Holistic Healing Combining Homeopath, Naturopathy and Breathing"`, `"One Stop Solution for Life Style Disease, Chronic Illness, Kids Behavior Issues"`, `"Chat with Dr. Anjali Now to get quick resolution of your queries"`.
     - Planner: `"Personalized Planner"`, `"Breathing Techniques"`, `"Yoga Exercise"`, `"Diet Plan"`, `"Affirmations"`.
     - Disease List: `"Cure Your Disease Forever without side effects for Allopathy medicines"`.
     - Chatbot Query: `"Type your Query or Speak"`, with two explicit action buttons: `"I want answer now"` and `"I would like to Cooperate for online consultation"`.
     - Consultation flow: `"Please answer following to help you better"`, with 3 diagnostic questions (`"Did you eat outside food recently?"`, `"Do you have stress currently?"`, `"Is this acidity from long time?"`) with Yes/No toggles.
     - Answer screen: Remedy name and dose (`"SBL Nixocid 2 pills a day"`), home remedy (`"Also take Jeera and Dhania Socked water 2 times a day"`), and safety note (`"If Disease do not cure within 2 days then consult doctor right now"`).
     - Doctor footer: `"Dr. Anjali Jariwala (DHMS)"`, `"Kharadi, Pune"`, `"+917775035812"`, `"Message for Appointment Now"`.
3. **Milestone Request & Scope**: Recorded in `/Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md` (lines 67–92):
   - R1: "Trusted Teal" theme implementation with Material 3, exact color tokens for Light and Dark modes, Google Fonts Sora & IBM Plex Sans. Dark mode must use specific tint/surface values, not simple inversion.
   - R2: 13 reusable UI components (`BrandRow`, `TipCard`, `MiniCard`, `TabBar`, `ChatHeader`, `ChatBubble`, `QuickReplyChip`, `YesNoCard`, `RxCard`, `VideoLink`, `TagChip`, `PlanStep`, `DoctorContactFooter`), line-art SVG only, no emojis.
   - R3: 6 core screens with mock data and Compose Navigation: Home Dashboard, Disease Directory, Personalized Planner, Chatbot Query, Consultation, Chatbot Answer.
4. **Existing Codebase State**:
   - `app/src/main/java/com/healinghands4u/presentation/theme/Color.kt`: Currently contains temporary Milestone 2 colors (`TealPrimary = Color(0xFF006A60)`, etc.) rather than the PRD v3 "Trusted Teal" tokens.
   - `app/src/main/java/com/healinghands4u/presentation/theme/Type.kt`: Currently uses `FontFamily.Default` rather than Sora and IBM Plex Sans.
   - `app/src/main/java/com/healinghands4u/config/BrandingConfig.kt`: Contains clinic branding constants (`DOCTOR_NAME = "Dr. Anjali Jariwala"`, `DOCTOR_QUALIFICATIONS = "BHMS, MD (Homeopathy)"`, `WHATSAPP_NUMBER = "+1234567890"`, `CLINIC_ADDRESS = "Healing Hands Clinic, Pune, India"`).
   - `backend/tests/helpers/chatbotFixtures.ts`: Contains structured realistic fixtures for migraine, tension headache, and allergic rhinitis remedies, diagnostic questions, and answer branches.

---

## 2. Logic Chain

1. **Design System Token Deduction**:
   - PRD v3 explicitly lists nine tokens with distinct Light and Dark values:
     - `--bg`: Light `#FFFFFF`, Dark `#0A1418`
     - `--surface`: Light `#F7F9FB`, Dark `#101E22`
     - `--surface-tint`: Light `#EAF5F6`, Dark `rgba(45,212,200,0.10)` -> ARGB hex `0x1A2DD4C8`
     - `--ink`: Light `#0F2027`, Dark `#E7F1F3`
     - `--ink-dim`: Light `#5C7480`, Dark `#7E97A0`
     - `--accent`: Light `#0E7C86`, Dark `#2DD4C8`
     - `--accent-ink`: Light `#FFFFFF`, Dark `#04211E`
     - `--line`: Light `rgba(15,32,39,0.08)` -> `0x140F2027`, Dark `rgba(231,241,243,0.10)` -> `0x1AE7F1F3`
     - `--warn-bg` / `--warn-ink`: Light `#FFF0EC` / `#A14A2A`, Dark `rgba(230,126,34,0.14)` (`0x24E67E22`) / `#F0B074`
   - In Dark mode, surfaces are tinted dark slate teal (`#101E22` over `#0A1418`) and the accent transforms from deep rich teal (`#0E7C86`) to high-luminance cyan-teal (`#2DD4C8`). The warning color shifts from terracotta rust (`#A14A2A` on `#FFF0EC`) to amber-peach (`#F0B074` on `14% #E67E22`).
   - Material 3 mappings must bind `--accent` to `primary`, `--accent-ink` to `onPrimary`, `--surface-tint` to `primaryContainer`, `--bg` to `background`, `--surface` to `surface`, `--ink` to `onBackground`/`onSurface`, `--ink-dim` to `onSurfaceVariant`, and `--warn-*` to `error`/`errorContainer`.

2. **Typography Architecture**:
   - Dual-font system:
     - Headings (`h1`, brand wordmark, remedy title, section headers): **Sora**, weight 700, letter spacing `-0.01em` (`-0.01 * fontSize`).
     - Body & UI (all labels, buttons, chat text, input fields, navigation): **IBM Plex Sans**, weights 400, 500, 600, 700.
   - Implementation via Google Fonts in Jetpack Compose:
     - Uses `androidx.compose.ui.text.googlefonts.GoogleFont` with `providerAuthority = "com.google.android.gms.fonts"`, `providerPackage = "com.google.android.gms"`, and font certificates in `res/values/font_certs.xml`.
     - In offline testing / Robolectric environments, `FontFamily.SansSerif` or bundled fallback resources ensure tests never fail due to missing Google Play Services.

3. **13 Reusable UI Components Deduction**:
   - Analysis of PRD v3 lines 490–508:
     1. `BrandRow`: Header row with leaf line-art icon + Sora 700 wordmark.
     2. `TipCard`: Rounded 16dp card, `--surface-tint` background, dot + label + body + "Read more" action.
     3. `MiniCard`: 2-up metrics card (label, value, meta) with `--surface` and `--line` border.
     4. `TabBar`: 3-item bottom bar (Directory, Center FAB for Chat, Planner). Center FAB is a filled circle in `--accent` with chat icon.
     5. `ChatHeader`: Top bar with back button, avatar in `--surface-tint`, bot name in Sora, and pulsing status dot ("Replies in seconds").
     6. `ChatBubble`: Asymmetric rounded 14dp bubbles; Assistant is `--surface` with one sharp corner, User is `--accent` with mirrored sharp corner.
     7. `QuickReplyChip`: Pill chip with SVG line-art icon + text. STRICT RULE: NO EMOJIS.
     8. `YesNoCard`: Consultation diagnostic card with question text and two-state toggle buttons.
     9. `RxCard`: Visual centerpiece with tinted header (`--surface-tint`, remedy name + dose), body (home remedy), and embedded warning banner (`--warn-bg`/`--warn-ink`).
     10. `VideoLink`: Dashed outline pill with play icon, launching an in-app browser without leaving the chat.
     11. `TagChip`: Alternating chips: accent-tinted (`--surface-tint` + `--accent` text) vs neutral (`--surface` + `--ink-dim` text).
     12. `PlanStep`: Numbered step row with Sora numeral circle, title, description, and completion checkbox. Used only in Planner.
     13. `DoctorContactFooter`: Shared clinic card reading from `BrandingConfig.kt` with WhatsApp deep link (`https://wa.me/...`) and phone dialer intent (`tel:...`).

4. **Information Architecture & Screen Flows**:
   - Navigation routes:
     - `login` -> `home`
     - `home` -> `planner`, `disease_list`, `chatbot_query`
     - `disease_list` -> `chatbot_query?initialQuery={query}` (deep link on tap)
     - `chatbot_query` -> `chatbot_answer` (when intent is `direct_answer`)
     - `chatbot_query` -> `consultation` (when intent is `consultation`)
     - `consultation` -> `chatbot_answer` (after answering diagnostic questions)
     - `planner` -> back to `home`

5. **Realistic Homeopathy Mock Data**:
   - Comprehensive mock repository mirroring the backend knowledge base:
     - Acidity / GERD (SBL Nixocid, Robinia 30C, Jeera-Dhania water)
     - Migraine / Tension Headache (Belladonna 200C, Glonoinum, Gelsemium 30C)
     - Allergic Rhinitis (Allium Cepa 30C, Arsenicum Album 30C)
     - Insomnia (Passiflora Q, Coffea Cruda 30C)
     - Joint Pain & Arthritis (Rhus Tox 30C, Bryonia Alba 30C, Arnica 200C)
     - Eczema (Graphites 30C, Sulphur 30C)

---

## 3. Detailed Technical Specifications

### 3.1 Design System Tokens ("Trusted Teal")

| Token Name | Light Mode Hex / Value | Dark Mode Hex / Value | Jetpack Compose Color Expression | Visual Usage & Semantics |
|---|---|---|---|---|
| `--bg` | `#FFFFFF` | `#0A1418` | `LightBg = Color(0xFFFFFFFF)`<br>`DarkBg = Color(0xFF0A1418)` | Full-screen background |
| `--surface` | `#F7F9FB` | `#101E22` | `LightSurface = Color(0xFFF7F9FB)`<br>`DarkSurface = Color(0xFF101E22)` | Cards, assistant chat bubbles, text inputs |
| `--surface-tint` | `#EAF5F6` | `rgba(45,212,200,0.10)` | `LightSurfaceTint = Color(0xFFEAF5F6)`<br>`DarkSurfaceTint = Color(0x1A2DD4C8)` | Tip card bg, avatar container, tag chip tint |
| `--ink` | `#0F2027` | `#E7F1F3` | `LightInk = Color(0xFF0F2027)`<br>`DarkInk = Color(0xFFE7F1F3)` | High-emphasis primary headings and body text |
| `--ink-dim` | `#5C7480` | `#7E97A0` | `LightInkDim = Color(0xFF5C7480)`<br>`DarkInkDim = Color(0xFF7E97A0)` | Secondary text, captions, subtitles, placeholders |
| `--accent` | `#0E7C86` | `#2DD4C8` | `LightAccent = Color(0xFF0E7C86)`<br>`DarkAccent = Color(0xFF2DD4C8)` | Primary actions, links, active states, center FAB |
| `--accent-ink` | `#FFFFFF` | `#04211E` | `LightAccentInk = Color(0xFFFFFFFF)`<br>`DarkAccentInk = Color(0xFF04211E)` | Text/icons rendered on top of `--accent` |
| `--line` | `rgba(15,32,39,0.08)` | `rgba(231,241,243,0.10)` | `LightLine = Color(0x140F2027)`<br>`DarkLine = Color(0x1AE7F1F3)` | Card borders, dividers, chip outlines |
| `--warn-bg` | `#FFF0EC` | `rgba(230,126,34,0.14)` | `LightWarnBg = Color(0xFFFFF0EC)`<br>`DarkWarnBg = Color(0x24E67E22)` | Safety disclaimer box background ONLY |
| `--warn-ink` | `#A14A2A` | `#F0B074` | `LightWarnInk = Color(0xFFA14A2A)`<br>`DarkWarnInk = Color(0xFFF0B074)` | Safety disclaimer text and alert icon ONLY |

#### Material 3 Theme Integration Mapping
- **Light Theme**:
  ```kotlin
  val LightColorScheme = lightColorScheme(
      primary = Color(0xFF0E7C86),
      onPrimary = Color(0xFFFFFFFF),
      primaryContainer = Color(0xFFEAF5F6),
      onPrimaryContainer = Color(0xFF0E7C86),
      secondary = Color(0xFF0E7C86),
      onSecondary = Color(0xFFFFFFFF),
      secondaryContainer = Color(0xFFEAF5F6),
      onSecondaryContainer = Color(0xFF0F2027),
      background = Color(0xFFFFFFFF),
      onBackground = Color(0xFF0F2027),
      surface = Color(0xFFF7F9FB),
      onSurface = Color(0xFF0F2027),
      surfaceVariant = Color(0xFFEAF5F6),
      onSurfaceVariant = Color(0xFF5C7480),
      outline = Color(0x140F2027),
      error = Color(0xFFA14A2A),
      errorContainer = Color(0xFFFFF0EC),
      onError = Color(0xFFFFFFFF),
      onErrorContainer = Color(0xFFA14A2A)
  )
  ```
- **Dark Theme**:
  ```kotlin
  val DarkColorScheme = darkColorScheme(
      primary = Color(0xFF2DD4C8),
      onPrimary = Color(0xFF04211E),
      primaryContainer = Color(0x1A2DD4C8),
      onPrimaryContainer = Color(0xFF2DD4C8),
      secondary = Color(0xFF2DD4C8),
      onSecondary = Color(0xFF04211E),
      secondaryContainer = Color(0x1A2DD4C8),
      onSecondaryContainer = Color(0xFFE7F1F3),
      background = Color(0xFF0A1418),
      onBackground = Color(0xFFE7F1F3),
      surface = Color(0xFF101E22),
      onSurface = Color(0xFFE7F1F3),
      surfaceVariant = Color(0x1A2DD4C8),
      onSurfaceVariant = Color(0xFF7E97A0),
      outline = Color(0x1AE7F1F3),
      error = Color(0xFFF0B074),
      errorContainer = Color(0x24E67E22),
      onError = Color(0xFF04211E),
      onErrorContainer = Color(0xFFF0B074)
  )
  ```

---

### 3.2 Typography Specifications

#### Font Families & Weights
1. **Sora** (`GoogleFont("Sora")`):
   - Available weights: `FontWeight.Normal` (400), `FontWeight.Medium` (500), `FontWeight.SemiBold` (600), `FontWeight.Bold` (700).
   - Usage: App brand heading, screen titles (`h1`, `h2`), remedy title in `RxCard`, section headers, step numerals in `PlanStep`.
   - Distinctive style rule: Tight letter spacing of `-0.01em` (`letterSpacing = (-0.01).sp` or `-0.01 * size`).
2. **IBM Plex Sans** (`GoogleFont("IBM Plex Sans")`):
   - Available weights: `FontWeight.Normal` (400), `FontWeight.Medium` (500), `FontWeight.SemiBold` (600), `FontWeight.Bold` (700).
   - Usage: All body text, chat messages, input placeholders, quick reply chips, button labels, navigation labels, guidelines.

#### Compose Typography Style Mapping
- `headlineLarge` (h1 / app-h1): Sora Bold 700, 32sp, line height 40sp, letter spacing -0.32sp (-0.01em).
- `headlineMedium` (h2): Sora Bold 700, 24sp, line height 32sp, letter spacing -0.24sp (-0.01em).
- `headlineSmall` (h3): Sora SemiBold 600, 20sp, line height 28sp, letter spacing -0.20sp (-0.01em).
- `titleLarge` (Screen titles, RxCard remedy name): Sora Bold 700, 20sp, line height 26sp, letter spacing -0.20sp.
- `titleMedium` (Section titles, card headers): IBM Plex Sans SemiBold 600, 16sp, line height 24sp, letter spacing 0.15sp.
- `titleSmall` (Subsection titles): IBM Plex Sans SemiBold 600, 14sp, line height 20sp, letter spacing 0.1sp.
- `bodyLarge` (Chat bubbles, primary copy): IBM Plex Sans Regular 400, 16sp, line height 24sp, letter spacing 0.5sp.
- `bodyMedium` (Descriptions, remedy instructions): IBM Plex Sans Regular 400, 14sp, line height 20sp, letter spacing 0.25sp.
- `bodySmall` (Guidelines, timestamps, metadata): IBM Plex Sans Regular 400, 12sp, line height 16sp, letter spacing 0.4sp.
- `labelLarge` (Primary buttons, CTA text): IBM Plex Sans SemiBold 600, 14sp, line height 20sp, letter spacing 0.1sp.
- `labelMedium` (Chips, status tags, toggle options): IBM Plex Sans Medium 500, 12sp, line height 16sp, letter spacing 0.5sp.
- `labelSmall` (Badges, micro labels): IBM Plex Sans Medium 500, 11sp, line height 14sp, letter spacing 0.5sp.

---

### 3.3 Complete Inventory of 13 Reusable UI Components

| # | Component | Visual Anatomy & Styling | Input Parameters | Interaction & Navigation Behavior |
|---|---|---|---|---|
| 1 | `BrandRow` | Leaf line-art icon (stroke 1.5, `--accent`) + Sora 700 wordmark ("Healing Hands4U" in `--ink`). Optional greeting subtitle ("Welcome : {Username}"). | `title: String`, `subtitle: String?`, `showLeafIcon: Boolean = true`, `modifier: Modifier` | Optional click listener to navigate home or open clinic info. |
| 2 | `TipCard` | Card with `RoundedCornerShape(16.dp)`, `--surface-tint` bg. Contains indicator dot (`--accent`), category label, tip body text, and "Read more" link in `--accent`. | `category: String`, `body: String`, `onReadMoreClick: () -> Unit`, `modifier: Modifier` | Expands or navigates to daily holistic tip details. |
| 3 | `MiniCard` | Compact card with `RoundedCornerShape(12.dp)`, `--surface` bg, `--line` border. Stack of label (`--ink-dim`, 12sp), value (Sora Bold 20sp, `--ink`), and meta string (`--accent`). | `label: String`, `value: String`, `meta: String?`, `icon: ImageVector?`, `onClick: (() -> Unit)?`, `modifier: Modifier` | Displays summary stats in 2-up rows (e.g. active remedies, dose countdown). Tappable to navigate. |
| 4 | `TabBar` | Bottom navigation bar with `--surface` bg, top border in `--line`. 3 items: (1) Directory, (2) Center FAB, (3) Planner. Center FAB is elevated circle in `--accent` with chat icon in `--accent-ink`. | `currentRoute: String`, `onTabSelected: (String) -> Unit`, `onFabClick: () -> Unit`, `modifier: Modifier` | Switches between core screens; center FAB directly launches Chatbot Query screen. |
| 5 | `ChatHeader` | Header bar with back arrow, circular avatar in `--surface-tint` with doctor/bot line icon in `--accent`, assistant title in Sora 16sp, pulsing teal dot with "Replies in seconds". | `title: String = "Dr. Anjali's Assistant"`, `subtitle: String = "Replies in seconds"`, `onBackClick: () -> Unit`, `modifier: Modifier` | Handles back navigation and signals live chatbot availability. |
| 6 | `ChatBubble` | Rounded 14dp bubble. Assistant: `--surface` bg, `--ink` text, bottom-start sharp corner. User: `--accent` bg, `--accent-ink` text, bottom-end sharp corner. | `message: String`, `isUser: Boolean`, `timestamp: String?`, `modifier: Modifier` | Renders conversational turn with clean clinical styling and asymmetric corners. |
| 7 | `QuickReplyChip` | Pill chip with `RoundedCornerShape(50)`. Contains line-art SVG icon (`--accent`, stroke 1.5) + label in IBM Plex Sans Medium. STRICTLY NO EMOJIS. | `label: String`, `icon: ImageVector?`, `onClick: () -> Unit`, `modifier: Modifier` | Clicking instantly populates and executes query in chatbot. |
| 8 | `YesNoCard` | Diagnostic card with `--surface` bg, `--line` border. Displays question text in IBM Plex Sans 15sp, followed by two-button toggle: "Yes" vs "No". Selected option fills in `--accent`. | `questionId: String`, `questionText: String`, `selectedAnswer: String?`, `onAnswerSelected: (String) -> Unit`, `modifier: Modifier` | Used in Consultation flow; updates parent session state with user's diagnostic choices. |
| 9 | `RxCard` | Visual centerpiece of Answer screen. Header in `--surface-tint` with remedy name (Sora Bold) & dosage (IBM Plex Sans SemiBold). Body in `--surface` with home remedy. Embedded warning box in `--warn-bg` and `--warn-ink`. | `remedyName: String`, `dosage: String`, `homeRemedy: String?`, `safetyDisclaimer: String`, `modifier: Modifier` | Renders prescription remedy and alerts user to consult doctor if not cured within 2 days. |
| 10 | `VideoLink` | Pill button with dashed border in `--accent`, transparent/surface bg, play line-art icon, and text "Watch Remedy Guide Video". | `url: String`, `label: String = "Watch Remedy Guide"`, `onClick: (String) -> Unit`, `modifier: Modifier` | Launches Chrome Custom Tabs / in-app browser without leaving the chat conversation. |
| 11 | `TagChip` | Rounded pill chip with two alternating weight styles: (A) Accent-tinted (`--surface-tint` bg + `--accent` text/border), (B) Neutral (`--surface` bg + `--ink-dim` text). | `text: String`, `isAccentTint: Boolean`, `selected: Boolean`, `onClick: (() -> Unit)?`, `modifier: Modifier` | Prevents flat wall of identical chips in Disease Directory; filters condition cards. |
| 12 | `PlanStep` | Sequenced row with circular Sora numeral badge (e.g. "1", "2") in `--accent`, step title in Sora SemiBold, description in IBM Plex Sans, and completion checkbox. | `stepNumber: Int`, `title: String`, `description: String`, `timeSlot: String?`, `isCompleted: Boolean`, `onCompletedChange: (Boolean) -> Unit`, `modifier: Modifier` | Tracks daily remedy adherence; used exclusively in Planner where sequence matters. |
| 13 | `DoctorContactFooter` | Card with `--surface` bg, doctor avatar, Dr. Anjali Jariwala details from `BrandingConfig`, location with pin icon, solid `--accent` WhatsApp button & dialer button. | `doctorName: String`, `qualifications: String`, `clinicAddress: String`, `phoneNumber: String`, `modifier: Modifier` | Embedded on all content screens. 1-click launch of WhatsApp (`wa.me`) or phone dialer (`tel:`). |

#### Strict Icon Guidelines
- **Zero Emojis**: Emojis (e.g. 💊, 🌿, 🩺, 📱) are strictly forbidden across all screens and chips per PRD Addendum §Explicit rule carried over from design review.
- **Line-Art SVG Only**: Every icon must be drawn as a clean vector line-art icon matching stroke-width `1.4–1.8 dp/px`, with rounded line caps/joins and unfilled interiors (fills permitted only on solid accent buttons like the center FAB or WhatsApp button).

---

### 3.4 Information Architecture & Screen Specifications (6 Core Screens)

```
                       ┌───────────────────────┐
                       │     Screen.Login      │
                       │ (OTP / Google / Guest)│
                       └───────────┬───────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │      Screen.Home      │
                       │   (Home Dashboard)    │
                       └─────┬─────┬─────┬─────┘
                             │     │     │
            ┌────────────────┘     │     └────────────────┐
            ▼                      ▼                      ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
│     Screen.Planner    │ │Screen.ChatbotQuery│ │  Screen.DiseaseList   │
│ (Personalized Planner)│ │ (Text/Voice Input)│ │  (Disease Directory)  │
└───────────────────────┘ └────────┬──────────┘ └───────────┬───────────┘
                                   │                        │
                   ┌───────────────┴───────────────┐        │ (tap condition card
                   │                               │        │  pre-fills query)
                   ▼ (Direct Answer Intent)        ▼        ▼
       ┌───────────────────────┐       ┌───────────────────────┐
       │  Screen.ChatbotAnswer │       │  Screen.Consultation  │
       │   (RxCard / Safety)   │◄──────┤ (Yes/No Diagnostic)   │
       └───────────────────────┘       └───────────────────────┘
```

#### 1. Home Dashboard Screen (`Screen.Home`)
- **Top Bar / Header**: `BrandRow` with leaf icon + "Healing Hands4U" wordmark. Welcome banner: `"Welcome : {Username}"` in `--surface-tint` container with doctor subtext.
- **Daily Tip**: `TipCard` with holistic tip: e.g. *"Morning Digestion: Drink warm water with lemon & raw honey to stimulate digestive enzymes."*
- **Planner Summary**: 2-up `MiniCard` row:
  - MiniCard 1: Label: *"Today's Remedies"*, Value: *"3 Active"*, Meta: *"Next at 2:00 PM"*.
  - MiniCard 2: Label: *"Adherence Streak"*, Value: *"5 Days"*, Meta: *"80% completed"*.
- **3 Core Navigation Cards** (per wireframe and PRD §4):
  1. *Holistic Healing Card*: Title: `"Holistic Healing"`, Subtitle: `"Combining Homeopathy, Naturopathy and Breathing"`, routes to `Screen.Planner`.
  2. *Chat with Doctor Card*: Title: `"Chat with Dr. Anjali Now"`, Subtitle: `"Get quick resolution of your queries with our AI engine"`, routes to `Screen.ChatbotQuery`.
  3. *One Stop Solution Card*: Title: `"One Stop Solution"`, Subtitle: `"Cure Lifestyle Disease, Chronic Illness, Kids Behavior"`, routes to `Screen.DiseaseList`.
- **Doctor Contact Footer**: Embedded `DoctorContactFooter` at the bottom.
- **Bottom Navigation**: `TabBar` with Directory / Center FAB (Chat) / Planner.

#### 2. Disease Directory Screen (`Screen.DiseaseList`)
- **Header**: `BrandRow` + Screen Title: `"Cure Your Disease Forever without side effects for Allopathy medicines"` in Sora Bold.
- **Search Bar**: Live query input with line-art search icon and clear button.
- **Category Filter Chips**: Horizontal row of `TagChip`s with alternating accent-tint and neutral styling: `"All"`, `"Respiratory"`, `"Digestive"`, `"Skin"`, `"Joints"`, `"Stress & Sleep"`, `"Women's Health"`.
- **Condition List / Tag Cloud**:
  - Displays ailment cards for: *Acid Reflux (GERD), Tension Headache & Migraine, Allergic Rhinitis, Insomnia & Restlessness, Joint Pain & Osteoarthritis, Eczema, PCOD / PCOS, Kidney Stone*.
  - Each card shows condition name, primary remedies (e.g. *Nux Vomica 30C, Robinia 30C*), primary symptoms, and general dosage guideline.
- **Integration**: Tapping any card navigates to `Screen.ChatbotQuery` with argument `?initialQuery=I want to know about {conditionName}`.
- **Footer**: Embedded `DoctorContactFooter`.

#### 3. Personalized Planner Screen (`Screen.Planner`)
- **Header**: `BrandRow` + Screen Title: `"Personalized Health Planner"` + Back button.
- **Summary Metrics**: 2-up `MiniCard`s showing daily completed doses and active remedies.
- **Remedy Schedule Section**: Numbered `PlanStep` sequence:
  1. Step 1: Numeral *"1"*, Title: *"Morning (Before Breakfast)"*, Description: *"Arnica Montana 30C — 4 pills under tongue on clean palate"*, Checkbox.
  2. Step 2: Numeral *"2"*, Title: *"Afternoon (Post Lunch)"*, Description: *"Nux Vomica 200C — 4 pills 30 mins after meals"*, Checkbox.
  3. Step 3: Numeral *"3"*, Title: *"Night (Bedtime)"*, Description: *"Passiflora Incarnata Q — 10 drops in warm water"*, Checkbox.
- **Holistic Wellness Modules**:
  - *Breathing Techniques*: Anulom Vilom Pranayama (10 mins morning/evening).
  - *Yoga Exercise*: Gentle restorative stretches (Balasana & Sukhasana, 15 mins).
  - *Dietary Guidelines*: Homeopathic dietary precautions card (avoid raw onion, garlic, menthol, camphor, strong coffee 30 mins before/after remedies; store away from sunlight).
  - *Daily Affirmation*: *"My body possesses innate healing energy. Each day brings vitality and balance."*
- **Footer**: Embedded `DoctorContactFooter`.

#### 4. Chatbot Query Screen (`Screen.ChatbotQuery`)
- **Header**: `ChatHeader` with back navigation, Dr. Anjali's Assistant avatar, and status dot ("Replies in seconds").
- **Welcome / Prompt**: Headline in Sora: *"How can we help you today?"*, Subtitle: *"Type your query or speak in any language"*.
- **Quick Reply Chips**: Horizontal scroll of `QuickReplyChip`s (line-art SVGs, no emojis):
  - [Pill icon] *"Acidity & Heartburn"*
  - [Pulse icon] *"Throbbing Headache"*
  - [Leaf icon] *"Sneezing & Allergy"*
  - [Moon icon] *"Sleep Restlessness"*
- **Query Input Area**:
  - Multiline text field in `--surface` with `--line` border, placeholder: `"Type your Query or Speak"`.
  - Line-art microphone icon button. Tapping mic activates voice capture UI with pulsing audio indicator.
- **Dual Intent Selection Buttons** (verbatim from wireframe):
  1. Button A: `"I want answer now"` -> Direct-Answer flow (submits with intent `direct_answer`).
  2. Button B: `"I would like to Cooperate for online consultation"` -> Guided consultation flow (submits with intent `consultation`).
- **Footer**: Embedded `DoctorContactFooter`.

#### 5. Consultation Screen (`Screen.Consultation`)
- **Header**: `ChatHeader` with consultation session indicator.
- **Instruction Header**: Sora Bold 20sp: `"Please answer following to help you better"`.
- **Query Recap**: Chat bubble displaying the user's initial query (e.g. *"I am suffering acidity"*).
- **Diagnostic Yes/No Questions**:
  - Renders dynamic `YesNoCard`s pulled from consultation query schema:
    - Card 1: *"Did you eat outside food recently?"* [Yes] [No]
    - Card 2: *"Do you have stress currently?"* [Yes] [No]
    - Card 3: *"Is this acidity from long time?"* [Yes] [No]
- **Submit Action**: Button in `--accent`: `"Submit Answers & Get Remedy"`. Enabled when all diagnostic questions have a selected response.
- **Navigation**: On submit, transitions to `Screen.ChatbotAnswer`.
- **Footer**: Embedded `DoctorContactFooter`.

#### 6. Chatbot Answer Screen (`Screen.ChatbotAnswer`)
- **Header**: `ChatHeader` or TopAppBar: `"Your Personalized Healing Plan"`.
- **Query / Outcome Summary**: Assistant bubble recapping the diagnosis.
- **`RxCard` (Visual Centerpiece)**:
  - Top header in `--surface-tint`: Remedy name in Sora Bold 18sp (e.g. *"SBL Nixocid"* or *"Belladonna 200C & Glonoinum"*), dosage in IBM Plex Sans SemiBold 14sp (e.g. *"2 pills 3 times a day"*).
  - Body in `--surface`: Home remedy instructions (e.g. *"Also take Jeera and Dhania soaked water 2 times a day"*).
  - Safety Warning Box: Styled in `--warn-bg` (`#FFF0EC` light / `0x24E67E22` dark) with `--warn-ink` text (`#A14A2A` light / `#F0B074` dark): *"If disease does not cure within 2 days then consult doctor right now"*.
- **`VideoLink`**: Dashed pill in `--accent` (e.g. *"Watch Remedy Explanation Video"*). Tapping launches Chrome Custom Tabs in-app browser.
- **Voice Playback Bar**: If query was initiated via voice, renders audio play/pause controls.
- **Doctor Contact Action**: Embedded `DoctorContactFooter` with primary WhatsApp CTA button: `"Message for Appointment Now"`.

---

### 3.5 Realistic Homeopathy Mock Dataset

```kotlin
object MockHomeopathyData {
    // 1. Disease Directory Items
    val diseases = listOf(
        DiseaseItem(
            id = "d1",
            name = "Acid Reflux & GERD",
            category = "Digestive",
            primaryRemedies = "SBL Nixocid, Robinia 30C, Nux Vomica 30C",
            symptoms = "Heartburn, sour belching, epigastric burning after meals",
            dosageGuideline = "4 pills 20 minutes before meals or after heavy food",
            videoUrl = "https://example.com/videos/acid-reflux"
        ),
        DiseaseItem(
            id = "d2",
            name = "Migraine & Tension Headache",
            category = "Stress & Sleep",
            primaryRemedies = "Belladonna 200C, Glonoinum 30C, Spigelia 30C",
            symptoms = "Throbbing one-sided pain, light sensitivity, nausea",
            dosageGuideline = "3 pellets twice daily for acute episodes",
            videoUrl = "https://example.com/videos/migraine-relief"
        ),
        DiseaseItem(
            id = "d3",
            name = "Allergic Rhinitis (Hay Fever)",
            category = "Respiratory",
            primaryRemedies = "Allium Cepa 30C, Arsenicum Album 30C, Sabadilla 30C",
            symptoms = "Sneezing, watery eyes, clear runny nose, tickling in throat",
            dosageGuideline = "4 pills 3 times daily during acute attacks",
            videoUrl = "https://example.com/videos/rhinitis"
        ),
        DiseaseItem(
            id = "d4",
            name = "Insomnia & Restlessness",
            category = "Stress & Sleep",
            primaryRemedies = "Passiflora Incarnata Q, Coffea Cruda 30C, Kali Phos 6X",
            symptoms = "Racing mind, difficulty falling asleep, midnight awakenings",
            dosageGuideline = "10 drops Passiflora Q in 1/4 cup warm water at bedtime",
            videoUrl = "https://example.com/videos/insomnia"
        ),
        DiseaseItem(
            id = "d5",
            name = "Joint Pain & Osteoarthritis",
            category = "Joints",
            primaryRemedies = "Rhus Tox 30C, Bryonia Alba 30C, Arnica 200C",
            symptoms = "Stiffness on first movement, aching during weather changes",
            dosageGuideline = "4 pills morning and evening with warm water",
            videoUrl = "https://example.com/videos/joint-pain"
        ),
        DiseaseItem(
            id = "d6",
            name = "Eczema & Atopic Dermatitis",
            category = "Skin",
            primaryRemedies = "Graphites 30C, Sulphur 30C, Mezereum 30C",
            symptoms = "Dry cracked patches, intense itching worse at night, scaling",
            dosageGuideline = "4 pills once daily in morning on an empty stomach",
            videoUrl = "https://example.com/videos/eczema"
        ),
        DiseaseItem(
            id = "d7",
            name = "PCOD & Hormonal Irregularity",
            category = "Women's Health",
            primaryRemedies = "Pulsatilla 30C, Sepia 200C, Thuja Occidentalis 30C",
            symptoms = "Delayed cycles, hormonal breakouts, mood fluctuations",
            dosageGuideline = "4 pills weekly once or as advised by physician",
            videoUrl = "https://example.com/videos/pcod"
        )
    )

    // 2. Consultation Diagnostic Questions & Branches
    val acidityConsultation = ConsultationData(
        conditionId = "acidity",
        conditionName = "Acidity & GERD",
        diagnosticQuestions = listOf(
            DiagnosticQuestion("q1", "Did you eat outside food recently?"),
            DiagnosticQuestion("q2", "Do you have stress currently?"),
            DiagnosticQuestion("q3", "Is this acidity from long time?")
        ),
        branches = mapOf(
            "yes_yes_yes" to ResolvedRemedy(
                remedyName = "SBL Nixocid & Nux Vomica 200C",
                dosage = "Take 2 pills of Nixocid twice daily and Nux Vomica at bedtime",
                homeRemedy = "Jeera and Dhania soaked water 2 times a day. Avoid spicy/fried food.",
                safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now",
                videoUrl = "https://example.com/videos/acidity-chronic"
            ),
            "yes_no_no" to ResolvedRemedy(
                remedyName = "Robinia 30C & Carbo Veg 30C",
                dosage = "Take 4 pills 20 minutes before meals for 3 days",
                homeRemedy = "Cold milk in small sips and soaked fennel seed water.",
                safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now",
                videoUrl = "https://example.com/videos/acidity-acute"
            ),
            "default" to ResolvedRemedy(
                remedyName = "SBL Nixocid 2 pills a day",
                dosage = "2 pills twice daily after meals",
                homeRemedy = "Jeera and Dhania soaked water 2 times a day",
                safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now",
                videoUrl = "https://example.com/videos/acidity-guide"
            )
        )
    )

    // 3. Planner Schedule & Lifestyle Data
    val plannerRemedySteps = listOf(
        PlannerStepItem(1, "Morning (Before Breakfast)", "Arnica Montana 30C", "4 pills dissolve under tongue", "Clean palate, 30 mins before breakfast"),
        PlannerStepItem(2, "Afternoon (Post Lunch)", "Nux Vomica 200C", "4 pills", "Take 30 mins after lunch with sips of water"),
        PlannerStepItem(3, "Night (Bedtime)", "Passiflora Incarnata Q", "10 drops in 1/4 cup warm water", "Take right before sleeping for restorative rest")
    )
}
```

---

## 4. Specification Miner Tables

### Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Theme & Tokens | "Trusted Teal" Light Palette | Exact light hex colors for surface (`#F7F9FB`), background (`#FFFFFF`), primary accent (`#0E7C86`), ink (`#0F2027`), ink-dim (`#5C7480`), line (`0x140F2027`), warn-bg (`#FFF0EC`), warn-ink (`#A14A2A`). | MaterialTheme color token requests | Harmonious clinical teal/slate palette | Fallback to default Material3 tokens | PRD v3 §Addendum: Visual Design System |
| 2 | Theme & Tokens | "Trusted Teal" Dark Palette | Calibrated dark palette: surface (`#101E22`), background (`#0A1418`), accent (`#2DD4C8`), accent-ink (`#04211E`), ink (`#E7F1F3`), ink-dim (`#7E97A0`), line (`0x1AE7F1F3`), warn-bg (`0x24E67E22`), warn-ink (`#F0B074`). | Dark theme system setting or parameter | High-contrast low-light teal UI | Fallback to light theme if dark values missing | PRD v3 §Addendum: Visual Design System |
| 3 | Typography | Sora Font for Headings | Google Font Sora configured for weights 400-700 with `-0.01em` letter spacing for all headings, brand titles, and remedy names. | Text composables requesting headline/title styles | Distinctive rounded geometric clinical headings | Falls back to system sans-serif font | PRD v3 §Addendum Typography |
| 4 | Typography | IBM Plex Sans for Body | Google Font IBM Plex Sans configured for weights 400-700 for all UI labels, body text, buttons, chips, and metadata. | Text composables requesting body/label styles | Clean, highly legible sans-serif body copy | Falls back to system sans-serif font | PRD v3 §Addendum Typography |
| 5 | Component | `BrandRow` | Leaf line-art icon + Sora 700 wordmark ("Healing Hands4U") for screen headers. | `title: String`, `subtitle: String?`, `showLeafIcon: Boolean` | Composable header row | Ellipsize text on narrow screens | PRD v3 Component Inventory & Wireframe |
| 6 | Component | `TipCard` | 16dp rounded card with `--surface-tint` bg, indicator dot, category tag, tip body, and "Read more" action. | `category: String`, `body: String`, `onReadMoreClick: () -> Unit` | Holistic wellness tip card | Truncates body with Read More expansion | PRD v3 Component Inventory |
| 7 | Component | `MiniCard` | 2-up metrics card showing label, value (Sora Bold 20sp), and meta subtext in `--surface` with `--line` border. | `label: String`, `value: String`, `meta: String?`, `icon: ImageVector?` | Metric card for planner & dashboard | Handles long values by wrapping or scaling down | PRD v3 Component Inventory |
| 8 | Component | `TabBar` | 3-item bottom bar with Directory, Center FAB in `--accent`, and Planner. | `currentRoute: String`, `onTabSelected: (String) -> Unit`, `onFabClick: () -> Unit` | Bottom navigation bar with elevated FAB | Retains selection state | PRD v3 Component Inventory |
| 9 | Component | `ChatHeader` | Header bar with back button, avatar in `--surface-tint`, title in Sora, and pulsing status dot ("Replies in seconds"). | `title: String`, `subtitle: String`, `onBackClick: () -> Unit` | Header for chatbot screens | Truncates title safely on small widths | PRD v3 Component Inventory |
| 10 | Component | `ChatBubble` | Asymmetric 14dp bubble: Assistant (`--surface`, bottom-start sharp corner) vs User (`--accent`, bottom-end sharp corner). | `message: String`, `isUser: Boolean`, `timestamp: String?` | Styled chat message bubble | Wraps text cleanly with max width constraint | PRD v3 Component Inventory |
| 11 | Component | `QuickReplyChip` | Pill chip with line-art SVG icon + text. STRICTLY NO EMOJIS. | `label: String`, `icon: ImageVector?`, `onClick: () -> Unit` | Interactive query suggestion pill | Disables duplicate clicks during transit | PRD v3 Component Inventory |
| 12 | Component | `YesNoCard` | Diagnostic consultation card with question text and two-state toggle buttons ("Yes" / "No"). | `questionId: String`, `questionText: String`, `selectedAnswer: String?`, `onAnswerSelected: (String) -> Unit` | Interactive diagnostic card | Unselected state displays subtle border | PRD v3 Component Inventory |
| 13 | Component | `RxCard` | Prescription card with `--surface-tint` header (remedy name + dose), body (home remedy), and embedded warning box. | `remedyName: String`, `dosage: String`, `homeRemedy: String?`, `safetyDisclaimer: String` | Prescription display card | Always displays safety disclaimer | PRD v3 Component Inventory |
| 14 | Component | `VideoLink` | Pill button with dashed `--accent` border and play icon to open external video guide in-app. | `url: String`, `label: String`, `onClick: (String) -> Unit` | Tappable link button | Handles null/empty url gracefully | PRD v3 Component Inventory & §6.6 |
| 15 | Component | `TagChip` | Alternating disease category pill chips (accent-tinted vs neutral) to prevent flat visual walls. | `text: String`, `isAccentTint: Boolean`, `selected: Boolean`, `onClick: () -> Unit` | Visual category filter chip | Default to neutral style if unassigned | PRD v3 Component Inventory |
| 16 | Component | `PlanStep` | Sequenced step row with circular Sora numeral badge, title, description, and completion checkbox. | `stepNumber: Int`, `title: String`, `description: String`, `timeSlot: String?`, `isCompleted: Boolean` | Sequenced schedule row | Checkbox state toggles locally | PRD v3 Component Inventory |
| 17 | Component | `DoctorContactFooter` | Reusable clinic card reading from `BrandingConfig.kt` with WhatsApp deep link and phone dialer intent. | `doctorName: String`, `qualifications: String`, `clinicAddress: String`, `phoneNumber: String` | Persistent footer component | Catches `ActivityNotFoundException` | PRD v3 §4 & BrandingConfig |
| 18 | Screen | Home Dashboard | Entry hub featuring `BrandRow`, welcome banner, daily `TipCard`, 2-up `MiniCard`s, 3 navigation cards, and footer. | None (reads state) | Composable screen (`Screen.Home`) | Handles scroll on small devices | PRD v3 §4 & Wireframe |
| 19 | Screen | Disease Directory | Ailment directory with search bar, `TagChip` filters, remedy cards, and deep linking to Chatbot. | None | Composable screen (`Screen.DiseaseList`) | Shows empty state text if no matches | PRD v3 §5.4 & Wireframe |
| 20 | Screen | Personalized Planner | Daily remedy tracking with sequenced `PlanStep` rows, breathing, yoga, and dietary precautions. | None | Composable screen (`Screen.Planner`) | Preserves checkbox toggles in memory | PRD v3 §5.3 & Wireframe |
| 21 | Screen | Chatbot Query | Query input screen supporting text and voice with dual intent buttons ("I want answer now" vs "Consultation"). | `initialQuery: String` | Composable screen (`Screen.ChatbotQuery`) | Disables submit button when query empty | PRD v3 §5.5 & Wireframe |
| 22 | Screen | Consultation Q&A | Diagnostic Yes/No Q&A screen dynamically rendering `YesNoCard`s and capturing diagnostic answers. | `conditionId: String`, `queryText: String` | Composable screen (`Screen.Consultation`) | Submit enabled only when all answered | PRD v3 §5.6 & Wireframe |
| 23 | Screen | Chatbot Answer | Final answer screen displaying `RxCard` (remedy, dosage, home remedy, safety line), `VideoLink`, and WhatsApp CTA. | Answer model or mock params | Composable screen (`Screen.ChatbotAnswer`) | Video link omitted if null | PRD v3 §5.7 & Wireframe |

---

### Edge Cases

| # | Feature | Input / Condition | Observed / Documented Behavior |
|---|---|---|---|
| 1 | `DoctorContactFooter` | WhatsApp not installed on user's device | An `ActivityNotFoundException` is caught; a user-friendly Toast is displayed rather than crashing the application. |
| 2 | `DoctorContactFooter` | Phone number contains non-digit formatting characters (`+`, spaces, dashes) | Cleaned number (`replace("+", "").replace(" ", "").trim()`) is passed to `https://wa.me/{cleanNumber}`. |
| 3 | `DiseaseDirectory` | User enters search term that matches zero conditions or remedies | Displays empty state message: *"No matching conditions found. Consult our AI Doctor or Dr. Anjali Jariwala directly."* |
| 4 | `ChatbotQuery` | User submits with blank/whitespace query string | Submit buttons are disabled (`enabled = queryText.isNotBlank()`); form prevents empty submission. |
| 5 | `ChatbotQuery` | Voice input button tapped without microphone hardware permission | Audio capture falls back to text input gracefully without crashing. |
| 6 | `ConsultationScreen` | User attempts to submit before answering all diagnostic Yes/No questions | Submit button remains disabled until all `diagnosticQuestions` have a recorded "yes" or "no" selection. |
| 7 | `RxCard` | Answer payload has `videoUrl = null` or empty string | `VideoLink` component is automatically suppressed from the layout. |
| 8 | `Typography` | Google Fonts cannot be downloaded (offline testing / Robolectric / no Play Services) | Falls back safely to bundled fallback or system `FontFamily.SansSerif` without crashing the Compose test runner. |
| 9 | `Dark Mode Rendering` | System switches to dark mode while viewing safety disclaimer | Warning box does not invert to neon; uses calibrated `0x24E67E22` (14% orange) background with `#F0B074` warm amber text for optimal readability. |
| 10 | `Screen Navigation` | User deep-links from Disease Directory to Chatbot Query | Pre-fills query text field with `"I want to know about {Disease Name}"` and enables immediate submission. |

---

## 5. Caveats

1. **Private Claude Artifact**: The URL referenced in PRD v3 (`https://claude.ai/artifact/9FxzrpzjLt2km2MXf8bNaf`) is a private artifact and returns HTTP 403. Per the explicit instruction in PRD v3 (§Addendum note: *"Treat the tokens and structure below as the source of truth regardless of link access"*), the token definitions and component specifications in the PRD text are the authoritative source.
2. **Google Fonts in Local Unit Tests**: Google Fonts via `GoogleFont.Provider` requires Google Play Services at runtime. When running Compose tests under Robolectric on macOS/Linux build nodes, downloadable fonts will fail unless an offline fallback or local font family is provided. The implementation must include a fallback to `FontFamily.SansSerif` for test environments.
3. **Existing Milestone 2 Unit Test Failures**: Running `./gradlew testDebugUnitTest` shows two existing test failures in `ChallengerAdversarialTest.kt` regarding category filtering in `DiseaseListScreen`. These were caused by older test assumptions and will be replaced/updated during the new UI implementation.

---

## 6. Conclusion

The specification mining for the Healing Hands4U Android UI is complete. All authoritative tokens, typography parameters, 13 reusable UI components, and 6 core screen flows have been fully identified, cross-referenced between PRD v3, the founder wireframe diagram, and the existing backend data models. The specifications provide an exact, unambiguous blueprint for the frontend development team to implement the "Trusted Teal" design system and all required screens.

---

## 7. Verification Method

1. **Verify Token & Typography Definitions**:
   - Inspect `/Users/aditya/Downloads/Healing-Hands4U-PRD-v3.md` lines 463–508.
   - Verify that all 10 color tokens match the hex values documented in Section 3.1.
   - Verify that Sora and IBM Plex Sans are specified as the two primary typefaces.
2. **Verify Component Inventory & Emoji Prohibition**:
   - Inspect PRD v3 lines 490–508 and verify all 13 components are listed with line-art SVG requirement.
   - Inspect `/Users/aditya/Downloads/Untitled-2026-09-06-1544.svg` to verify the wireframe layouts match the component specifications.
3. **Verify Codebase Test Commands**:
   - Run `./gradlew assembleDebug` to verify project compilation.
   - Run `./gradlew testDebugUnitTest` to execute Robolectric Compose UI test runner.
