import { PrismaClient } from "@prisma/client";
import { CHAPTERS } from "../src/lib/curriculum";

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${CHAPTERS.length} CBSE chapters…`);

  for (const ch of CHAPTERS) {
    await prisma.chapter.upsert({
      where: {
        classLevel_subject_number: {
          classLevel: ch.classLevel,
          subject: ch.subject,
          number: ch.number,
        },
      },
      update: { name: ch.name },
      create: ch,
    });
  }

  // Promote configured admin emails if those users already exist.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  for (const email of adminEmails) {
    const updated = await prisma.user.updateMany({
      where: { email },
      data: { role: "ADMIN" },
    });
    if (updated.count > 0) console.log(`Promoted ${email} to ADMIN.`);
  }

  console.log("Seed complete ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
