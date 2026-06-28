# simclubs-booking

Telegram bot for booking SimClubs racing simulator slots.

The bot intentionally keeps the LLM on a short leash:

- OpenAI parses a Telegram message into strict `BookingIntent` JSON.
- Deterministic TypeScript code validates and plans the booking.
- Playwright or a future direct API executor performs the website work.
- A Telegram confirmation gate is required before real booking.

## Stack

- TypeScript
- grammY
- OpenAI Responses API with structured JSON output
- Playwright
- Postgres

Redis is not required for the MVP. If async jobs become necessary, start with a Postgres-backed job table and add Redis only after there is actual pressure.

## Setup

```bash
npm install
cp .env.example .env
openssl rand -base64 32
```

Paste the generated key into `SESSION_ENCRYPTION_KEY`, then set:

- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `DATABASE_URL`

Create the database schema:

```bash
npm run db:migrate
```

Run locally:

```bash
npm run dev
```

## Deploy With Kamal

The deploy config is host-parameterized. After the one-time secrets setup, deploys only need the server IP.

One-time server bootstrap:

```bash
cp .kamal/secrets.example .kamal/secrets
openssl rand -base64 32 # SESSION_ENCRYPTION_KEY
openssl rand -hex 24    # POSTGRES_PASSWORD
# put TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, SESSION_ENCRYPTION_KEY, POSTGRES_PASSWORD in .env
bin/deploy 203.0.113.10 setup
```

Regular deploy:

```bash
bin/deploy 203.0.113.10
```

Kamal runs the bot as a non-web `bot` role with `proxy: false`, starts a Postgres accessory on the same host, and runs `node dist/migrate.js` before the bot process starts.

## Safety Defaults

`BOOKING_EXECUTOR=dry-run` is the default. In this mode the bot parses and plans bookings, but never performs a real booking.

Switch to `BOOKING_EXECUTOR=playwright` only after the SimClubs selectors and login flow are implemented and tested against a non-destructive path.

## User Flow

```text
/start
/link email@example.com
забронируй завтра 90 минут в 12:30
```

Planned authorization flow:

```text
user sends /link email
bot opens SimClubs login via Playwright
SimClubs sends email code
user forwards code to bot
Playwright completes login
bot stores encrypted Playwright storageState per Telegram user
```

## Architecture

```text
Telegram
  -> grammY bot
  -> IntentParser
  -> BookingPlanner
  -> BookingExecutor
      -> DryRunBookingExecutor
      -> SimclubsPlaywrightExecutor
  -> Postgres
```

The LLM does not receive cookies, passwords, or Playwright storage state.
