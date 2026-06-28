import { chromium, type BrowserContextOptions } from "playwright";
import type { AppConfig } from "../config.js";
import type { BookingExecutor } from "./executor.js";
import type { BookingPlan, BookingResult, StoredUser } from "../domain/types.js";
import { decryptJson } from "../security/encryption.js";

export class SimclubsPlaywrightExecutor implements BookingExecutor {
  constructor(private readonly config: Pick<AppConfig, "HEADLESS" | "SIMCLUBS_BOOKING_URL" | "SESSION_ENCRYPTION_KEY">) {}

  async prepare(user: StoredUser, plan: BookingPlan): Promise<BookingResult> {
    const browser = await chromium.launch({ headless: this.config.HEADLESS });
    try {
      const storageState = user.encryptedStorageState
        ? (decryptJson(this.config.SESSION_ENCRYPTION_KEY, user.encryptedStorageState) as BrowserContextOptions["storageState"])
        : undefined;
      const context = await browser.newContext(storageState ? { storageState } : undefined);
      const page = await context.newPage();

      await page.goto(this.config.SIMCLUBS_BOOKING_URL, { waitUntil: "domcontentloaded" });

      return {
        status: "dry_run",
        message: [
          "Playwright reached SimClubs booking page.",
          "Selector automation is intentionally not wired to final booking yet.",
          plan.humanSummary
        ].join(" ")
      };
    } finally {
      await browser.close();
    }
  }

  async confirm(_user: StoredUser, plan: BookingPlan): Promise<BookingResult> {
    return {
      status: "failed",
      message: `Real confirmation is not implemented yet: ${plan.humanSummary}`
    };
  }
}
