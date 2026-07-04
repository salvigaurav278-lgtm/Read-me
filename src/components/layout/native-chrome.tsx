"use client";

import { useEffect } from "react";

/**
 * Native (Android/iOS) window chrome for the Capacitor shell.
 *
 * Android 15 (targetSdk 35) enforces edge-to-edge, so by default the WebView
 * draws *behind* the status bar and the app content is jammed under the clock/
 * icons. This tells the status bar not to overlay the WebView (content sits
 * below it) and paints the bar to match the current light/dark theme, keeping
 * it in sync when the user toggles themes. No-op on the web.
 */
export function NativeChrome() {
  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { StatusBar, Style } = await import("@capacitor/status-bar");
      if (cancelled) return;

      // Push the web content below the status bar instead of behind it.
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

      const apply = async () => {
        const dark = document.documentElement.classList.contains("dark");
        // Match the app background: dark navy (#0B1120) or white.
        try {
          await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
          await StatusBar.setBackgroundColor({ color: dark ? "#0B1120" : "#FFFFFF" });
        } catch {
          /* iOS has no setBackgroundColor — style alone is fine */
        }
      };
      await apply();

      // Re-apply whenever next-themes flips the `class` on <html>.
      observer = new MutationObserver(apply);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return null;
}
