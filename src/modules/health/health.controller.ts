import type { Context } from "hono";
import type { AppVariables } from "../../shared/types/app.types";

type HealthContext = Context<{ Variables: AppVariables }>;

export const healthController = {
  async getHealth(c: HealthContext) {
    return c.json({ message: "OK" });
  },
};
