import arcjet, { protectSignup, shield, slidingWindow } from "@arcjet/bun";
import { env } from "../../config/env";

export const aj = arcjet({
  key: env.ARCJET_KEY,
  rules: [shield({ mode: "LIVE" })],
});

export const ajApi = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: 60,
    max: 100,
  }),
);

export const ajAuth = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: 60,
    max: 30,
  }),
);

export const ajAuthSignup = aj.withRule(
  protectSignup({
    email: {
      mode: "LIVE",
      deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
    },
    // Expo/RN clients are not browsers; LIVE allow-list mode flags them as bots.
    // Keep email + rate-limit LIVE; dry-run bots so native signup is not blocked.
    bots: {
      mode: "DRY_RUN",
      allow: [],
    },
    rateLimit: {
      mode: "LIVE",
      interval: "10m",
      max: 5,
    },
  }),
);
