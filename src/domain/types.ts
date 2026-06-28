export type BookingIntentName =
  | "book_slot"
  | "show_availability"
  | "link_account"
  | "unlink_account"
  | "unknown";

export type BookingIntent = {
  intent: BookingIntentName;
  date: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  club: string | null;
  flexibility: "exact" | "nearby" | "any_time" | null;
  needsConfirmation: boolean;
  missingFields: Array<"date" | "start_time" | "duration" | "club" | "account">;
};

export type UserDefaults = {
  club: string | null;
  timezone: string;
};

export type BookingSegment = {
  startTime: string;
  durationMinutes: number;
};

export type BookingPlan = {
  intent: Extract<BookingIntentName, "book_slot" | "show_availability">;
  date: string;
  club: string | null;
  durationMinutes: number;
  segments: BookingSegment[];
  confirmationRequired: boolean;
  humanSummary: string;
};

export type BookingResult = {
  status: "dry_run" | "booked" | "failed";
  message: string;
  screenshotPath?: string;
};

export type PendingConfirmation = {
  id: string;
  userId: string;
  bookingRequestId: string;
  bookingPlan: BookingPlan;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  expiresAt: Date;
};

export type StoredUser = {
  id: string;
  telegramUserId: number;
  simclubsEmail: string | null;
  defaultClubId: string | null;
  timezone: string;
  authStatus: "unlinked" | "pending" | "linked" | "expired";
  encryptedStorageState: unknown | null;
};
