import type { BookingPlan, BookingResult, StoredUser } from "../domain/types.js";

export interface BookingExecutor {
  prepare(user: StoredUser, plan: BookingPlan): Promise<BookingResult>;
  confirm(user: StoredUser, plan: BookingPlan): Promise<BookingResult>;
}

export class DryRunBookingExecutor implements BookingExecutor {
  async prepare(_user: StoredUser, plan: BookingPlan): Promise<BookingResult> {
    return {
      status: "dry_run",
      message: `Dry-run: ${plan.humanSummary}`
    };
  }

  async confirm(_user: StoredUser, plan: BookingPlan): Promise<BookingResult> {
    return {
      status: "dry_run",
      message: `Dry-run confirmation accepted. Real booking is disabled. ${plan.humanSummary}`
    };
  }
}
