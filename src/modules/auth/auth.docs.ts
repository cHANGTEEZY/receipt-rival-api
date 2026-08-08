import { resolver } from "hono-openapi";
import { z } from "zod";

export const authTags = ["Auth"];

export const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const authSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.coerce.date(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const authSuccessSchema = z.object({
  user: authUserSchema,
  session: authSessionSchema,
});

export const sessionResponseSchema = z.object({
  session: authSessionSchema.nullable(),
  user: authUserSchema.nullable(),
});

export const signOutResponseSchema = z.object({
  success: z.boolean(),
});

export const authErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

export const authDocs = {
  signUp: {
    tags: authTags,
    summary: "Sign up with email and password",
    description:
      "Creates a new user account via Better Auth and establishes a session cookie.",
    responses: {
      200: {
        description: "User created and session established",
        content: {
          "application/json": {
            schema: resolver(authSuccessSchema),
          },
        },
      },
      400: {
        description: "Invalid email, password, or validation error",
        content: {
          "application/json": {
            schema: resolver(authErrorSchema),
          },
        },
      },
      429: {
        description: "Rate limited or signup abuse blocked",
      },
    },
  },
  signIn: {
    tags: authTags,
    summary: "Sign in with email and password",
    description:
      "Authenticates a user via Better Auth and establishes a session cookie.",
    responses: {
      200: {
        description: "Session established",
        content: {
          "application/json": {
            schema: resolver(authSuccessSchema),
          },
        },
      },
      401: {
        description: "Invalid credentials",
        content: {
          "application/json": {
            schema: resolver(authErrorSchema),
          },
        },
      },
      429: {
        description: "Too many auth attempts",
      },
    },
  },
  getSession: {
    tags: authTags,
    summary: "Get current session",
    description:
      "Returns the active Better Auth session for the request cookies.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Session payload",
        content: {
          "application/json": {
            schema: resolver(sessionResponseSchema),
          },
        },
      },
    },
  },
  signOut: {
    tags: authTags,
    summary: "Sign out",
    description: "Invalidates the current Better Auth session cookie.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Signed out successfully",
        content: {
          "application/json": {
            schema: resolver(signOutResponseSchema),
          },
        },
      },
    },
  },
};
