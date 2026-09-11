# Android APK rebuild

This project keeps the existing website and backend working as-is. The Android app is a separate native client that talks to the same backend on localhost during local development.

## 1. Start the backend

From the project root:

```bash
node server.js
```

The backend listens on:

- http://localhost:3001

## 2. Build the Android APK

From the Android project folder:

```bash
cd android/ParakhMobile
$env:JAVA_HOME = 'C:\java\jdk-17.0.20.1+1'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
./gradlew assembleDebug
```

The APK is generated here:

```text
android/ParakhMobile/app/build/outputs/apk/debug/app-debug.apk
```

## 3. Use the web dashboard download button

The dashboard includes a direct download link for the APK from the main site. This keeps the mobile build accessible from the same portal that hosts the web app.

## 4. Notes

- Android uses the Android emulator loopback address `10.0.2.2:3001` by default.
- The web app is the authoritative source for the browser workflow and business rules.
- The native app is additive and should keep the website working exactly as it does today.
