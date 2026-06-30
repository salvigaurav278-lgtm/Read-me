import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  events: {
    // Grant ADMIN to configured emails when they first sign up (incl. Google).
    async createUser({ user }) {
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    },
  },
  providers: [
    ...authConfig.providers,
    // Native Android/iOS Google Sign-In: the app obtains a Google ID token via
    // the native plugin and posts it here; we verify it server-side and sign in.
    Credentials({
      id: "google-id-token",
      name: "Google (native)",
      credentials: { idToken: { label: "idToken", type: "text" } },
      async authorize(raw) {
        const idToken = typeof raw?.idToken === "string" ? raw.idToken : null;
        const audience = process.env.AUTH_GOOGLE_ID; // the Web client ID
        if (!idToken || !audience) return null;

        let payload;
        try {
          const ticket = await new OAuth2Client().verifyIdToken({ idToken, audience });
          payload = ticket.getPayload();
        } catch {
          return null;
        }
        if (!payload?.email || payload.email_verified === false) return null;

        const email = payload.email.toLowerCase();
        const role = adminEmails.includes(email) ? "ADMIN" : "TEACHER";
        const user = await prisma.user.upsert({
          where: { email },
          update: { name: payload.name ?? undefined, image: payload.picture ?? undefined },
          create: { email, name: payload.name ?? null, image: payload.picture ?? null, role },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
});
