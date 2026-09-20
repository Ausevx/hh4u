# Milestone 2 Android Core UI Survey & Architecture Report

## 1. Observation

### 1.1 Project Structure & Build Configuration
- **Root `settings.gradle.kts`**:
  - Root project name: `HealingHands4U` (`rootProject.name = "HealingHands4U"`, line 16)
  - Modules included: `:app` (`include(":app")`, line 17)
  - Plugin & dependency repositories: `google()`, `mavenCentral()`, `gradlePluginPortal()` with `FAIL_ON_PROJECT_REPOS`.
- **Root `build.gradle.kts`**:
  - Android Application Plugin: `com.android.application` version `8.2.0` (line 2)
  - Kotlin Android Plugin: `org.jetbrains.kotlin.android` version `1.9.20` (line 3)
  - Hilt Plugin: `com.google.dagger.hilt.android` version `2.48` (line 4)
- **App Module `app/build.gradle.kts`**:
  - `namespace = "com.healinghands4u"` (line 9)
  - `compileSdk = 34`, `minSdk = 24`, `targetSdk = 34` (lines 10, 14, 15)
  - Java / Kotlin target: `JavaVersion.VERSION_17`, `jvmTarget = "17"` (lines 32-37)
  - Jetpack Compose enabled: `buildFeatures { compose = true }` (line 39)
  - Compose compiler version: `kotlinCompilerExtensionVersion = "1.5.4"` (line 42)
  - Existing UI / Compose dependencies:
    - Compose BOM: `androidx.compose:compose-bom:2023.10.01` (line 50)
    - `androidx.compose.ui:ui` (line 51)
    - `androidx.compose.ui:ui-graphics` (line 52)
    - `androidx.compose.ui:ui-tooling-preview` (line 53)
    - `androidx.compose.material3:material3` (line 54)
    - Activity Compose: `androidx.activity:activity-compose:1.8.1` (line 49)
    - Core KTX: `androidx.core:core-ktx:1.12.0` (line 47)
    - Lifecycle Runtime KTX: `androidx.lifecycle:lifecycle-runtime-ktx:2.6.2` (line 48)
  - Architecture & Data dependencies:
    - Hilt: `com.google.dagger:hilt-android:2.48` (line 57)
    - Room: `androidx.room:room-runtime:2.6.1`, `room-ktx:2.6.1` (lines 62, 65)
    - Retrofit / Gson: `com.squareup.retrofit2:retrofit:2.9.0`, `converter-gson:2.9.0` (lines 68, 69)
  - Testing dependencies:
    - Unit testing: `junit:junit:4.13.2` (line 71)
    - Android instrumentation: `androidx.test.ext:junit:1.1.5` (line 72), `androidx.test.espresso:espresso-core:3.5.1` (line 73)
    - Compose UI test: `androidx.compose.ui:ui-test-junit4` (line 75)
- **Application Manifest `app/src/main/AndroidManifest.xml`**:
  - Package: `com.healinghands4u` (line 3)
  - Permissions: `android.permission.INTERNET`, `android.permission.RECORD_AUDIO` (lines 5-6)
  - Declares theme `@style/Theme.HealingHands4U` and activity `.MainActivity` (lines 14, 16)

### 1.2 Package Directory Tree
The source directory `app/src/main/java/com/healinghands4u/` has the following structure:
```
app/src/main/java/com/healinghands4u/
├── config/
│   └── BrandingConfig.kt
├── data/
│   ├── local/
│   ├── remote/
│   └── repository/
├── di/
├── domain/
│   ├── model/
│   ├── repository/
│   └── usecase/
└── presentation/
    ├── auth/
    ├── chatbot/
    │   ├── answer/
    │   ├── consultation/
    │   └── query/
    ├── common/
    ├── diseaselist/
    ├── home/
    ├── planner/
    └── theme/
```
Currently, all directories under `presentation/` and `data/` and `domain/` are empty placeholders. The only existing Kotlin source file in the entire project is `BrandingConfig.kt`.

### 1.3 Clinic Data & Branding Assets (`BrandingConfig.kt`)
File location: `app/src/main/java/com/healinghands4u/config/BrandingConfig.kt`
Lines 1 to 14:
```kotlin
package com.healinghands4u.config

object BrandingConfig {
    const val APP_NAME = "Healing Hands4U"
    const val DOCTOR_NAME = "Dr. Anjali Jariwala"
    const val DOCTOR_QUALIFICATIONS = "BHMS, MD (Homeopathy)" // Example
    const val CLINIC_ADDRESS = "123 Healing St, Wellness City" // Example
    const val WHATSAPP_NUMBER = "+1234567890" // Example
    
    // In a real app, these might be resource IDs (R.drawable.xxx) 
    // or URLs if fetched dynamically (but PRD says bundled assets)
    const val DOCTOR_PHOTO_ASSET = "doctor_photo.png" 
}
```

### 1.4 Missing Files & Dependencies
1. **Missing Source Files**:
   - `MainActivity.kt` in `com.healinghands4u`.
   - Android resources in `app/src/main/res/values/`: `strings.xml`, `themes.xml` (needed for `@style/Theme.HealingHands4U`).
   - Theme files in `presentation/theme/`: `Color.kt`, `Theme.kt`, `Type.kt`.
2. **Missing Dependencies for UI & Navigation**:
   - `androidx.navigation:navigation-compose:2.7.5` (Compose Navigation).
   - `androidx.compose.material:material-icons-extended` (Material 3 icons: phone, chat, calendar, search, medical, chevron, etc.).
   - `androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2` (ViewModel integration for Compose).
3. **Headless Testing Dependencies (Host-side Compose UI Testing)**:
   - For fast, headless execution of Compose UI tests on machines without an Android emulator or device:
     - `testImplementation("org.robolectric:robolectric:4.11.1")`
     - `testImplementation("androidx.compose.ui:ui-test-junit4")`
     - `testImplementation("androidx.test:core:1.5.0")`
     - `testImplementation("androidx.test.ext:junit:1.1.5")`

---

## 2. Logic Chain

1. **Clean Slate Presentation Layer**:
   - Because `presentation/` directories (`auth`, `home`, `planner`, `diseaselist`, `common`, `theme`) are currently empty (Observation 1.2), Milestone 2 requires building a cohesive Jetpack Compose UI shell from scratch.
2. **Material 3 Theme Grounding**:
   - Material Design 3 is already a resolved dependency via `compose-bom:2023.10.01` (Observation 1.1).
   - A clinical, trusted palette matching the Homeopathy / Healing Hands4U brand (Observation 1.3) should be established in `presentation/theme/Color.kt` and `Theme.kt`:
     - Healing Teal / Forest Green primary tones (`#006A60` / `#00897B`)
     - Soft Mint container tones (`#70F7E5` / `#CCE8E2`)
     - Warm soothing background (`#FBFDF8`)
     - Neutral surfaces with clean typography in `Type.kt`.
3. **Navigation Architecture**:
   - The user request requires navigating between Login, Home Dashboard, Planner, and Disease List.
   - Using `androidx.navigation:navigation-compose` with a type-safe or sealed route class (`Screen`) provides standard, maintainable back-stack handling:
     - `Screen.Login.route = "login"`
     - `Screen.Home.route = "home"`
     - `Screen.Planner.route = "planner"`
     - `Screen.DiseaseList.route = "disease_list"`
4. **Shared Component Architecture (`DoctorContactFooter`)**:
   - The user request explicitly demands a shared `DoctorContactFooter` component using Material Design 3 and `BrandingConfig.kt` (Observation 1.3).
   - Placing `DoctorContactFooter.kt` in `presentation/common/` allows it to be embedded directly into `HomeScreen`, `PlannerScreen`, and `DiseaseListScreen`.
   - The footer binds `BrandingConfig.DOCTOR_NAME`, `BrandingConfig.DOCTOR_QUALIFICATIONS`, `BrandingConfig.CLINIC_ADDRESS`, and triggers Android Intents (`Intent.ACTION_VIEW` for WhatsApp URL `https://wa.me/...` and `Intent.ACTION_DIAL` for `tel:...`).
5. **Testability via Semantic Test Tags**:
   - Acceptance criteria require programmatic verification that:
     a) Login Screen renders OTP, Google, and Guest auth options.
     b) Home Dashboard renders the 3 main navigation cards.
     c) DoctorContactFooter displays clinic branding data.
   - Establishing a dedicated `TestTags.kt` in `presentation/common/` guarantees that test assertions target deterministic, unforgeable tags (`Modifier.testTag(TestTags.xxx)`) rather than volatile localized strings.

---

## 3. Detailed Specifications for Milestone 2 Screens & Components

### 3.1 Shared Component: `DoctorContactFooter`
- **File**: `app/src/main/java/com/healinghands4u/presentation/common/DoctorContactFooter.kt`
- **Layout**:
  - Material 3 `ElevatedCard` or `Surface` container with rounded corners (16.dp), subtle border or container color (`MaterialTheme.colorScheme.surfaceVariant`).
  - **Doctor Header**:
    - Doctor Avatar / Icon placeholder.
    - Doctor Name: `BrandingConfig.DOCTOR_NAME` ("Dr. Anjali Jariwala") — `Modifier.testTag(TestTags.FOOTER_DOCTOR_NAME)`.
    - Qualifications: `BrandingConfig.DOCTOR_QUALIFICATIONS` ("BHMS, MD (Homeopathy)") — `Modifier.testTag(TestTags.FOOTER_QUALIFICATIONS)`.
    - Clinic Address: `BrandingConfig.CLINIC_ADDRESS` ("123 Healing St, Wellness City") — `Modifier.testTag(TestTags.FOOTER_CLINIC_ADDRESS)`.
  - **Action Row**:
    - **WhatsApp Button**: Green styled `FilledTonalButton` or `IconButton` with WhatsApp icon/label.
      - Action: launches WhatsApp chat via intent `Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/${BrandingConfig.WHATSAPP_NUMBER}"))`.
      - Test tag: `Modifier.testTag(TestTags.FOOTER_WHATSAPP_BUTTON)`.
    - **Call Clinic Button**: Outlined or filled tonal button with phone icon/label.
      - Action: launches phone dialer via intent `Intent(Intent.ACTION_DIAL, Uri.parse("tel:${BrandingConfig.WHATSAPP_NUMBER}"))`.
      - Test tag: `Modifier.testTag(TestTags.FOOTER_CALL_BUTTON)`.

### 3.2 Login Screen
- **File**: `app/src/main/java/com/healinghands4u/presentation/auth/LoginScreen.kt`
- **Purpose**: Authenticate user via Email OTP, Google Sign-In, or Guest access.
- **Components**:
  1. **Branding Header**:
     - App Title: `BrandingConfig.APP_NAME` ("Healing Hands4U")
     - Subtitle: "Holistic Homeopathic Healing & Care"
  2. **Option 1: Email OTP**:
     - Text field for email input: `OutlinedTextField` with `Modifier.testTag(TestTags.LOGIN_EMAIL_INPUT)`.
     - Button "Send OTP": `Button` with `Modifier.testTag(TestTags.LOGIN_SEND_OTP_BUTTON)`.
     - OTP input field (revealed or always visible): `OutlinedTextField` with `Modifier.testTag(TestTags.LOGIN_OTP_INPUT)`.
     - Button "Verify & Sign In": `Button` with `Modifier.testTag(TestTags.LOGIN_VERIFY_OTP_BUTTON)`.
  3. **Option 2: Google Sign-In**:
     - Prominent button "Sign in with Google": `OutlinedButton` with Google icon and `Modifier.testTag(TestTags.LOGIN_GOOGLE_BUTTON)`.
  4. **Option 3: Guest Mode**:
     - Clean button "Continue as Guest": `TextButton` or `OutlinedButton` with `Modifier.testTag(TestTags.LOGIN_GUEST_BUTTON)`.
     - Clicking triggers immediate navigation to `Screen.Home.route`.
  5. **Footer**:
     - Optional compact doctor contact or terms indicator.

### 3.3 Home Dashboard
- **File**: `app/src/main/java/com/healinghands4u/presentation/home/HomeScreen.kt`
- **Purpose**: Primary hub providing access to the 3 main app pillars and clinic contact info.
- **Components**:
  1. **Top Bar / Welcome Banner**:
     - Greeting: "Welcome to Healing Hands4U" (or "Welcome, Guest")
     - Subtitle: "Your personalized homeopathy wellness companion"
  2. **3 Main Navigation Cards**:
     - **Card 1: AI Homeopathic Consultation**:
       - Title: "Consult AI Doctor" / "AI Consultation"
       - Subtitle: "Describe symptoms & receive instant homeopathic guidance."
       - Icon: Chat / Stethoscope icon
       - Test Tag: `Modifier.testTag(TestTags.HOME_CARD_AI_CONSULT)`
       - Action: Navigates to Chatbot or shows consultation preview.
     - **Card 2: Personalized Health Planner**:
       - Title: "Personalized Planner"
       - Subtitle: "Your customized daily remedy schedule & diet tips."
       - Icon: Calendar / Schedule icon
       - Test Tag: `Modifier.testTag(TestTags.HOME_CARD_PLANNER)`
       - Action: Navigates to `Screen.Planner.route`.
     - **Card 3: Disease Directory & Remedy Guide**:
       - Title: "Disease List & A-Z Guide"
       - Subtitle: "Explore common conditions, natural remedies & dosages."
       - Icon: Medical Library / Book icon
       - Test Tag: `Modifier.testTag(TestTags.HOME_CARD_DISEASE_LIST)`
       - Action: Navigates to `Screen.DiseaseList.route`.
  3. **Doctor Contact Section**:
     - Shared `DoctorContactFooter` embedded at the bottom of the scroll column with `Modifier.testTag(TestTags.HOME_DOCTOR_FOOTER)`.

### 3.4 Personalized Planner Screen
- **File**: `app/src/main/java/com/healinghands4u/presentation/planner/PlannerScreen.kt`
- **Purpose**: Displays user's daily homeopathic dosage schedule, diet advice, and regimen tracking.
- **Components**:
  1. **TopAppBar**:
     - Title: "Personalized Planner" — `Modifier.testTag(TestTags.PLANNER_TITLE)`
     - Back Navigation Icon: `IconButton` with `Modifier.testTag(TestTags.PLANNER_BACK_BUTTON)` to return to Home.
  2. **Daily Remedy Schedule Cards**:
     - Morning Dose Card (e.g., Arnica Montana 30C - 4 pills before breakfast) with interactive checkbox.
     - Afternoon Dose Card (e.g., Nux Vomica 200C - 4 pills after lunch).
     - Evening / Bedtime Card (e.g., Passiflora Incarnata - 10 drops in warm water).
  3. **Homeopathic Dietary Guidelines Card**:
     - Important precautions (e.g., Avoid raw onions, garlic, camphor, and strong coffee within 30 minutes of taking homeopathic medicine).
  4. **Embedded Doctor Contact Footer**:
     - `DoctorContactFooter()` at the bottom for quick regimen clarifications with Dr. Anjali Jariwala.

### 3.5 Disease List Screen
- **File**: `app/src/main/java/com/healinghands4u/presentation/diseaselist/DiseaseListScreen.kt`
- **Purpose**: Searchable, filterable directory of diseases and common homeopathic treatments.
- **Components**:
  1. **TopAppBar**:
     - Title: "Disease Directory" — `Modifier.testTag(TestTags.DISEASE_LIST_TITLE)`
     - Back Navigation Icon: `IconButton` with `Modifier.testTag(TestTags.DISEASE_LIST_BACK_BUTTON)` to return to Home.
  2. **Search Bar**:
     - `OutlinedTextField` or `SearchBar` with search icon — `Modifier.testTag(TestTags.DISEASE_SEARCH_INPUT)`
     - Filters list in real-time.
  3. **Category Chips Row**:
     - Horizontal scroll of `FilterChip` items: "All", "Respiratory", "Digestive", "Skin", "Stress & Sleep", "Joints & Pain".
  4. **Disease Remedy Cards**:
     - Pre-populated list of conditions (e.g., "Allergic Rhinitis", "Acid Reflux / GERD", "Migraine", "Eczema / Dermatitis", "Insomnia").
     - Each card displays:
       - Condition name
       - Key homeopathic remedies (e.g., Allium Cepa, Arsenicum Album)
       - Dosage & safety note
  5. **Embedded Doctor Contact Footer**:
     - `DoctorContactFooter()` at the bottom for personal consultation on complex conditions.

---

## 4. Proposed Architecture & Component Breakdown

### 4.1 UI Architecture Diagram
```
+-------------------------------------------------------------+
|                        MainActivity                         |
|                             |                               |
|                     HealingHandsTheme                       |
|                             |                               |
|                         AppNavHost                          |
+-----------------------------+-------------------------------+
                              |
     +------------------------+------------------------+
     |                        |                        |
[Screen.Login]          [Screen.Home]                  |
(OTP, Google, Guest)    (3 Main Cards)                 |
     |                        |                        |
     | (Guest / Sign In)      +------------+-----------+
     +----------------------->|            |
                              v            v
                      [Screen.Planner] [Screen.DiseaseList]
                              |            |
                              +------+-----+
                                     |
                                     v
                        [DoctorContactFooter]
                        (BrandingConfig Data)
```

### 4.2 File Placement Plan
```
app/src/main/
├── AndroidManifest.xml (Update theme reference if needed)
├── res/
│   └── values/
│       ├── strings.xml           <-- Define app_name ("Healing Hands4U")
│       └── themes.xml            <-- Define Theme.HealingHands4U
└── java/com/healinghands4u/
    ├── MainActivity.kt           <-- Activity entry point setting Compose Content
    ├── config/
    │   └── BrandingConfig.kt     <-- Existing clinic data
    ├── presentation/
    │   ├── auth/
    │   │   └── LoginScreen.kt    <-- Login with OTP, Google, Guest
    │   ├── common/
    │   │   ├── DoctorContactFooter.kt <-- Shared doctor contact component
    │   │   └── TestTags.kt       <-- Centralized semantics tags for UI tests
    │   ├── diseaselist/
    │   │   └── DiseaseListScreen.kt <-- Searchable disease directory
    │   ├── home/
    │   │   └── HomeScreen.kt     <-- Dashboard with 3 navigation cards
    │   ├── navigation/
    │   │   ├── NavRoutes.kt      <-- Screen sealed class (Login, Home, Planner, DiseaseList)
    │   │   └── AppNavHost.kt     <-- NavHost composable managing transitions
    │   ├── planner/
    │   │   └── PlannerScreen.kt  <-- Personalized health planner & schedule
    │   └── theme/
    │       ├── Color.kt          <-- Healing teal & warm clinical palette
    │       ├── Shape.kt          <-- Material 3 shapes
    │       ├── Theme.kt          <-- HealingHandsTheme Composable
    │       └── Type.kt           <-- M3 Typography
```

### 4.3 Test Semantics Dictionary (`TestTags.kt`)
```kotlin
package com.healinghands4u.presentation.common

object TestTags {
    // Login Screen
    const val LOGIN_EMAIL_INPUT = "login_email_input"
    const val LOGIN_SEND_OTP_BUTTON = "login_send_otp_button"
    const val LOGIN_OTP_INPUT = "login_otp_input"
    const val LOGIN_VERIFY_OTP_BUTTON = "login_verify_otp_button"
    const val LOGIN_GOOGLE_BUTTON = "login_google_button"
    const val LOGIN_GUEST_BUTTON = "login_guest_button"

    // Home Dashboard
    const val HOME_CARD_AI_CONSULT = "home_card_ai_consult"
    const val HOME_CARD_PLANNER = "home_card_planner"
    const val HOME_CARD_DISEASE_LIST = "home_card_disease_list"
    const val HOME_DOCTOR_FOOTER = "home_doctor_footer"

    // Doctor Contact Footer
    const val FOOTER_DOCTOR_NAME = "footer_doctor_name"
    const val FOOTER_QUALIFICATIONS = "footer_qualifications"
    const val FOOTER_CLINIC_ADDRESS = "footer_clinic_address"
    const val FOOTER_WHATSAPP_BUTTON = "footer_whatsapp_button"
    const val FOOTER_CALL_BUTTON = "footer_call_button"

    // Planner Screen
    const val PLANNER_TITLE = "planner_title"
    const val PLANNER_BACK_BUTTON = "planner_back_button"

    // Disease List Screen
    const val DISEASE_LIST_TITLE = "disease_list_title"
    const val DISEASE_LIST_BACK_BUTTON = "disease_list_back_button"
    const val DISEASE_SEARCH_INPUT = "disease_search_input"
}
```

---

## 5. Caveats
1. **Gradle CLI & Android SDK Environment**:
   - `gradle` is not in the system `$PATH`, but Gradle 8.9 exists in `~/.gradle/wrapper/dists/gradle-8.9-bin/90cnw93cvbtalezasaz0blq0a/gradle-8.9/bin/gradle`.
   - `JAVA_HOME` can be set to `/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home`.
   - There is no physical emulator or connected device in the headless sandbox. Therefore, Compose UI testing should utilize Robolectric (`testImplementation("org.robolectric:robolectric:...")` with `testDebugUnitTest`) or headless test runners so that `gradle test` executes fast and reliably on the host machine.
2. **Assets vs Icons**:
   - `BrandingConfig.DOCTOR_PHOTO_ASSET = "doctor_photo.png"` is referenced as a string. A placeholder vector avatar or icon should be provided in the Compose UI so missing bitmap assets do not cause rendering exceptions.
3. **External Action Intents**:
   - WhatsApp and phone dialer intents should be wrapped safely in `try/catch (ActivityNotFoundException)` or checked via `context.packageManager` so tests or devices without SIM cards/WhatsApp do not crash.

---

## 6. Conclusion
- The Android project is properly initialized with modern Gradle Kotlin DSL, Jetpack Compose BOM 2023.10.01, and Material 3, but the entire presentation layer is currently unpopulated (greenfield).
- `BrandingConfig.kt` already contains the authoritative clinic details (`APP_NAME`, `DOCTOR_NAME`, `DOCTOR_QUALIFICATIONS`, `CLINIC_ADDRESS`, `WHATSAPP_NUMBER`) which will be directly consumed by `DoctorContactFooter` and the screens.
- All Milestone 2 requirements can be cleanly satisfied by adding `navigation-compose` and `material-icons-extended`, creating the M3 theme (`Theme.kt`, `Color.kt`, `Type.kt`), the shared `DoctorContactFooter`, the 4 primary screens (`LoginScreen`, `HomeScreen`, `PlannerScreen`, `DiseaseListScreen`), and wiring navigation in `AppNavHost`.
- The specified `TestTags` dictionary guarantees deterministic programmatic Compose UI tests for the acceptance criteria (verifying 3 auth options on Login, 3 navigation cards on Home, and clinic data in the footer).

---

## 7. Verification Method

### 7.1 Inspecting Files
1. Check `BrandingConfig.kt` to ensure clinic constants match:
   `view_file /Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/config/BrandingConfig.kt`
2. Check `app/build.gradle.kts` for Compose and Material 3 setup:
   `view_file /Users/aditya/workspace/hh4u/app/build.gradle.kts`

### 7.2 Independent Test Commands (Post-Implementation)
When implementation is performed by the worker agent:
1. **Execute Unit & Compose Tests**:
   ```bash
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
   /Users/aditya/.gradle/wrapper/dists/gradle-8.9-bin/90cnw93cvbtalezasaz0blq0a/gradle-8.9/bin/gradle testDebugUnitTest
   ```
2. **Verify Compose Test Pass Rate**:
   - `LoginScreenTest`: passes assertions for `LOGIN_EMAIL_INPUT`, `LOGIN_SEND_OTP_BUTTON`, `LOGIN_GOOGLE_BUTTON`, `LOGIN_GUEST_BUTTON`.
   - `HomeScreenTest`: passes assertions for `HOME_CARD_AI_CONSULT`, `HOME_CARD_PLANNER`, `HOME_CARD_DISEASE_LIST`, and `HOME_DOCTOR_FOOTER`.
   - `DoctorContactFooterTest`: passes assertions for doctor name, qualifications, address, and action buttons.
