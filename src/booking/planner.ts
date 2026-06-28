import type { BookingIntent, BookingPlan, BookingSegment, UserDefaults } from "../domain/types.js";

const ALLOWED_DURATIONS = [30, 60, 90] as const;

export class PlanningError extends Error {
  constructor(
    readonly code: "MISSING_FIELDS" | "UNSUPPORTED_INTENT" | "UNSUPPORTED_DURATION",
    message: string
  ) {
    super(message);
  }
}

export function createBookingPlan(intent: BookingIntent, defaults: UserDefaults): BookingPlan {
  if (intent.intent !== "book_slot" && intent.intent !== "show_availability") {
    throw new PlanningError("UNSUPPORTED_INTENT", "Я пока умею только искать и бронировать слоты.");
  }

  const missing = [...intent.missingFields];
  if (!intent.date && !missing.includes("date")) missing.push("date");
  if (intent.intent === "book_slot" && !intent.startTime && !missing.includes("start_time")) {
    missing.push("start_time");
  }
  if (!intent.durationMinutes && !missing.includes("duration")) missing.push("duration");

  if (missing.length > 0) {
    throw new PlanningError("MISSING_FIELDS", `Не хватает: ${missing.join(", ")}`);
  }

  const date = must(intent.date, "date");
  const durationMinutes = must(intent.durationMinutes, "durationMinutes");
  const segments = intent.intent === "book_slot" ? splitDuration(must(intent.startTime, "startTime"), durationMinutes) : [];
  const club = intent.club ?? defaults.club;

  return {
    intent: intent.intent,
    date,
    club,
    durationMinutes,
    segments,
    confirmationRequired: intent.intent === "book_slot",
    humanSummary: summarizePlan({
      intent: intent.intent,
      date,
      club,
      durationMinutes,
      segments,
      confirmationRequired: intent.intent === "book_slot"
    })
  };
}

function splitDuration(startTime: string, durationMinutes: number): BookingSegment[] {
  if (durationMinutes % 30 !== 0) {
    throw new PlanningError("UNSUPPORTED_DURATION", "Длительность должна быть кратна 30 минутам.");
  }

  const segments: BookingSegment[] = [];
  let remaining = durationMinutes;
  let cursor = parseTime(startTime);

  while (remaining > 0) {
    const duration = ALLOWED_DURATIONS.find((candidate) => candidate <= remaining && remaining - candidate !== 30) ?? 30;
    segments.push({ startTime: formatTime(cursor), durationMinutes: duration });
    cursor += duration;
    remaining -= duration;
  }

  return segments;
}

function summarizePlan(plan: Omit<BookingPlan, "humanSummary">): string {
  if (plan.intent === "show_availability") {
    return `Проверить свободные слоты на ${plan.date}${plan.club ? `, клуб ${plan.club}` : ""}.`;
  }

  const segments = plan.segments.map((segment) => `${segment.startTime} на ${segment.durationMinutes} мин`).join(" + ");
  return `Забронировать ${plan.durationMinutes} мин на ${plan.date}: ${segments}${plan.club ? `, клуб ${plan.club}` : ""}.`;
}

function parseTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function must<T>(value: T | null, name: string): T {
  if (value === null) {
    throw new PlanningError("MISSING_FIELDS", `Missing ${name}`);
  }

  return value;
}
