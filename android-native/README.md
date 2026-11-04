# MAAK Native Android App

Native Android app for the MAAK travel-services brand, built with Kotlin and Jetpack Compose.

## Included
- Native Compose screens for home, services, about, and service request flows.
- Arabic/English layout direction toggle.
- Light/dark appearance toggle.
- The seven approved services in order: flights, hotels, ground transport, car rental, Egypt security clearance, Umrah, and medical travel.
- A four-section bottom navigation shell: Home, My bookings, Rewards, and My account. Admin and employee functions remain on the website.
- Inquiry details are saved through the existing Supabase `create_order` RPC before WhatsApp opens when backend settings are configured. Without settings, users can continue to WhatsApp without saving.
- Android APK build workflow at `.github/workflows/android-native-apk.yml`.

## Build locally
Requirements: JDK 17, Android SDK Platform 35, and Gradle 8.9.

```bash
cd android-native
gradle assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

## Configure the shared backend

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Gradle properties or environment variables before building. For local builds, place them in your user Gradle properties file (`~/.gradle/gradle.properties`) or export them in the build environment. The anon key is a public client key; database access is controlled by the existing Supabase RLS policies. Never put the Supabase service-role key in the app.

The app calls the existing `/rest/v1/rpc/create_order` endpoint with a fresh idempotency UUID. It does not create a separate database. Admin and employee workflows remain in the web dashboard.

## Build on GitHub
Open Actions → **Build MAAK Android APK** → **Run workflow**. Download the `maak-android-debug-apk` artifact from the completed run.

This is an initial native implementation. Before publishing to Google Play, test all form flows on real devices, verify language/theme persistence and field parity against the website, and sign a release build with a private release key. Never commit the signing key.
