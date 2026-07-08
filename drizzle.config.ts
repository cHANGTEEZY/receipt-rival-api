import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

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

// With `pg` installed, drizzle-kit uses it for CLI. Without `pg`, Neon URLs use
// `@neondatabase/serverless` and `migrate`/`push` often fail. For Neon, set
// DATABASE_URL_UNPOOLED (direct / non-pooled) for migrations.
const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "Set DATABASE_URL (and optionally DATABASE_URL_UNPOOLED for Neon migrations)",
  );
}

/** Neon copy-paste URLs often include `channel_binding=require`; node-pg commonly fails on it. */
function urlForPgCli(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

export default defineConfig({
  schema: ["src/db/schema/index.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: urlForPgCli(migrationUrl),
  },
});
