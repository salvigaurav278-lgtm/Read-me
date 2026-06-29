import type { CapacitorConfig } from "@capacitor/cli";

// This app is server-rendered (Next.js SSR + API routes + Auth.js + Prisma),
// so the native shell loads the *hosted* app over HTTPS rather than bundling a
// static export. Set CAP_SERVER_URL to your deployed domain before `cap sync`.
const serverUrl = process.env.CAP_SERVER_URL || "https://real-pathshala-ai.vercel.app";

const config: CapacitorConfig = {
  appId: "com.realpathshala.app",
  appName: "Real Pathshala AI",
  // Local fallback page (shown only if the remote server can't be reached).
  webDir: "cap-www",
  server: {
    url: serverUrl,
    androidScheme: "https",
    // Allow the WebView to navigate within your app's domain(s).
    allowNavigation: [new URL(serverUrl).host],
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#4F46E5",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
