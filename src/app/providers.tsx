"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { NativeChrome } from "@/components/layout/native-chrome";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NativeChrome />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
