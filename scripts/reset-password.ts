// Usage : npm run reset-password -- <identifiant> [nouveau-mot-de-passe]
// Sans mot de passe fourni, un mot de passe provisoire est généré et affiché.
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const db = new PrismaClient();

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function main() {
  const [loginArg, pwArg] = process.argv.slice(2);
  if (!loginArg) {
    console.error("Usage : npm run reset-password -- <identifiant> [nouveau-mot-de-passe]");
    const users = await db.user.findMany({ where: { login: { not: null } }, select: { login: true, firstName: true } });
    console.error("\nComptes existants :\n" + users.map((u) => `  ${u.login} (${u.firstName})`).join("\n"));
    process.exit(1);
  }
  const login = loginArg.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { login } });
  if (!user) {
    console.error(`Aucun compte avec l'identifiant « ${login} ».`);
    process.exit(1);
  }
  const password = pwArg ?? randomBytes(6).toString("base64url");
  if (password.length < 8 && pwArg) {
    console.error("Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId: user.id } });
  console.log(`Mot de passe de ${user.firstName} (${login}) changé${pwArg ? "." : ` : ${password}`}`);
}

main().finally(() => db.$disconnect());
