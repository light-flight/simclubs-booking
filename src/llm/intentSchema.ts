import { z } from "zod";

export const bookingIntentSchema = z.object({
  intent: z.enum([
    "book_slot",
    "show_availability",
    "link_account",
    "unlink_account",
    "unknown"
  ]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  club: z.string().min(1).nullable(),
  flexibility: z.enum(["exact", "nearby", "any_time"]).nullable(),
  needsConfirmation: z.boolean(),
  missingFields: z.array(z.enum(["date", "start_time", "duration", "club", "account"]))
});

export const bookingIntentJsonSchema = {
  name: "booking_intent",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      intent: {
        type: "string",
        enum: ["book_slot", "show_availability", "link_account", "unlink_account", "unknown"]
      },
      date: {
        anyOf: [{ type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, { type: "null" }]
      },
      startTime: {
        anyOf: [{ type: "string", pattern: "^\\d{2}:\\d{2}$" }, { type: "null" }]
      },
      durationMinutes: {
        anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }]
      },
      club: {
        anyOf: [{ type: "string", minLength: 1 }, { type: "null" }]
      },
      flexibility: {
        anyOf: [{ type: "string", enum: ["exact", "nearby", "any_time"] }, { type: "null" }]
      },
      needsConfirmation: { type: "boolean" },
      missingFields: {
        type: "array",
        items: { type: "string", enum: ["date", "start_time", "duration", "club", "account"] }
      }
    },
    required: [
      "intent",
      "date",
      "startTime",
      "durationMinutes",
      "club",
      "flexibility",
      "needsConfirmation",
      "missingFields"
    ]
  }
} as const;

export type ParsedBookingIntent = z.infer<typeof bookingIntentSchema>;
