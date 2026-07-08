import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import { pgPoolConfig } from "./pg-config";
import * as schema from "./schema";

export const pool = new Pool(pgPoolConfig(env.DATABASE_URL));

export const db = drizzle(pool, { schema });
