# Looplane for Android

This directory contains a native Android **Trusted Web Activity (TWA)** project that opens the existing app at [looplane-jogger.vercel.app](https://looplane-jogger.vercel.app/). It uses the device's compatible browser, rather than embedding or rewriting the React application. Packaging does not change the website's characters, lessons, scoring, or storage logic.

## Release identity

| Setting | Value |
| --- | --- |
| Application ID | `com.rishirana463.looplane` |
| Version name / code | `1.0.0` / `1` |
| Minimum Android version | Android 7.0, API 24 |
| Compile / target SDK | Android 16, API 36 |
| Launch URL | `https://looplane-jogger.vercel.app/` |

Treat the application ID as permanent once published. Future Play releases must retain that ID, use the registered upload key, and increase the version code.

## Build locally on Windows

Required tools:

- JDK 17.
- Android SDK platform 36 and Build Tools **36.0.0**.
- PowerShell and network access for the first Gradle/dependency download.

From the repository root:

```powershell
pwsh -NoProfile -File .\android\build-release.ps1
```

The script uses `JAVA_HOME` and `ANDROID_HOME` when set, with local fallback paths. Override tool locations when needed:

```powershell
pwsh -NoProfile -File .\android\build-release.ps1 `
  -JdkPath 'C:\path\to\jdk-17' `
  -SdkPath 'C:\path\to\Android\Sdk'
```

It builds the unsigned release, signs the artifacts, verifies their signatures, and prints SHA-256 file hashes. Successful output is written to:

- `outputs/android/Looplane-1.0.0.aab` — signed bundle for a Play Console testing or release upload; **not directly installable**.
- `outputs/android/Looplane-1.0.0.apk` — signed, installable package for Android testing.

Before a future release, update the version fields in `twa-manifest.json` and `app/build.gradle` together. Output filenames are derived automatically from the manifest's `appVersionName`.

## Private signing material

The existing upload keystore and build credentials are stored outside the repository in:

```text
C:/Users/rishi/.codex/private/looplane-android/
```

Keep that directory private and securely back it up with its passwords. Do not commit, upload, or share the keystore or credentials. The build script reads credentials locally and passes passwords through temporary environment variables, not command-line arguments. On another computer, provide the private files securely and use the script's `-KeystorePath` and `-CredentialsPath` options. `upload-certificate.pem` contains only the public certificate and is safe to share.

## Connect the website to Android

The website's `public/.well-known/assetlinks.json` declares the application ID and the **local signing certificate** SHA-256 fingerprint. After deployment, it must be available as JSON over HTTPS, without redirects, at:

[https://looplane-jogger.vercel.app/.well-known/assetlinks.json](https://looplane-jogger.vercel.app/.well-known/assetlinks.json)

The local APK uses this certificate. With **Play App Signing**, the local key normally becomes the **upload key**; Google Play signs installed packages using a separate **app signing key**. After creating the Play Console app:

1. Find the **App signing key certificate** SHA-256 fingerprint in App integrity.
2. Add it to the existing `sha256_cert_fingerprints` array in the website's asset-links file. Retain the local fingerprint for sideload testing.
3. Redeploy the website and verify the live JSON before testing a Play-installed build.

Missing or mismatched certificates can make the app display a browser toolbar. Google and Supabase authentication pages are outside the owned app origin; do not add them as trusted origins merely to hide browser UI.

## Generated source and verification limits

The project was generated with reviewed **Bubblewrap 1.27.0** source. It uses Android Gradle Plugin **8.9.1**, Gradle **8.11.1** with a pinned distribution SHA-256 checksum, and Android Browser Helper **2.7.4**. The minimum SDK was raised to 24 to satisfy that library's requirements. Dependency repositories use Google Maven and Maven Central.

The checked-in Gradle project and `build-release.ps1` are the build entry points. Bubblewrap regeneration can overwrite project customizations; review any regenerated diff, including SDK versions, repositories, and the wrapper checksum, before building.

The first launch needs an internet connection and a compatible installed browser. Offline lessons depend on the website's existing PWA cache being populated; the APK does not bundle the lesson website for an offline first launch.

Package/signature verification does not prove Android device behavior or Google Play approval. Before release, test browser-free launch on the owned origin, sign-in, password recovery, account switching, offline reopening and progress sync, coding exercises, sound, and Android Back navigation. Test again through a Play testing track after adding the Play app-signing certificate. Building these artifacts does not publish the app to Google Play.
