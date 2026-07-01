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
        {/*
          Defensive cache/service-worker cleanup. This origin previously hosted a
          different app (a template) that may have registered a service worker or
          Cache Storage entries. A stale service worker keeps serving the old app
          shell — including inside the Android WebView — even after the server
          starts returning this app. Real Pathshala ships no service worker, so
          unconditionally unregistering any SW and clearing caches here is safe
          and evicts leftovers the moment this HTML loads.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});}).catch(function(){});}if(window.caches&&caches.keys){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});}).catch(function(){});}}catch(e){}})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
