# MAAK Native Android App

Native Android app for the MAAK travel-services brand, built with Kotlin and Jetpack Compose.

## Included
- Native Compose screens for home, services, about, and service request flows.
- Arabic/English layout direction toggle.
- Light/dark appearance toggle.
- Flight, hotel, car rental, bus/ground transport, Egypt security clearance, Umrah, medical travel, tourism, and real-estate enquiry forms.
- All form fields are optional; requests are formatted and handed off to WhatsApp at +967776002190.
- Android APK build workflow at `.github/workflows/android-native-apk.yml`.

## Build locally
Requirements: JDK 17, Android SDK Platform 35, and Gradle 8.9.

```bash
cd android-native
gradle assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

## Build on GitHub
Open Actions → **Build MAAK Android APK** → **Run workflow**. Download the `maak-android-debug-apk` artifact from the completed run.

This is an initial native implementation. Before publishing to Google Play, test all form flows on real devices, verify language/theme persistence and field parity against the website, and sign a release build with a private release key. Never commit the signing key.
