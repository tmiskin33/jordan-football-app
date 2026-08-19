// Removes an admin account by email.
// Usage: node scripts/delete-admin.mjs coach@example.com
import { PrismaClient } from "@prisma/client";

const [, , email] = process.argv;
if (!email) {
  console.error("Usage: node scripts/delete-admin.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
await prisma.admin.deleteMany({ where: { email } });
console.log(`Removed admin account (if it existed): ${email}`);
await prisma.$disconnect();
