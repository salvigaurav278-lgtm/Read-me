"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

// Friendly messages for the error codes Auth.js appends to /login?error=...
const MESSAGES: Record<string, string> = {
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in failed on the way back. Please try again.",
  OAuthCreateAccount: "Could not create your account from Google. Please try again.",
  OAuthAccountNotLinked:
    "This email is already registered with a password. Sign in with email instead.",
  Callback: "Sign-in callback failed. Please try again.",
  AccessDenied: "Access was denied. Please grant permission and try again.",
  Configuration:
    "Google sign-in is misconfigured (check the OAuth client ID/secret and the authorized redirect URI).",
  CredentialsSignin: "Invalid email or password.",
  Verification: "This sign-in link is no longer valid.",
  default: "Something went wrong while signing in. Please try again.",
};

function AuthErrorInner() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  const msg = MESSAGES[error] ?? MESSAGES.default;
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

export function AuthError() {
  return (
    <Suspense fallback={null}>
      <AuthErrorInner />
    </Suspense>
  );
}
