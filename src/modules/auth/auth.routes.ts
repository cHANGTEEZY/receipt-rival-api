import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { arcjetAuthGuard } from "../../middleware/arcjet";
import type { AppVariables } from "../../shared/types/app.types";
import { authController } from "./auth.controller";
import { authDocs } from "./auth.docs";
import { validateAuthBody } from "./auth.middleware";
import { signInSchema, signUpSchema } from "./auth.validator";

export const authRoutes = new Hono<{ Variables: AppVariables }>();

const handleAuth = (c: Parameters<typeof authController.handleAuthRequest>[0]) =>
  authController.handleAuthRequest(c);

authRoutes.post(
  "/sign-up/email",
  arcjetAuthGuard(),
  describeRoute(authDocs.signUp),
  validateAuthBody(signUpSchema),
  handleAuth,
);

authRoutes.post(
  "/sign-in/email",
  arcjetAuthGuard(),
  describeRoute(authDocs.signIn),
  validateAuthBody(signInSchema),
  handleAuth,
);

authRoutes.get(
  "/get-session",
  arcjetAuthGuard(),
  describeRoute(authDocs.getSession),
  handleAuth,
);

authRoutes.post(
  "/sign-out",
  arcjetAuthGuard(),
  describeRoute(authDocs.signOut),
  handleAuth,
);

authRoutes.on(["POST", "GET"], "/*", arcjetAuthGuard(), handleAuth);
