import pino from "pino";
import type { AppConfig } from "./config.js";

export function createLogger(config: Pick<AppConfig, "LOG_LEVEL" | "NODE_ENV">) {
  return pino({
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: { colorize: true }
          }
        : undefined
  });
}
