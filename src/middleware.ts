import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe middleware: uses the base config (no Prisma/bcrypt) to gate
// protected routes via the `authorized` callback.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
