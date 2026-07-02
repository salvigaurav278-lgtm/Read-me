/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-lib / fontkit / pptxgenjs / docx are server-only; keep them external.
  serverExternalPackages: [
    "pdf-lib",
    "@pdf-lib/fontkit",
    "pptxgenjs",
    "docx",
    "@google/genai",
    "google-auth-library",
    "sharp",
    "@vercel/blob",
  ],
  // Ship the vendored Unicode fonts with the export serverless function so
  // pdf-lib can embed them at runtime (falls back to sanitized text if absent).
  outputFileTracingIncludes: {
    "/api/projects/[id]/export": [
      "./src/lib/generators/fonts/*.ttf",
      "./assets/diagrams/*",
    ],
    "/api/admin/diagrams/preview": [
      "./src/lib/generators/fonts/*.ttf",
      "./assets/diagrams/*",
    ],
  },
  eslint: {
    // Linting runs as a separate CI step; don't block production builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
