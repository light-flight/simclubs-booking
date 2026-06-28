import { Bot, InlineKeyboard } from "grammy";
import type { Logger } from "pino";
import type { AppConfig } from "./config.js";
import { createBookingPlan, PlanningError } from "./booking/planner.js";
import type { BookingExecutor } from "./booking/executor.js";
import { IntentParser } from "./llm/intentParser.js";
import { Database } from "./storage/database.js";

export function createBot(
  config: AppConfig,
  db: Database,
  intentParser: IntentParser,
  executor: BookingExecutor,
  logger: Logger
): Bot {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  bot.command("start", async (ctx) => {
    await db.getOrCreateUser(ctx.from!.id);
    await ctx.reply(
      [
        "Привет. Я помогу бронировать SimClubs.",
        "Сначала привяжи аккаунт: /link email@example.com",
        "Потом напиши, например: забронируй завтра 90 минут в 12:30"
      ].join("\n")
    );
  });

  bot.command("link", async (ctx) => {
    const email = ctx.match.trim();
    if (!email || !email.includes("@")) {
      await ctx.reply("Напиши так: /link email@example.com");
      return;
    }

    await db.getOrCreateUser(ctx.from!.id);
    await db.setUserEmail(ctx.from!.id, email);
    await ctx.reply(
      [
        "Email сохранил.",
        "Следующий шаг: Playwright login flow с одноразовым кодом SimClubs.",
        "Он будет подключен отдельной командой после фикса селекторов сайта."
      ].join("\n")
    );
  });

  bot.on("message:text", async (ctx) => {
    const telegramUserId = ctx.from!.id;
    const user = await db.getOrCreateUser(telegramUserId);
    const text = ctx.message.text;

    try {
      const intent = await intentParser.parse({
        message: text,
        nowIso: new Date().toISOString(),
        timezone: user.timezone,
        userDefaults: {
          club: user.defaultClubId,
          timezone: user.timezone
        }
      });
      const bookingRequestId = await db.createBookingRequest(user.id, text, intent);
      const plan = createBookingPlan(intent, {
        club: user.defaultClubId,
        timezone: user.timezone
      });

      await db.saveBookingPlan(bookingRequestId, plan);
      const confirmationId = await db.createPendingConfirmation(user.id, bookingRequestId, plan);

      const prepared = await executor.prepare(user, plan);
      const keyboard = new InlineKeyboard()
        .text("Забронировать", `confirm:${confirmationId}`)
        .text("Отмена", `cancel:${confirmationId}`);

      await ctx.reply([plan.humanSummary, prepared.message, "Подтвердить?"].join("\n"), {
        reply_markup: keyboard
      });
    } catch (error) {
      logger.warn({ error }, "failed to process message");

      if (error instanceof PlanningError) {
        await ctx.reply(error.message);
        return;
      }

      await ctx.reply("Не смог разобрать запрос. Попробуй так: забронируй завтра 90 минут в 12:30");
    }
  });

  bot.callbackQuery(/^confirm:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const confirmationId = ctx.match[1];
    const user = await db.getOrCreateUser(ctx.from!.id);
    const pending = await db.getPendingConfirmation(confirmationId, user.id);

    if (!pending || pending.status !== "pending") {
      await ctx.reply("Это подтверждение уже неактивно.");
      return;
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      await db.markPendingConfirmation(confirmationId, "expired");
      await ctx.reply("Подтверждение истекло. Отправь запрос заново.");
      return;
    }

    try {
      const result = await executor.confirm(user, pending.bookingPlan);
      await db.recordBookingAttempt(pending.bookingRequestId, config.BOOKING_EXECUTOR, result);
      await db.markPendingConfirmation(confirmationId, result.status === "failed" ? "pending" : "confirmed");
      await ctx.reply(result.message);
    } catch (error) {
      const failed = {
        status: "failed" as const,
        message: error instanceof Error ? error.message : "Unknown executor error"
      };
      await db.recordBookingAttempt(
        pending.bookingRequestId,
        config.BOOKING_EXECUTOR,
        failed,
        error instanceof Error ? error : undefined
      );
      await ctx.reply("Не смог выполнить бронирование. Я записал ошибку в attempts.");
    }
  });

  bot.callbackQuery(/^cancel:(.+)$/, async (ctx) => {
    const confirmationId = ctx.match[1];
    await db.markPendingConfirmation(confirmationId, "cancelled");
    await ctx.answerCallbackQuery("Отменено");
    await ctx.editMessageReplyMarkup();
  });

  return bot;
}
