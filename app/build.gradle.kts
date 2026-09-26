plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("kotlin-kapt")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.healinghands4u"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.healinghands4u"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        val googleClientId = providers.gradleProperty("GOOGLE_WEB_CLIENT_ID")
            .orElse(providers.environmentVariable("GOOGLE_WEB_CLIENT_ID")).getOrElse("")
        resValue("string", "google_web_client_id", googleClientId)

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }
    // Run authentication regressions independently of the older chatbot UI tests.
    if (providers.gradleProperty("authTestsOnly").orNull == "true") {
        sourceSets.getByName("test").java.setIncludes(setOf("**/AuthViewModelTest.kt"))
    }
}

// Isolated integration tests use the real bundled asset and Room database without
// compiling legacy UI tests that still reference removed screens.
if (providers.gradleProperty("offlineTestsOnly").orNull == "true") {
    android.sourceSets.getByName("test").java.setSrcDirs(listOf("src/offlineTest/kotlin"))
    kotlin.sourceSets.getByName("test").kotlin.setSrcDirs(listOf("src/offlineTest/kotlin"))
}

val verifyOfflineBundle by tasks.registering {
    val bundle = layout.projectDirectory.file("src/main/assets/knowledge_base.json")
    inputs.file(bundle)
    doLast {
        val entries = groovy.json.JsonSlurper().parse(bundle.asFile) as? List<*>
        check(!entries.isNullOrEmpty()) { "The APK must contain a nonempty offline knowledge base." }
        val ids = mutableSetOf<String>()
        entries.forEach { item ->
            val row = item as? Map<*, *> ?: error("Invalid offline record")
            val id = row["id"] as? String ?: error("Offline record has no ID")
            check(ids.add(id) && id.isNotBlank()) { "Duplicate or empty offline ID" }
            check(!(row["questionText"] as? String).isNullOrBlank()) { "Offline record has no question" }
            check(!(row["answerText"] as? String).isNullOrBlank()) { "Offline record has no answer" }
        }
        logger.lifecycle("Verified ${entries.size} bundled offline questions and answers")
    }
}
tasks.named("preBuild").configure { dependsOn(verifyOfflineBundle) }

dependencies {
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
    implementation("androidx.activity:activity-compose:1.8.1")
    implementation(platform("androidx.compose:compose-bom:2023.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-text-google-fonts:1.6.8")
    implementation("androidx.navigation:navigation-compose:2.7.5")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui-text-google-fonts")
    
    // Coil (image loading for YouTube thumbnails)
    implementation("io.coil-kt:coil-compose:2.5.0")
    
    // Hilt
    implementation("com.google.dagger:hilt-android:2.48")
    kapt("com.google.dagger:hilt-android-compiler:2.48")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")
    
    // Room
    val room_version = "2.6.1"
    implementation("androidx.room:room-runtime:$room_version")
    annotationProcessor("androidx.room:room-compiler:$room_version")
    kapt("androidx.room:room-compiler:$room_version")
    implementation("androidx.room:room-ktx:$room_version")
    
    // Retrofit & OkHttp
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    
    // WorkManager for background sync
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    implementation("androidx.hilt:hilt-work:1.1.0")
    kapt("androidx.hilt:hilt-compiler:1.1.0")

    
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("org.robolectric:robolectric:4.11.1")
    testImplementation(platform("androidx.compose:compose-bom:2023.10.01"))
    testImplementation("androidx.compose.ui:ui-test-junit4")
    testImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("androidx.test:core:1.5.0")
    testImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2023.10.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
