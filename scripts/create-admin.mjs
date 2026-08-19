// Creates (or updates the password for) the single coach/admin account.
// Usage: node scripts/create-admin.mjs coach@example.com "a strong password"
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> "<password>"');
  process.exit(1);
}

const prisma = new PrismaClient();

const passwordHash = await bcrypt.hash(password, 12);

const admin = await prisma.admin.upsert({
  where: { email },
  update: { passwordHash },
  create: { email, passwordHash },
});

console.log(`Admin account ready: ${admin.email}`);
await prisma.$disconnect();
