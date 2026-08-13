import dns from "node:dns/promises";
import type { PoolConfig } from "pg";

type PgPoolConfig = PoolConfig;

/** Neon copy-paste URLs often include `channel_binding=require`; node-pg commonly fails on it. */
export function urlForPg(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

function sslFromUrl(u: URL): PoolConfig["ssl"] {
  const mode = (u.searchParams.get("sslmode") ?? "").toLowerCase();
  if (!mode || mode === "disable") return false;
  // verify-full / verify-ca / require — keep SNI as the original hostname when
  // we connect via a pinned IPv4 address (see pgPoolConfig).
  return {
    rejectUnauthorized: mode !== "require" && mode !== "no-verify",
    servername: u.hostname,
  };
}

/**
 * Build a `pg` Pool config that works under both Node and Bun.
 *
 * Bun ignores Pool `lookup` and uses Happy Eyeballs; Neon IPv6 endpoints often
 * fail here (ETIMEDOUT / ECONNREFUSED). Pin IPv4 and keep TLS SNI as the
 * hostname so `sslmode=verify-full` still validates.
 */
export async function pgPoolConfig(
  connectionString: string,
): Promise<PgPoolConfig> {
  const cleaned = urlForPg(connectionString);
  const u = new URL(cleaned);

  // Vercel Functions connect by hostname. IPv4 pinning is a local Bun workaround
  // for Neon's unreachable AAAA records and can fail in Vercel's network.
  if (process.env.VERCEL) {
    return {
      connectionString: cleaned,
      connectionTimeoutMillis: 15_000,
    };
  }

  try {
    const { address } = await dns.lookup(u.hostname, { family: 4 });

    return {
      host: address,
      port: Number(u.port || 5432),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, "")),
      ssl: sslFromUrl(u),
      connectionTimeoutMillis: 15_000,
    };
  } catch {
    return {
      connectionString: cleaned,
      connectionTimeoutMillis: 15_000,
    };
  }
}
