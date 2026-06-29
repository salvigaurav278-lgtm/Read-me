import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import type { UserRole } from "@prisma/client";
import Google from "next-auth/providers/google";

// Edge-safe base config shared by the middleware and the full Node config.
// No Prisma / bcrypt imports here so it can run in the edge runtime.
const providers: Provider[] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const authConfig = {
  // Trust the deploy host (Vercel sets this automatically; required for
  // self-hosted / preview hosts so Auth.js doesn't reject the request host).
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/generate") ||
        nextUrl.pathname.startsWith("/history") ||
        nextUrl.pathname.startsWith("/saved") ||
        nextUrl.pathname.startsWith("/projects") ||
        nextUrl.pathname.startsWith("/admin");
      if (isProtected && !isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as UserRole;
      return session;
    },
  },
} satisfies NextAuthConfig;
