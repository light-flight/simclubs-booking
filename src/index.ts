import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createBot } from "./bot.js";
import { DryRunBookingExecutor } from "./booking/executor.js";
import { SimclubsPlaywrightExecutor } from "./booking/playwrightExecutor.js";
import { IntentParser } from "./llm/intentParser.js";
import { Database } from "./storage/database.js";

const config = loadConfig();
const logger = createLogger(config);
const db = new Database(config);
const intentParser = new IntentParser(config);
const executor =
  config.BOOKING_EXECUTOR === "playwright" ? new SimclubsPlaywrightExecutor(config) : new DryRunBookingExecutor();
const bot = createBot(config, db, intentParser, executor, logger);

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

bot.start({
  onStart: (botInfo) => {
    logger.info({ username: botInfo.username }, "bot started");
  }
});

async function shutdown() {
  logger.info("shutting down");
  await bot.stop();
  await db.close();
}
