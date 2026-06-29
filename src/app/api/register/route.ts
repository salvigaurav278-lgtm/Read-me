import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const role: UserRole = adminEmails.includes(email) ? "ADMIN" : "TEACHER";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role } });

  return NextResponse.json({ ok: true }, { status: 201 });
}
