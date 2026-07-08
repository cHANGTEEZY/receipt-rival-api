import dns from "node:dns";
import type { PoolConfig } from "pg";

type PgPoolConfig = PoolConfig & {
  lookup?: (
    hostname: string,
    options: unknown,
    callback: (
      err: NodeJS.ErrnoException | null,
      address: string,
      family?: number,
    ) => void,
  ) => void;
};

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

/** Prefer IPv4 so pg does not fail when IPv6 routes are unreachable (common on some networks). */
export function pgPoolConfig(connectionString: string): PgPoolConfig {
  return {
    connectionString: urlForPg(connectionString),
    connectionTimeoutMillis: 15_000,
    lookup: (hostname, _options, callback) => {
      dns.lookup(hostname, { family: 4 }, callback);
    },
  };
}
