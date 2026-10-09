import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME ?? "TradeLab Admin";
  if (!email || !password) {
    throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD. Do not commit them.");
  }
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.info("A super admin already exists. Bootstrap did nothing.");
    return;
  }
  if (password.length < 10) throw new Error("Bootstrap password must be at least 10 characters.");
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({ data: { email, name, passwordHash, role: "SUPER_ADMIN", tradingEnabled: false } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "setup.bootstrap", targetType: "User", targetId: user.id, reason: "Bootstrap command created the first super admin." } });
  console.info(`Created super admin ${email}. Remove the bootstrap password from the environment after signing in.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
