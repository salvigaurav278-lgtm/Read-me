/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-lib / pptxgenjs / docx are server-only; keep them external to the bundle.
  serverExternalPackages: ["pdf-lib", "pptxgenjs", "docx", "@google/genai"],
  eslint: {
    // Linting runs as a separate CI step; don't block production builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
