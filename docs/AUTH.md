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

## 3. Android (the important caveat)

**Google deliberately blocks OAuth inside embedded WebViews** (error
`disallowed_useragent` / "This browser or app may not be secure"). Because the Capacitor
Android app loads the site in a WebView, the **web** Google redirect flow will not reliably
complete in the app — this is a Google policy, not an app bug.

What works today in the Android app:

- ✅ **Email + password** sign-in (fully works inside the WebView).
- ✅ Google sign-in in any **normal mobile/desktop browser**.

To support **native Google sign-in inside the app**, the correct pattern is:

1. Add a native Google Sign-In plugin (e.g. `@codetrix-studio/capacitor-google-auth`).
2. Configure it with your **Web client ID** and the Android app's **SHA-1** signing
   fingerprint (from your release keystore) in Google Cloud / Firebase.
3. Get a Google **ID token** natively, POST it to a server endpoint that verifies it
   (e.g. with `google-auth-library`) and establishes the Auth.js session via a
   credentials provider.

This needs your Google/Firebase config + the keystore SHA-1 + an APK rebuild and on-device
testing. It's scaffolded as a follow-up — ask and it can be wired in. Until then, the app
uses email sign-in and Google works on the web.

---

## Notes

- Admin role: emails in `ADMIN_EMAILS` are promoted to `ADMIN` on first sign-up, including
  via Google (handled by the `createUser` event).
- Sessions are JWT-based; the Prisma adapter persists users/accounts for OAuth.
