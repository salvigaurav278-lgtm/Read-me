# Android App (Capacitor)

Real Pathshala AI ships an Android wrapper built with **Capacitor 7**. Because the app
is server-rendered (Next.js SSR + API routes + Auth.js + Prisma), the native shell loads
your **deployed** app over HTTPS rather than bundling a static export. The native layer
adds Camera, Microphone, File picker, Notifications and Download/Share capabilities.

> ⚠️ **Build environment note.** The APK/AAB could **not** be compiled in the cloud
> sandbox that scaffolded this project: its network policy blocks `dl.google.com` and
> `maven.google.com` (the Android SDK, the Android Gradle Plugin and all AndroidX
> libraries — none of which are mirrored on Maven Central). Everything else is done and
> committed; run the build on your machine / Android Studio / normal CI, where those hosts
> are reachable. The exact commands are below.

---

## Automated build (GitHub Actions) — recommended

`.github/workflows/android.yml` builds the **debug APK**, the **release APK** and the
**release AAB** on a GitHub-hosted runner (which can reach Google's servers) and uploads
them as artifacts.

- It runs automatically on any push that touches `android/**`, `capacitor.config.ts`,
  `cap-www/**` or the workflow itself, and can be triggered manually (**Actions → Android
  Build → Run workflow**) once the workflow is on the default branch.
- Set a repository **variable** `CAP_SERVER_URL` (Settings → Secrets and variables →
  Actions → Variables) to your deployed URL so the WebView loads the right server.
- For a **signed** APK/AAB, add these repository **secrets** (otherwise the release
  APK/AAB are unsigned): `ANDROID_KEYSTORE_BASE64` (`base64 -w0 android/app/release.keystore`),
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. When present, the
  CI step writes them into `android/keystore.properties` and Gradle signs both outputs.
- Download the built `app-debug-apk` / `app-release-apk` / `app-release-aab` from the
  workflow run's **Artifacts** section.

The manual/local route below is equivalent and useful for Android Studio debugging.

---

## What's already configured

- `capacitor.config.ts` — `appId: com.realpathshala.app`, loads `CAP_SERVER_URL`
- `android/` — full Gradle project with 9 Capacitor plugins synced
- **Permissions** (`AndroidManifest.xml`): Internet, Camera, Microphone (`RECORD_AUDIO`),
  Notifications (`POST_NOTIFICATIONS`), media/file access, legacy storage write for downloads
- **App icon** — branded adaptive icon (indigo `#4F46E5` + white **Sparkles** brand mark,
  matching the web app), with legacy square/round PNGs and an Android-13 **themed (monochrome)**
  layer. Regenerate with `node scripts/gen-android-icons.mjs`.
- **Pull-to-refresh** — `MainActivity` wraps the bridge WebView in a `SwipeRefreshLayout`
  (native Material spinner, top-of-page only)
- **Splash screen** — brand-colour full-screen/immersive splash + Android-12 splash theme
- **Release signing** — `signingConfigs.release` wired to `keystore.properties` (gitignored)
- **Plugins installed:** `@capacitor/camera`, `@capacitor/filesystem`,
  `@capacitor/push-notifications`, `@capacitor/local-notifications`, `@capacitor/share`,
  `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/app`, `@capacitor/device`

---

## Prerequisites (on your build machine)

1. **JDK 21** and **Android Studio** (or the Android command-line tools).
2. Android SDK: **Platform 35**, **Build-Tools 35.0.0**, **Platform-Tools**.
   ```bash
   sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
   ```
3. Create `android/local.properties` with your SDK path (Android Studio does this for you):
   ```
   sdk.dir=/Users/you/Library/Android/sdk     # or $ANDROID_HOME
   ```

---

## 1. Point the app at your deployed server

```bash
export CAP_SERVER_URL="https://your-app.vercel.app"   # your deployed Next.js URL
npx cap sync android
```

`cap sync` copies the config + plugins into the Android project. Re-run it whenever you
change `CAP_SERVER_URL`, add a plugin, or update `capacitor.config.ts`.

> For local testing against `npm run dev`, set `CAP_SERVER_URL` to your machine's LAN IP
> (e.g. `http://192.168.1.5:3000`) and temporarily allow cleartext in
> `capacitor.config.ts` (`server.cleartext = true`, `android.allowMixedContent = true`).

## 2. Debug APK (installable, for testing)

```bash
npm run android:apk
# → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Or open in Android Studio: `npx cap open android` → **Run ▶**.

## 3. Release AAB (for Google Play)

The keystore is read from `android/keystore.properties` (gitignored). Generate one once:

```bash
keytool -genkeypair -v -keystore android/app/release.keystore -alias pathshala \
  -keyalg RSA -keysize 2048 -validity 10000
# create android/keystore.properties from keystore.properties.example
```

Then:

```bash
npm run android:aab
# → android/app/build/outputs/bundle/release/app-release.aab
```

Upload the `.aab` to the Google Play Console. (For a self-distributed signed APK use
`./gradlew assembleRelease`.)

---

## 4. App icon & splash (full bleed)

A branded vector icon and a solid brand-colour splash are already in place. To regenerate a
richer raster icon set from a 1024×1024 logo on a machine where `sharp` installs:

```bash
npm i -D @capacitor/assets
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#4F46E5' --splashBackgroundColor '#4F46E5'
# expects assets/logo.png (1024) and assets/splash.png (2732)
```

To just refresh the solid splash colour: `npm run cap:splash`.

---

## 5. Using the native plugins from the web app

The WebView loads your hosted site, so to *call* native features add `@capacitor/core` to
the Next.js app and guard calls with `Capacitor.isNativePlatform()`. Examples:

```ts
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { PushNotifications } from "@capacitor/push-notifications";

if (Capacitor.isNativePlatform()) {
  // Camera
  const photo = await Camera.getPhoto({ resultType: CameraResultType.Uri });

  // Save a generated export to the device (Download support)
  await Filesystem.writeFile({ path: "notes.pdf", data: base64, directory: Directory.Documents });

  // Push notifications (needs Firebase google-services.json — see below)
  await PushNotifications.requestPermissions();
  await PushNotifications.register();
}
```

- **Microphone** works through the WebView's `getUserMedia` once `RECORD_AUDIO` is granted
  (permission is declared in the manifest).
- **File picker** uses the standard `<input type="file">` / Camera plugin gallery.
- **Download** of generated PDF/DOCX/PPTX: on native, write the export blob via
  `@capacitor/filesystem` (above) instead of an `<a download>`; on web it stays as-is.

### Push notifications (FCM) — one extra step

Cloud push requires Firebase Cloud Messaging:
1. Create a Firebase project, add an Android app with id `com.realpathshala.app`.
2. Download `google-services.json` into `android/app/`.
3. The `google-services` Gradle plugin is already on the classpath; rebuild.

Local notifications (`@capacitor/local-notifications`) work without Firebase.

---

## Troubleshooting

- **`SDK location not found`** — create `android/local.properties` with `sdk.dir=...`.
- **Gradle can't download the Android Gradle Plugin / AndroidX** — your network must allow
  `dl.google.com` and `maven.google.com` (this is what blocked the sandbox build).
- **Blank screen** — `CAP_SERVER_URL` is wrong/unreachable, or HTTPS is required; confirm the
  deployed URL loads in a mobile browser first.
