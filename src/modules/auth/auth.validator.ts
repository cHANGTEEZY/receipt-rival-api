import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z
      .string({ error: "Name is required" })
      .min(1, "Name is required")
      .meta({
        description: "Display name",
        example: "Jane Doe",
      }),
    email: z.email("A valid email is required").meta({
      description: "Account email",
      example: "jane@example.com",
      pattern: undefined,
    }),
    password: z
      .string({ error: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .meta({
        description: "Password (min 8 characters)",
        example: "securePass123",
      }),
  })
  .meta({
    example: {
      name: "Jane Doe",
      email: "jane@example.com",
      password: "securePass123",
    },
  });

export const signInSchema = z
  .object({
    email: z.email("A valid email is required").meta({
      description: "Account email",
      example: "jane@example.com",
      pattern: undefined,
    }),
    password: z.string().min(1, "Password is required").meta({
      description: "Account password",
      example: "securePass123",
    }),
  })
  .meta({
    example: {
      email: "jane@example.com",
      password: "securePass123",
    },
  });

export const authSignupBodySchema = z.object({
  email: z.email().optional(),
});

export function formatAuthValidationMessage(error: z.ZodError): string {
  const messages = error.issues.map((issue) => {
    const field = issue.path.join(".");
    if (issue.code === "invalid_type" && issue.input === undefined && field) {
      return `${field} is required`;
    }
    return issue.message;
  });

  return [...new Set(messages)].join(". ");
}
