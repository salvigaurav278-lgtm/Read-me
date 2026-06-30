"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { Capacitor } from "@capacitor/core";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

/**
 * Self-diagnosing "Continue with Google" button.
 * - Checks whether the Google provider is actually registered (i.e. the
 *   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET env vars are configured). If not, it
 *   surfaces a clear message instead of failing silently.
 * - In the Android/iOS app (Capacitor WebView) it warns that Google blocks
 *   OAuth inside embedded WebViews and points users to email sign-in.
 */
export function GoogleButton() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(Capacitor.isNativePlatform());
    getProviders()
      .then((p) => setAvailable(Boolean(p && "google" in p)))
      .catch(() => setAvailable(false));
  }, []);

  async function onClick() {
    setMessage(null);
    if (available === false) {
      setMessage(
        "Google sign-in isn't configured yet. Please sign in with email below.",
      );
      return;
    }
    try {
      setLoading(true);
      // redirect:true (default) — navigates to Google and back to /dashboard.
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setLoading(false);
      setMessage("Could not start Google sign-in. Please try again or use email.");
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onClick}
        disabled={loading || available === null}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>
      {available === false && (
        <p className="text-xs text-muted-foreground">
          Google sign-in is not configured on this deployment.
        </p>
      )}
      {native && available !== false && (
        <p className="text-xs text-muted-foreground">
          In the app, if Google blocks the in-app browser, please sign in with email.
        </p>
      )}
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  );
}
