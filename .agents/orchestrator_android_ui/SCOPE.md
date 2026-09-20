# Scope: Android Jetpack Compose UI (PRD v3)

## Architecture
This project track implements the complete visual frontend for the Healing Hands4U Android application in Jetpack Compose based on the PRD v3 specification and founder wireframe.

### Key Architectural Pillars:
1. **Design System ("Trusted Teal")**:
   - Strictly implements the 10 PRD v3 color tokens for both Light Mode and Dark Mode.
   - Dark mode provides elevated contrast with slate teal surfaces (`#101E22` on `#0A1418`), vibrant cyan-teal accent (`#2DD4C8` on `#04211E`), and calibrated amber safety warnings (`0x24E67E22` / `#F0B074`).
   - Dual-font typography: **Sora** (Bold 700, -0.01em) for headings, brand titles, and remedy names; **IBM Plex Sans** (400–700) for all body copy, UI controls, and chips. Safe fallback for offline Robolectric tests.
2. **Reusable UI Component Library (13 Components)**:
   - `BrandRow`, `TipCard`, `MiniCard`, `TabBar` (bottom nav with center FAB), `ChatHeader`, `ChatBubble` (asymmetric 14dp), `QuickReplyChip`, `YesNoCard`, `RxCard` (visual centerpiece), `VideoLink` (dashed pill), `TagChip` (alternating tint weights), `PlanStep` (sequenced Sora numerals), and `DoctorContactFooter` (centralized clinic card with WhatsApp and dialer).
   - Strict rule: Line-art SVG vector drawables only (stroke 1.4–1.8 dp). ZERO emojis.
3. **Core Application Screens with Realistic Mock Data**:
   - 6 Core screens: Home Dashboard (`Screen.Home`), Disease Directory (`Screen.DiseaseList`), Personalized Planner (`Screen.Planner`), Chatbot Query (`Screen.ChatbotQuery`), Consultation Q&A (`Screen.Consultation`), and Chatbot Answer (`Screen.ChatbotAnswer`).
   - Wired seamlessly using Jetpack Compose Navigation (`AppNavHost`).
   - Rich mock dataset (`MockHomeopathyData`) covering GERD, Migraines, Allergic Rhinitis, Insomnia, Arthritis, Eczema, PCOD, diagnostic Q&A trees, and daily remedy schedules.
4. **Programmatic Compose UI Testing & Verification**:
   - Local JVM-based testing with Robolectric 4.11.1 and `androidx.compose.ui:ui-test-junit4`.
   - Comprehensive test suites verifying Home, Chatbot (Query, Consultation, Answer), and Disease Directory screens.
   - Explicit tests verifying crash-free rendering in both Light and Dark mode.
   - Explicit verification that `DoctorContactFooter` renders correctly on content screens.
   - 100% clean test pass across all unit and Compose UI test classes.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | "Trusted Teal" Light Palette | Light mode color tokens (`--bg`, `--surface`, `--surface-tint`, `--ink`, `--ink-dim`, `--accent`, `--accent-ink`, `--line`, `--warn-bg`, `--warn-ink`) | M1 | PRD v3 §Addendum |
| 2 | "Trusted Teal" Dark Palette | Calibrated dark tokens (slate surfaces `#101E22`, vibrant teal `#2DD4C8`, amber warning) | M1 | PRD v3 §Addendum |
| 3 | Sora Heading Typography | Sora Bold 700 with `-0.01em` letter-spacing for headings & brand titles with safe offline fallback | M1 | PRD v3 §Addendum |
| 4 | IBM Plex Sans Body Typography | IBM Plex Sans (400-700) for body, labels, chips, and guidelines with safe offline fallback | M1 | PRD v3 §Addendum |
| 5 | Line-Art Vector Drawables | SVG vector icons for leaf, pills, pulse, play, mic, chat, doctor, calendar (zero emojis) | M1 | PRD v3 §Addendum |
| 6 | `BrandRow` Component | Leaf line-art icon + Sora 700 wordmark ("Healing Hands4U") and optional greeting | M1 | PRD v3 §Addendum |
| 7 | `TipCard` Component | 16dp rounded card, `--surface-tint` bg, indicator dot, category tag, tip body, and Read More | M1 | PRD v3 §Addendum |
| 8 | `MiniCard` Component | 2-up metrics card showing label, value (Sora Bold 20sp), and meta subtext in `--surface` | M1 | PRD v3 §Addendum |
| 9 | `TabBar` Component | Bottom navigation bar with Directory, Center FAB in `--accent`, and Planner | M1 | PRD v3 §Addendum |
| 10 | `ChatHeader` Component | Top bar with back button, avatar in `--surface-tint`, Sora title, and status dot ("Replies in seconds") | M1 | PRD v3 §Addendum |
| 11 | `ChatBubble` Component | Asymmetric 14dp bubble: Assistant (`--surface`) vs User (`--accent`) | M1 | PRD v3 §Addendum |
| 12 | `QuickReplyChip` Component | Pill chip with line-art SVG icon + text (strictly NO emojis) | M1 | PRD v3 §Addendum |
| 13 | `YesNoCard` Component | Diagnostic consultation card with question text and two-state toggle buttons ("Yes" / "No") | M1 | PRD v3 §Addendum |
| 14 | `RxCard` Component | Centerpiece card: `--surface-tint` header (remedy + dose), body (home remedy), and warning box | M1 | PRD v3 §Addendum |
| 15 | `VideoLink` Component | Pill button with dashed `--accent` border and play icon for in-app video guide | M1 | PRD v3 §Addendum |
| 16 | `TagChip` Component | Alternating disease category pill chips (accent-tinted vs neutral) | M1 | PRD v3 §Addendum |
| 17 | `PlanStep` Component | Sequenced step row with circular Sora numeral badge, title, description, and checkbox | M1 | PRD v3 §Addendum |
| 18 | `DoctorContactFooter` Component | Centralized clinic card with WhatsApp deep link and phone dialer intent | M1 | PRD v3 §Addendum |
| 19 | Realistic Mock Homeopathy Data | Mock dataset with conditions, remedies, diagnostic Q&A trees, and daily planner schedules | M1 | PRD v3 §6 & Fixtures |
| 20 | Core Screens & Navigation Integration | Home Dashboard, Disease Directory, Personalized Planner, Chatbot Query, Consultation, Chatbot Answer | M1 | PRD v3 §4, §5 & Wireframe |
| 21 | Programmatic Compose UI Tests | Automated tests for Home, Disease Directory, and Chatbot screens (Query, Consultation, Answer) | M2 | ORIGINAL_REQUEST §Acceptance |
| 22 | Light & Dark Mode Render Tests | Automated verification that core screens render in both Light and Dark modes without crashing | M2 | ORIGINAL_REQUEST §Acceptance |
| 23 | Content Screen Footer Verification | Automated assertions that `DoctorContactFooter` renders correctly on content screens | M2 | ORIGINAL_REQUEST §Acceptance |
| 24 | Adversarial & Semantic Selector Fix | Fix for selector collisions in `ChallengerAdversarialTest.kt` to ensure 100% clean test suite run | M2 | Testing Explorer Report |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Trusted Teal Theme, Components & Core Screens | Features 1–20: Color tokens (Light/Dark), Sora/IBM Plex Sans typography, line-art SVG icons, 13 reusable UI components, realistic mock data, and 6 core screens with Compose Navigation | none | DONE |
| M2 | Compose UI Test Suite & Verification | Features 21–24: `ChatbotScreenTest`, `ThemeModeRenderTest`, content screen footer assertions, selector scoping fix for `ChallengerAdversarialTest`, and 100% clean Gradle test pass | M1 | DONE |
| M3 | Multi-Agent Review, Challenge & Forensic Audit | Independent reviews (2x), empirical adversarial verification (2x), forensic integrity audit (1x), polish pass, and Gate approval | M1, M2 | DONE |

---

## Interface Contracts
- `Theme.kt`: `HealingHandsTheme(darkTheme: Boolean = isSystemInDarkTheme(), dynamicColor: Boolean = false, content: @Composable () -> Unit)`
- `BrandRow`: `BrandRow(title: String, subtitle: String? = null, showLeafIcon: Boolean = true, modifier: Modifier = Modifier)`
- `TipCard`: `TipCard(category: String, body: String, onReadMoreClick: () -> Unit, modifier: Modifier = Modifier)`
- `MiniCard`: `MiniCard(label: String, value: String, meta: String? = null, icon: ImageVector? = null, onClick: (() -> Unit)? = null, modifier: Modifier = Modifier)`
- `TabBar`: `TabBar(currentRoute: String, onTabSelected: (String) -> Unit, onFabClick: () -> Unit, modifier: Modifier = Modifier)`
- `ChatHeader`: `ChatHeader(title: String = "Dr. Anjali's Assistant", subtitle: String = "Replies in seconds", onBackClick: () -> Unit, modifier: Modifier = Modifier)`
- `ChatBubble`: `ChatBubble(message: String, isUser: Boolean, timestamp: String? = null, modifier: Modifier = Modifier)`
- `QuickReplyChip`: `QuickReplyChip(label: String, icon: ImageVector? = null, onClick: () -> Unit, modifier: Modifier = Modifier)`
- `YesNoCard`: `YesNoCard(questionId: String, questionText: String, selectedAnswer: String?, onAnswerSelected: (String) -> Unit, modifier: Modifier = Modifier)`
- `RxCard`: `RxCard(remedyName: String, dosage: String, homeRemedy: String?, safetyDisclaimer: String, modifier: Modifier = Modifier)`
- `VideoLink`: `VideoLink(url: String, label: String = "Watch Remedy Guide", onClick: (String) -> Unit, modifier: Modifier = Modifier)`
- `TagChip`: `TagChip(text: String, isAccentTint: Boolean = false, selected: Boolean = false, onClick: (() -> Unit)? = null, modifier: Modifier = Modifier)`
- `PlanStep`: `PlanStep(stepNumber: Int, title: String, description: String, timeSlot: String? = null, isCompleted: Boolean, onCompletedChange: (Boolean) -> Unit, modifier: Modifier = Modifier)`
- `DoctorContactFooter`: `DoctorContactFooter(doctorName: String = BrandingConfig.DOCTOR_NAME, qualifications: String = BrandingConfig.DOCTOR_QUALIFICATIONS, clinicAddress: String = BrandingConfig.CLINIC_ADDRESS, phoneNumber: String = BrandingConfig.WHATSAPP_NUMBER, modifier: Modifier = Modifier)`

---

## Code Layout
- `app/build.gradle.kts`: Dependencies, SDK, build features, font configurations.
- `app/src/main/res/drawable/`: Vector XML drawables for line-art icons (`ic_leaf.xml`, `ic_pill.xml`, `ic_pulse.xml`, etc.).
- `app/src/main/res/values/font_certs.xml`: Certificates for Google Fonts.
- `app/src/main/java/com/healinghands4u/`
  - `data/mock/MockHomeopathyData.kt`: Rich realistic mock dataset.
  - `presentation/theme/`:
    - `Color.kt`: Trusted Teal Light and Dark color tokens.
    - `Theme.kt`: `HealingHandsTheme` mapping tokens to Material 3 ColorScheme and extended locals.
    - `Type.kt`: Sora and IBM Plex Sans typography scales with safe fallback.
  - `presentation/components/`:
    - `BrandRow.kt`, `TipCard.kt`, `MiniCard.kt`, `TabBar.kt`, `ChatHeader.kt`, `ChatBubble.kt`, `QuickReplyChip.kt`, `YesNoCard.kt`, `RxCard.kt`, `VideoLink.kt`, `TagChip.kt`, `PlanStep.kt`.
  - `presentation/common/`:
    - `DoctorContactFooter.kt`, `TestTags.kt`.
  - `presentation/home/HomeScreen.kt`: Home Dashboard.
  - `presentation/diseaselist/DiseaseListScreen.kt`: Disease Directory.
  - `presentation/planner/PlannerScreen.kt`: Personalized Health Planner.
  - `presentation/chatbot/`:
    - `query/ChatbotQueryScreen.kt`: Query input with voice and dual intent.
    - `consultation/ConsultationScreen.kt`: Diagnostic Q&A with YesNoCards.
    - `answer/ChatbotAnswerScreen.kt`: Answer screen with RxCard, VideoLink, and footer.
  - `presentation/navigation/NavRoutes.kt`, `AppNavHost.kt`: Compose navigation.
- `app/src/test/java/com/healinghands4u/presentation/`:
  - `home/HomeScreenTest.kt`
  - `diseaselist/DiseaseListScreenTest.kt`
  - `chatbot/ChatbotScreenTest.kt`
  - `theme/ThemeModeRenderTest.kt`
  - `common/DoctorContactFooterTest.kt`
  - `ChallengerAdversarialTest.kt`
