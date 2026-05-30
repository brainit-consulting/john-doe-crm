import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  OWNER_EMAIL: z.string().email("OWNER_EMAIL must be a valid email"),
  // Optional — these gate the trunk's demo modules (Resend email, AI-gateway chat,
  // Vercel Blob) that the John Doe CRM spec does not use. Spec wins: not required.
  // When present, they're still format-validated; when absent, the feature is off.
  RESEND_API_KEY: z
    .string()
    .startsWith("re_", "RESEND_API_KEY must start with re_")
    .optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email address").optional(),
  AI_GATEWAY_API_KEY: z
    .string()
    .startsWith("vck_", "AI_GATEWAY_API_KEY must start with vck_")
    .optional(),
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .startsWith(
      "vercel_blob_rw_",
      "BLOB_READ_WRITE_TOKEN must start with vercel_blob_rw_",
    )
    .optional(),
  // Optional — gates the Whisper server-transcription path in T6 dictation.
  // When absent the feature gracefully falls back to Web Speech (browser).
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${formatted}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
