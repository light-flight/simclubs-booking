import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-5.4-mini"),
  OPENAI_FALLBACK_MODEL: z.string().default("gpt-5.5"),
  DATABASE_URL: z.string().url().optional(),
  POSTGRES_USER: z.string().default("simclubs"),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.string().default("5432"),
  POSTGRES_DB: z.string().default("simclubs_booking"),
  SESSION_ENCRYPTION_KEY: z.string().min(32),
  BOOKING_EXECUTOR: z.enum(["dry-run", "playwright"]).default("dry-run"),
  HEADLESS: z
    .string()
    .default("true")
    .transform((value) => value !== "false"),
  SIMCLUBS_BOOKING_URL: z.string().url().default("https://simclubs.ru/booking")
}).superRefine((env, ctx) => {
  if (!env.DATABASE_URL && !env.POSTGRES_PASSWORD) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["POSTGRES_PASSWORD"],
      message: "POSTGRES_PASSWORD is required when DATABASE_URL is not set"
    });
  }
}).transform((env) => ({
  ...env,
  DATABASE_URL:
    env.DATABASE_URL ??
    `postgres://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD!)}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`
}));

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  return envSchema.parse(process.env);
}
