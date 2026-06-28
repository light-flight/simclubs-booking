import OpenAI from "openai";
import type { AppConfig } from "../config.js";
import type { BookingIntent, UserDefaults } from "../domain/types.js";
import { bookingIntentJsonSchema, bookingIntentSchema } from "./intentSchema.js";

type ParseIntentInput = {
  message: string;
  nowIso: string;
  timezone: string;
  userDefaults: UserDefaults;
};

export class IntentParser {
  private readonly client: OpenAI;

  constructor(private readonly config: Pick<AppConfig, "OPENAI_API_KEY" | "OPENAI_MODEL" | "OPENAI_FALLBACK_MODEL">) {
    this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }

  async parse(input: ParseIntentInput): Promise<BookingIntent> {
    const parsed = await this.parseWithModel(this.config.OPENAI_MODEL, input).catch(async (error) => {
      if (this.config.OPENAI_FALLBACK_MODEL === this.config.OPENAI_MODEL) {
        throw error;
      }

      return this.parseWithModel(this.config.OPENAI_FALLBACK_MODEL, input);
    });

    return bookingIntentSchema.parse(parsed);
  }

  private async parseWithModel(model: string, input: ParseIntentInput): Promise<unknown> {
    const response = await this.client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You parse Russian Telegram messages for a sim racing booking bot.",
                "Return only the requested JSON schema.",
                "Resolve relative dates using the supplied now/timezone.",
                "Do not invent a club if the user did not specify one.",
                "If the user wants a booking, needsConfirmation must be true.",
                "If required fields are missing, include them in missingFields."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                message: input.message,
                now: input.nowIso,
                timezone: input.timezone,
                userDefaults: input.userDefaults
              })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          ...bookingIntentJsonSchema
        }
      }
    } as never);

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error("OpenAI response did not contain output_text");
    }

    return JSON.parse(outputText);
  }
}
