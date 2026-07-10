/**
 * Seed script — inserts a default admin user if none exists.
 * Tables must already exist (run `npx drizzle-kit push` first).
 *
 * Usage:
 *   SEED_ADMIN_PASSWORD=my-secret npx tsx src/db/seed.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { users } from "./schema";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DB_PATH = process.env.DATABASE_URL ?? path.join(process.cwd(), "data", "trainbank.db");
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@trainbank.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("Error: SEED_ADMIN_PASSWORD environment variable is required.");
  console.error("Usage: SEED_ADMIN_PASSWORD=your-password npx tsx src/db/seed.ts");
  process.exit(1);
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema: { users } });

const existing = db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).get();

if (!existing) {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  db.insert(users).values({
    id: crypto.randomUUID(),
    name: "System Admin",
    email: ADMIN_EMAIL,
    passwordHash: hash,
    role: "admin",
    division: "management",
  }).run();
  console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
} else {
  console.log("ℹ️  Admin user already exists, skipping.");
}

console.log("✅ Seed complete.");
sqlite.close();
