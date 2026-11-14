#!/usr/bin/env node
/**
 * Remet d'accord l'historique de Prisma avec la base réelle, avant `prisma migrate deploy`.
 *
 * Cas réglé : une base créée ou mise à jour sans `migrate deploy` (par exemple avec
 * `prisma db push`) a déjà les tables, mais la table `_prisma_migrations` n'en garde pas la
 * trace. `migrate deploy` voudrait alors tout recréer et échoue (« table "User" already exists »).
 *
 * Pour chaque migration pas encore notée comme appliquée, on vérifie dans la base si ce
 * qu'elle crée (tables, colonnes, index) est déjà là :
 *   - tout est là          → on la note comme appliquée (`prisma migrate resolve --applied`) ;
 *   - rien n'est là        → on s'arrête : `migrate deploy` l'appliquera normalement
 *                            (si une tentative ratée traîne, on la note « annulée » pour la rejouer) ;
 *   - c'est à moitié là    → on s'arrête et on explique : il faut regarder à la main.
 *
 * Usage : node --no-warnings deploy/baseline-migrations.mjs [chemin/de/la/base.db]
 * Ne lit que la base ; seules les commandes `prisma migrate resolve` écrivent l'historique.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dbPath = path.resolve(root, process.argv[2] ?? "data/hottelist.db");
const migDir = path.join(root, "prisma/migrations");

if (!existsSync(dbPath)) {
  console.log("  pas encore de base : migrate deploy va la créer");
  process.exit(0);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name));
const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map((r) => r.name));
const columns = (t) => new Set(db.prepare(`PRAGMA table_info("${t.replace(/"/g, '""')}")`).all().map((r) => r.name));

// Historique de Prisma
const applied = new Set();
const failed = new Set();
if (tables.has("_prisma_migrations")) {
  for (const r of db.prepare("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations").all()) {
    if (r.rolled_back_at) continue;
    if (r.finished_at) applied.add(r.migration_name);
    else failed.add(r.migration_name);
  }
}

/** Ce qu'une migration doit laisser dans la base : tables, colonnes, index. */
function expectations(sql) {
  const exp = [];
  // CREATE TABLE "X" ( … ) : la table et ses colonnes ("new_X" = table X redéfinie)
  for (const m of sql.matchAll(/CREATE TABLE "([^"]+)" \(([\s\S]*?)\n\);/g)) {
    const table = m[1].replace(/^new_/, "");
    exp.push({ kind: "table", table });
    for (const line of m[2].split("\n")) {
      const c = line.match(/^\s+"([^"]+)"\s+[A-Z]/);
      if (c) exp.push({ kind: "column", table, column: c[1] });
    }
  }
  for (const m of sql.matchAll(/ALTER TABLE "([^"]+)" ADD COLUMN "([^"]+)"/g)) {
    exp.push({ kind: "column", table: m[1].replace(/^new_/, ""), column: m[2] });
  }
  for (const m of sql.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g)) exp.push({ kind: "index", index: m[1] });
  return exp;
}

const present = (e) =>
  e.kind === "table" ? tables.has(e.table) : e.kind === "index" ? indexes.has(e.index) : tables.has(e.table) && columns(e.table).has(e.column);
const label = (e) => (e.kind === "table" ? `table ${e.table}` : e.kind === "index" ? `index ${e.index}` : `colonne ${e.table}.${e.column}`);

const toApply = [];
let toRollBack = null;
for (const name of readdirSync(migDir).filter((d) => existsSync(path.join(migDir, d, "migration.sql"))).sort()) {
  if (applied.has(name)) continue;
  const exp = expectations(readFileSync(path.join(migDir, name, "migration.sql"), "utf8"));
  const missing = exp.filter((e) => !present(e));
  if (exp.length && missing.length === 0) {
    toApply.push(name);
    continue;
  }
  if (missing.length === exp.length) {
    // Rien de cette migration dans la base : migrate deploy s'en chargera (et des suivantes)
    if (failed.has(name)) toRollBack = name;
    break;
  }
  db.close();
  console.error(`\n  La migration ${name} est à moitié présente dans la base. Il manque :`);
  for (const e of missing) console.error(`    - ${label(e)}`);
  console.error("  À régler à la main (la sauvegarde de la base est dans data/backups/).");
  process.exit(1);
}
db.close();

const prisma = (...args) => {
  try {
    execFileSync("npx", ["prisma", "migrate", "resolve", ...args], { cwd: root, stdio: "pipe", env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" } });
  } catch (e) {
    console.error(String(e.stdout ?? "") + String(e.stderr ?? ""));
    throw new Error(`prisma migrate resolve ${args.join(" ")} a échoué`);
  }
};

if (!toApply.length && !toRollBack) {
  console.log("  historique des migrations à jour");
  process.exit(0);
}
for (const name of toApply) {
  prisma("--applied", name);
  console.log(`  ${name} : déjà dans la base, notée comme appliquée`);
}
if (toRollBack) {
  prisma("--rolled-back", toRollBack);
  console.log(`  ${toRollBack} : tentative ratée effacée, elle va être rejouée`);
}
