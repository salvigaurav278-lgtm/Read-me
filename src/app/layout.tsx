import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Real Pathshala AI — CBSE Content Creator",
  description:
    "AI-powered Notes, PPTs, Tests, Worksheets, DPPs, PYQs, Mind Maps, Lesson Plans & Question Banks for CBSE Class 10, 11 & 12.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
