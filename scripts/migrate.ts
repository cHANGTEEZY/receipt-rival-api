import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import { pgPoolConfig } from "../src/db/pg-config.ts";

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();

const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "Set DATABASE_URL (and DATABASE_URL_UNPOOLED for Neon migrations)",
  );
}

const pool = new Pool(await pgPoolConfig(migrationUrl));
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully");
} catch (error) {
  const host = (() => {
    try {
      return new URL(migrationUrl).hostname;
    } catch {
      return "your database host";
    }
  })();

  console.error(
    `Migration failed connecting to ${host}:5432.\n` +
      "Port 5432 may be open while node-pg still fails if IPv6 is broken — this script forces IPv4.\n" +
      "Also ensure DATABASE_URL_UNPOOLED is the direct Neon URL (not -pooler).",
  );
  throw error;
} finally {
  await pool.end();
}
