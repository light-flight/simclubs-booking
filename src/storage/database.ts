import pg from "pg";
import { randomUUID } from "node:crypto";
import type { AppConfig } from "../config.js";
import type { BookingPlan, BookingResult, PendingConfirmation, StoredUser } from "../domain/types.js";

const { Pool } = pg;

export class Database {
  private readonly pool: pg.Pool;

  constructor(config: Pick<AppConfig, "DATABASE_URL">) {
    this.pool = new Pool({ connectionString: config.DATABASE_URL });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async query(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async getOrCreateUser(telegramUserId: number): Promise<StoredUser> {
    const result = await this.pool.query(
      `
        insert into users (telegram_user_id)
        values ($1)
        on conflict (telegram_user_id) do update set updated_at = now()
        returning *
      `,
      [telegramUserId]
    );

    return mapUser(result.rows[0]);
  }

  async setUserEmail(telegramUserId: number, email: string): Promise<StoredUser> {
    const result = await this.pool.query(
      `
        update users
        set simclubs_email = $2, auth_status = 'pending', updated_at = now()
        where telegram_user_id = $1
        returning *
      `,
      [telegramUserId, email]
    );

    return mapUser(result.rows[0]);
  }

  async updateUserStorageState(telegramUserId: number, encryptedStorageState: unknown): Promise<void> {
    await this.pool.query(
      `
        update users
        set encrypted_storage_state = $2, auth_status = 'linked', updated_at = now()
        where telegram_user_id = $1
      `,
      [telegramUserId, encryptedStorageState]
    );
  }

  async createBookingRequest(userId: string, rawMessage: string, parsedIntent: unknown): Promise<string> {
    const result = await this.pool.query(
      `
        insert into booking_requests (user_id, raw_message, parsed_intent, status)
        values ($1, $2, $3, 'parsed')
        returning id
      `,
      [userId, rawMessage, parsedIntent]
    );

    return result.rows[0].id;
  }

  async saveBookingPlan(bookingRequestId: string, plan: BookingPlan): Promise<void> {
    await this.pool.query(
      `
        update booking_requests
        set booking_plan = $2, status = 'planned', updated_at = now()
        where id = $1
      `,
      [bookingRequestId, plan]
    );
  }

  async createPendingConfirmation(userId: string, bookingRequestId: string, plan: BookingPlan): Promise<string> {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.pool.query(
      `
        insert into pending_confirmations (id, user_id, booking_request_id, booking_plan, expires_at)
        values ($1, $2, $3, $4, $5)
      `,
      [id, userId, bookingRequestId, plan, expiresAt]
    );

    return id;
  }

  async getPendingConfirmation(id: string, userId: string): Promise<PendingConfirmation | null> {
    const result = await this.pool.query(
      `
        select *
        from pending_confirmations
        where id = $1 and user_id = $2
        limit 1
      `,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapPendingConfirmation(result.rows[0]);
  }

  async markPendingConfirmation(id: string, status: PendingConfirmation["status"]): Promise<void> {
    await this.pool.query(
      `
        update pending_confirmations
        set status = $2
        where id = $1
      `,
      [id, status]
    );
  }

  async recordBookingAttempt(
    bookingRequestId: string,
    executorType: string,
    result: BookingResult,
    error?: Error
  ): Promise<void> {
    await this.pool.query(
      `
        insert into booking_attempts (
          booking_request_id,
          executor_type,
          status,
          error_code,
          error_message,
          screenshot_path
        )
        values ($1, $2, $3, $4, $5, $6)
      `,
      [
        bookingRequestId,
        executorType,
        result.status,
        result.status === "failed" ? "EXECUTOR_FAILED" : null,
        error?.message ?? (result.status === "failed" ? result.message : null),
        result.screenshotPath ?? null
      ]
    );
  }
}

function mapUser(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    telegramUserId: Number(row.telegram_user_id),
    simclubsEmail: (row.simclubs_email as string | null) ?? null,
    defaultClubId: (row.default_club_id as string | null) ?? null,
    timezone: (row.timezone as string | null) ?? "Europe/Moscow",
    authStatus: (row.auth_status as StoredUser["authStatus"] | null) ?? "unlinked",
    encryptedStorageState: row.encrypted_storage_state ?? null
  };
}

function mapPendingConfirmation(row: Record<string, unknown>): PendingConfirmation {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    bookingRequestId: String(row.booking_request_id),
    bookingPlan: row.booking_plan as BookingPlan,
    status: row.status as PendingConfirmation["status"],
    expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(String(row.expires_at))
  };
}
