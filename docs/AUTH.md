# Authentication & Google Sign-In

Real Pathshala uses **Auth.js (NextAuth v5)** with two providers:

- **Email + password** (Credentials) — works everywhere, including inside the Android app.
- **Google** (OAuth) — the "Continue with Google" button.

## Why the Google button "did nothing"

The Google provider is only registered when **`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
are set**. If they're missing (the default), Auth.js doesn't expose a `google` provider,
so the old button silently failed.

This is now fixed in the UI: the button checks `/api/auth/providers` and, when Google
isn't configured, it's disabled with a clear "Google sign-in is not configured" note
instead of doing nothing. Any OAuth error is also shown on the login/register page
(via `?error=`). **To actually enable Google sign-in, complete the setup below.**

---

## 1. Create a Google OAuth client (one-time)

1. https://console.cloud.google.com → create/select a project.
2. **APIs & Services → OAuth consent screen** → External → fill app name, support email,
   developer email → add your email as a **Test user** (while in "Testing" mode).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → Application type **Web application**.
4. **Authorized JavaScript origins:**
   - `https://me-woad.vercel.app`
   - `http://localhost:3000`
5. **Authorized redirect URIs** (must match exactly):
   - `https://me-woad.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
6. Copy the **Client ID** and **Client secret**.

## 2. Add the env vars

**Vercel → Settings → Environment Variables** (Production + Preview):

| Variable | Value |
| --- | --- |
| `AUTH_GOOGLE_ID` | the OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | the OAuth Client secret |
| `AUTH_URL` | `https://me-woad.vercel.app` |
| `AUTH_SECRET` | already set (`openssl rand -base64 32`) |

Redeploy. The Google button now redirects to Google and back to `/dashboard`.

> **`redirect_uri_mismatch`?** The redirect URI in Google Cloud must be **exactly**
> `https://<your-domain>/api/auth/callback/google` — including `https` and no trailing slash.

---

## 3. Native Android Google Sign-In (scaffolded)

Google blocks OAuth inside embedded WebViews, so the Android app uses **native** Google
Sign-In instead of the web redirect. This is already wired up:

- **Plugin:** `@codetrix-studio/capacitor-google-auth` (configured in `capacitor.config.ts`
  → `plugins.GoogleAuth`, and synced into `android/`).
- **Client:** the "Continue with Google" button detects the native app and calls the plugin
  to obtain a Google **ID token**.
- **Server:** the `google-id-token` credentials provider (`src/lib/auth.ts`) verifies the
  ID token with `google-auth-library` and signs the user in.

You only need to supply Firebase/Google config:

### 3a. Firebase Authentication
1. https://console.firebase.google.com → create/select a project → **Authentication →
   Sign-in method → enable Google**.
2. **Project settings → Your apps → Add app → Android**, package name **`com.realpathshala.app`**.

### 3b. Add SHA-1 and SHA-256 fingerprints
In Firebase → Android app → **Add fingerprint**, add both the **debug** and **release**
fingerprints:

```bash
# Release (from the signing keystore used by the CI/release build):
keytool -list -v -keystore android/app/release.keystore -alias pathshala
# Debug (default Android debug keystore):
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```
Copy the `SHA1:` and `SHA-256:` lines into Firebase. (Adding fingerprints makes Firebase
create the **Android OAuth client** that lets the app request ID tokens.)

> Using **Play App Signing**? Also add the SHA-1/256 that Google Play shows under
> *Release → Setup → App signing*, or sign-in will fail on Play-installed builds.

### 3c. Add `google-services.json`
Download it from Firebase (Android app → google-services.json) and place it at:

```
android/app/google-services.json
```
(This file is gitignored — provide your own. The Gradle build auto-applies the Google
Services plugin only when it's present, so CI stays green without it.)

### 3d. Set the Web Client ID
Firebase auto-creates a **Web client** (Authentication → Sign-in method → Google → Web SDK
configuration, or Google Cloud → Credentials → "Web client (auto created…)"). Use that
**Web client ID** (it ends in `.apps.googleusercontent.com`) in **three** places — all the
same value:

| Where | Variable / field | Why |
| --- | --- | --- |
| Vercel env | `AUTH_GOOGLE_ID` | web OAuth **and** ID-token verification audience |
| Build env (before `cap sync`) | `GOOGLE_WEB_CLIENT_ID` | native `serverClientId` baked into the app |
| (already done) | `capacitor.config.ts` reads `GOOGLE_WEB_CLIENT_ID` | — |

```bash
export GOOGLE_WEB_CLIENT_ID="<your-web-client-id>.apps.googleusercontent.com"
export CAP_SERVER_URL="https://me-woad.vercel.app"
npx cap sync android      # bakes the client ID into the app
```

### 3e. Build & verify on a device
1. `npm run android:apk` (or push to trigger the **Android Build** GitHub Action) → install
   the APK on a device.
2. Open the app → **Continue with Google** → pick a Google account → you should land on the
   dashboard, signed in.
3. If it fails: `apksigner`/`keytool` SHA must match Firebase; `AUTH_GOOGLE_ID` (server) and
   `GOOGLE_WEB_CLIENT_ID` (app) must be the **same Web client ID**; the package name must be
   `com.realpathshala.app`.

> Email/password sign-in already works inside the app and needs none of this.

---

## Notes

- Admin role: emails in `ADMIN_EMAILS` are promoted to `ADMIN` on first sign-up, including
  via Google (handled by the `createUser` event).
- Sessions are JWT-based; the Prisma adapter persists users/accounts for OAuth.
