import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-5.4-mini"),
  OPENAI_FALLBACK_MODEL: z.string().default("gpt-5.5"),
  DATABASE_URL: z.string().url(),
  SESSION_ENCRYPTION_KEY: z.string().min(32),
  BOOKING_EXECUTOR: z.enum(["dry-run", "playwright"]).default("dry-run"),
  HEADLESS: z
    .string()
    .default("true")
    .transform((value) => value !== "false"),
  SIMCLUBS_BOOKING_URL: z.string().url().default("https://simclubs.ru/booking")
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  return envSchema.parse(process.env);
}
