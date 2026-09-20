# Test Infrastructure Survey & Acceptance Report (Milestone 2)

## 1. Observation

Direct empirical inspection of both backend (`/Users/aditya/workspace/hh4u/backend`) and Android (`/Users/aditya/workspace/hh4u/app`) yielded the following factual observations.

---

### 1.1 Backend Testing Infrastructure

1. **`backend/package.json`**:
   - Lines 6–11:
     ```json
     "scripts": {
       "test": "echo \"Error: no test specified\" && exit 1",
       "dev": "ts-node-dev --respawn src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js"
     }
     ```
   - Lines 16–29:
     ```json
     "dependencies": {
       "cors": "^2.8.6",
       "dotenv": "^17.4.2",
       "express": "^5.2.1",
       "helmet": "^8.3.0",
       "mongoose": "^9.10.1"
     },
     "devDependencies": {
       "@types/cors": "^2.8.19",
       "@types/express": "^5.0.6",
       "@types/node": "^22.20.3",
       "ts-node-dev": "^2.0.0",
       "typescript": "^7.0.2"
     }
     ```
   - **Absence of Testing Dependencies**: `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`, and `mongodb-memory-server` are completely absent from `dependencies` and `devDependencies`.
   - **Absence of Auth Token Dependencies**: `jsonwebtoken` and `@types/jsonwebtoken` are absent.

2. **Backend Code Structure & Architecture**:
   - **`backend/src/index.ts`** (lines 9–27):
     ```typescript
     const app = express();
     const port = process.env.PORT || 5000;
     app.use(cors());
     app.use(helmet());
     app.use(express.json());
     connectDB();
     app.get('/health', (req: Request, res: Response) => {
       res.status(200).json({ status: 'ok', message: 'Healing Hands4U API is running' });
     });
     app.listen(port, () => {
       console.log(`Server is running on port ${port}`);
     });
     ```
     - `app` is not exported.
     - `connectDB()` and `app.listen(port)` execute immediately when the module is imported.
   - **`backend/src/config/db.ts`** (lines 6–19):
     - Directly connects to `process.env.MONGODB_URI`.
     - In `backend/.env`, `MONGODB_URI="mongodb+srv://test1magnitude_db_user:JZvOlrRvxOZ0XnBb@cluster0.iifejq3.mongodb.net"` points to a remote MongoDB Atlas cluster.
   - **Directories**:
     - `backend/src/controllers/` — empty directory.
     - `backend/src/routes/` — empty directory.
     - `backend/src/services/` — empty directory.
     - Test directory (`backend/tests/` or `backend/src/__tests__/`) — does not exist.
   - **Existing Models**:
     - `backend/src/models/User.ts` exists with `authProvider: 'email_otp' | 'google' | 'guest'` and `{ unique: true, sparse: true }` on `email`.

3. **Backend Runtimes**:
   - `node -v` -> `v25.2.1`
   - `npm -v` -> `11.6.2`

---

### 1.2 Android Testing Infrastructure

1. **Gradle Build Files & Wrappers**:
   - Executing `./gradlew --version` in `/Users/aditya/workspace/hh4u` resulted in:
     `zsh:1: no such file or directory: ./gradlew`
   - Root project has `build.gradle.kts` and `settings.gradle.kts`, but the Gradle wrapper files (`gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.properties`) were not checked in.
   - Cached Gradle installations exist on the host machine:
     `/Users/aditya/.gradle/wrapper/dists/gradle-8.9-bin/90cnw93cvbtalezasaz0blq0a/gradle-8.9/bin/gradle`
   - JDK 21 is installed at `/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home` (`temurin-21.jdk`, Java 21.0.5 LTS).
   - Android SDK is installed at `/Users/aditya/Library/Android/sdk`, containing platform SDKs `android-34` and `android-36`, `build-tools`, and `platform-tools`.

2. **`app/build.gradle.kts` Test Dependencies**:
   - Lines 71–76:
     ```kotlin
     testImplementation("junit:junit:4.13.2")
     androidTestImplementation("androidx.test.ext:junit:1.1.5")
     androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
     androidTestImplementation(platform("androidx.compose:compose-bom:2023.10.01"))
     androidTestImplementation("androidx.compose.ui:ui-test-junit4")
     ```
   - Notice: `ui-test-junit4` and `espresso-core` are configured exclusively under `androidTestImplementation` (instrumentation tests).
   - Neither `org.robolectric:robolectric` nor unit test Compose runners are configured under `testImplementation`.

3. **Android Build Verification & Execution Output**:
   - Running `gradle tasks` or `gradle testDebugUnitTest` without `BypassSandbox: true` failed to communicate with the Gradle daemon:
     `Could not connect to the Gradle daemon.`
   - Running with `BypassSandbox: true` allowed the Gradle daemon to connect.
   - Without specifying `ANDROID_HOME`, Gradle reported:
     `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local properties file at '/Users/aditya/workspace/hh4u/local.properties'.`
   - Specifying `ANDROID_HOME=/Users/aditya/Library/Android/sdk` triggered task `:app:checkDebugAarMetadata`, which failed with:
     ```
     Execution failed for task ':app:checkDebugAarMetadata'.
     > Configuration ':app:debugRuntimeClasspath' contains AndroidX dependencies, but the 'android.useAndroidX' property is not enabled, which may cause runtime issues.
       Set 'android.useAndroidX=true' in the 'gradle.properties' file and retry.
     ```
   - Specifying `-Pandroid.useAndroidX=true` resolved `:app:checkDebugAarMetadata`, but compilation subsequently failed at `:app:processDebugResources` with missing resources:
     ```
     AAPT: error: resource mipmap/ic_launcher (aka com.healinghands4u:mipmap/ic_launcher) not found.
     AAPT: error: resource string/app_name (aka com.healinghands4u:string/app_name) not found.
     AAPT: error: resource mipmap/ic_launcher_round (aka com.healinghands4u:mipmap/ic_launcher_round) not found.
     AAPT: error: resource style/Theme.HealingHands4U (aka com.healinghands4u:style/Theme.HealingHands4U) not found.
     ```
   - `app/src/main/res/` does not currently exist.
   - In `app/src/main/java/`, the only file is `com/healinghands4u/config/BrandingConfig.kt`.
   - Neither `app/src/test/` nor `app/src/androidTest/` currently exist.

4. **Emulator & Connected Devices Status**:
   - `~/Library/Android/sdk/emulator/emulator -list-avds` returned exit code 0 with an empty list (no AVDs installed).
   - `adb devices` failed to connect to daemon due to socket binding restrictions; no physical or virtual Android devices are attached.
   - **Direct consequence**: `connectedAndroidTest` cannot run in this headless environment.

---

## 2. Logic Chain

1. **Backend Testability (Separation of Server and Application)**:
   - *Observation*: `backend/src/index.ts` creates the Express `app`, runs `connectDB()`, and calls `app.listen(port)` immediately upon module load without exporting `app`.
   - *Reasoning*: Supertest needs to import the Express application and bind it to an ephemeral in-process test server. If `app.listen` is triggered on import, test runs will fail with `EADDRINUSE` or prevent the test process from exiting.
   - *Inference*: The backend must separate application definition (`backend/src/app.ts`, exporting `app`) from server initiation (`backend/src/index.ts`, importing `app` and invoking `connectDB()` + `app.listen()`).

2. **Backend Database Handling in Tests**:
   - *Observation*: `.env` points to a live MongoDB Atlas cluster. Network calls require sandbox bypass, and testing against live Atlas can lead to slow tests, data pollution, and race conditions.
   - *Reasoning*:
     - **Approach A (In-Memory MongoDB / `mongodb-memory-server`)**: Spins up a local, ephemeral mongod binary in memory per test run. Excellent for real query validation and unique constraint enforcement, but adds binary download overhead.
     - **Approach B (Mongoose Model Mocking / Service Unit Testing)**: Mocking `User.create`, `User.findOne`, `Otp.create`, etc., using Jest spies/mocks. Instantaneous execution (<50ms), zero external network or binary dependencies, perfectly isolated.
     - **Approach C (Atlas Test Database with Isolation)**: Connects to Atlas with an isolated database name (e.g. `hh4u_test`), cleaning collections in `beforeAll` / `afterEach` / `afterAll`.
   - *Inference*: The recommended test setup should combine Supertest integration tests with either `mongodb-memory-server` or a dedicated test DB connection string (`MONGODB_URI_TEST`), paired with comprehensive mock unit tests.

3. **Android UI Test Strategy (Robolectric vs. Instrumented)**:
   - *Observation*: The test environment has no emulator (no AVDs) and no attached device. `connectedAndroidTest` is impossible without an emulator.
   - *Reasoning*: Compose UI tests (`createComposeRule()`) can execute directly on the local JVM via Robolectric (`@RunWith(RobolectricTestRunner::class)`).
   - *Inference*: Configure `testImplementation("org.robolectric:robolectric:4.11.1")` and `testImplementation("androidx.compose.ui:ui-test-junit4")` in `app/build.gradle.kts`. This enables running all Compose UI tests via `./gradlew testDebugUnitTest` headlessly, deterministically, and fast without requiring an Android emulator or device.

4. **Android Build Prerequisite Resolution**:
   - *Observation*: The build failed on missing `android.useAndroidX=true` and missing resources (`mipmap`, `strings.xml`, `themes.xml`).
   - *Reasoning*: The Android build cannot run `testDebugUnitTest` until the resource merging step succeeds.
   - *Inference*: `gradle.properties` must be created containing `android.useAndroidX=true`. Basic resources (`strings.xml`, `themes.xml`, and dummy launcher icons or removing mipmap refs) must be provided in `app/src/main/res/`. Also, the Gradle wrapper should be generated (`gradle wrapper`) so `./gradlew` is standard and reproducible.

---

## 3. Caveats

1. **Sandbox / Network Bypass**: Running npm package installations (`npm install`), live MongoDB Atlas connections, and Gradle daemon inter-process communication requires `BypassSandbox: true` in this Mac agent environment.
2. **Google OAuth Token Verification**: In a test/demo environment, real Google ID tokens cannot be generated without an interactive Google Sign-In prompt. The backend authentication service must provide a mockable or bypassable verification path for `NODE_ENV=test` (e.g., accepting a well-known test token).
3. **Email OTP Delivery**: Real email transmission requires external SMTP credentials (absent in `.env`). In test and development modes, the OTP should be deterministically returned in the response payload or captured from an in-memory/DB store to allow automated test assertions.
4. **Android Compose Compiler Version**: `app/build.gradle.kts` pins `kotlinCompilerExtensionVersion = "1.5.4"` with Kotlin `1.9.20`. Test dependencies must match Compose BOM `2023.10.01` (Compose 1.5.4) and Robolectric 4.11+ to avoid binary incompatibility on Java 21.

---

## 4. Conclusion & Recommended Test Architecture

### 4.1 Backend Test Infrastructure Plan

#### 4.1.1 Required Dependencies
Install in `/Users/aditya/workspace/hh4u/backend`:
```bash
# Runtime dependencies
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken

# Testing frameworks and runners
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
# Optional for full in-memory MongoDB integration:
npm install --save-dev mongodb-memory-server
```

#### 4.1.2 Jest Configuration (`backend/jest.config.js`)
```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
};
```

#### 4.1.3 Package Scripts (`backend/package.json`)
```json
"scripts": {
  "test": "jest --runInBand --detectOpenHandles",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "dev": "ts-node-dev --respawn src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

#### 4.1.4 Recommended Test Suite Structure
```
backend/
├── src/
│   ├── app.ts                 # Express setup, middleware, route mounting
│   ├── index.ts               # Server startup (connectDB + app.listen)
│   ├── controllers/
│   │   └── authController.ts  # guestLogin, requestOtp, verifyOtp, googleLogin
│   ├── routes/
│   │   └── authRoutes.ts      # POST /api/auth/guest, /otp/request, /otp/verify, /google
│   ├── middlewares/
│   │   └── authMiddleware.ts  # JWT verification (authenticateToken)
│   └── models/
│       ├── User.ts
│       └── Otp.ts
└── tests/
    ├── setup.ts               # In-memory DB setup or mock hooks
    ├── auth.guest.test.ts     # Guest login tests (creation, token validation)
    ├── auth.otp.test.ts       # OTP request, verify, invalid code, expiration
    ├── auth.google.test.ts    # Google login (mocked token, user creation)
    └── auth.middleware.test.ts# Protected route JWT verification tests
```

#### 4.1.5 Clean Execution Command for Backend Tests
```bash
cd /Users/aditya/workspace/hh4u/backend && npm test
```

---

### 4.2 Android Test Infrastructure Plan

#### 4.2.1 Missing Setup Fixes
1. **Create `gradle.properties`** at `/Users/aditya/workspace/hh4u/gradle.properties`:
   ```properties
   android.useAndroidX=true
   android.nonTransitiveRClass=true
   org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
   ```

2. **Generate Gradle Wrapper**:
   Run using existing Gradle 8.9:
   ```bash
   JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
   /Users/aditya/.gradle/wrapper/dists/gradle-8.9-bin/90cnw93cvbtalezasaz0blq0a/gradle-8.9/bin/gradle wrapper
   ```

3. **Add Minimal App Resources**:
   Create `app/src/main/res/values/strings.xml`:
   ```xml
   <resources>
       <string name="app_name">Healing Hands4U</string>
   </resources>
   ```
   Create `app/src/main/res/values/themes.xml`:
   ```xml
   <resources>
       <style name="Theme.HealingHands4U" parent="android:Theme.Material.Light.NoActionBar" />
   </resources>
   ```
   Provide dummy launcher icons or update `AndroidManifest.xml`.

4. **Update `app/build.gradle.kts` Test Dependencies**:
   ```kotlin
   testImplementation("junit:junit:4.13.2")
   testImplementation("org.robolectric:robolectric:4.11.1")
   testImplementation("androidx.test:core:1.5.0")
   testImplementation("androidx.test.ext:junit:1.1.5")
   testImplementation(platform("androidx.compose:compose-bom:2023.10.01"))
   testImplementation("androidx.compose.ui:ui-test-junit4")
   testImplementation("androidx.compose.ui:ui-test-manifest")
   ```

#### 4.2.2 Recommended Android Test Suite Structure
```
app/src/test/java/com/healinghands4u/
├── presentation/
│   ├── auth/
│   │   └── LoginScreenTest.kt       # Verifies OTP, Google, Guest options rendered
│   ├── home/
│   │   └── HomeDashboardTest.kt     # Verifies 3 navigation cards rendered
│   └── common/
│       └── DoctorContactFooterTest.kt # Verifies Dr. Anjali Jariwala info rendered
```

#### 4.2.3 Robolectric Compose UI Test Template
```kotlin
package com.healinghands4u.presentation.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.presentation.common.TestTags
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34])
class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun loginScreen_rendersAllThreeAuthOptions() {
        composeTestRule.setContent {
            LoginScreen(
                onOtpClick = {},
                onGoogleClick = {},
                onGuestClick = {}
            )
        }

        // Verify three authentication options are visible
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_OTP).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_GOOGLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_GUEST).assertIsDisplayed()
    }
}
```

#### 4.2.4 Clean Execution Command for Android Tests
```bash
ANDROID_HOME=/Users/aditya/Library/Android/sdk \
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
./gradlew testDebugUnitTest
```

---

### 4.3 Acceptance Criteria Checklist for Milestone 2

| Target | Acceptance Criterion | Verification Method | Status |
|---|---|---|---|
| **Backend** | Programmatic test suite exists (Jest + Supertest) | `npm test` runs Jest test runner | Needs implementation |
| **Backend** | Guest login endpoint creates user (`authProvider: 'guest'`) | Supertest `POST /api/auth/guest` returns HTTP 200/201 and user in DB | Needs implementation |
| **Backend** | Guest login endpoint returns valid signed JWT | Inspect `response.body.token`, verify with `jwt.verify(token, secret)` | Needs implementation |
| **Backend** | All backend test cases pass cleanly | `npm test` returns exit code 0 | Needs implementation |
| **Android** | Programmatic UI tests exist | Robolectric / Compose UI test classes in `app/src/test/` | Needs implementation |
| **Android** | Login screen renders 3 auth options (OTP, Google, Guest) | `LoginScreenTest` asserts visibility of all 3 options | Needs implementation |
| **Android** | Home Dashboard renders 3 navigation cards | `HomeDashboardTest` asserts presence of consultation, planner, disease cards | Needs implementation |
| **Android** | Shared `DoctorContactFooter` renders clinic data | `DoctorContactFooterTest` asserts Dr. Anjali Jariwala and clinic info | Needs implementation |
| **Android** | All Android test cases pass cleanly | `./gradlew testDebugUnitTest` returns `BUILD SUCCESSFUL` with 0 failures | Needs implementation |

---

## 5. Verification Method

To independently verify this survey and the infrastructure readiness:

1. **Verify Backend Pre-Conditions**:
   - Inspect `backend/package.json` to confirm lack of Jest and Supertest dependencies.
   - Run `node -v` and `npm -v` in `backend/` to confirm Node 25 and npm 11 availability.
   - Inspect `backend/src/index.ts` to confirm lack of Express `app` export.

2. **Verify Android Pre-Conditions**:
   - Check JDK: `/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java -version` (Java 21).
   - Check Android SDK: `ls -la /Users/aditya/Library/Android/sdk/platforms` (confirm `android-34`).
   - Check Gradle binary: `/Users/aditya/.gradle/wrapper/dists/gradle-8.9-bin/90cnw93cvbtalezasaz0blq0a/gradle-8.9/bin/gradle -v`.
   - Run Gradle task dry run:
     ```bash
     ANDROID_HOME=/Users/aditya/Library/Android/sdk \
     JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
     /Users/aditya/.gradle/wrapper/dists/gradle-8.9-bin/90cnw93cvbtalezasaz0blq0a/gradle-8.9/bin/gradle tasks
     ```
     Confirm build succeeds and lists `testDebugUnitTest`.

3. **Invalidation Conditions**:
   - If a physical Android device or active emulator is connected, `connectedAndroidTest` becomes viable in addition to Robolectric.
   - If backend uses a different testing framework (e.g. Mocha/Chai or Vitest), Jest configuration would be replaced accordingly.
