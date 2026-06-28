import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { Database } from "./storage/database.js";

const config = loadConfig();
const logger = createLogger(config);
const db = new Database(config);

try {
  const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), "../db/schema.sql");
  const schema = await readFile(schemaPath, "utf8");

  await db.query(schema);
  logger.info("database migrations applied");
} finally {
  await db.close();
}
