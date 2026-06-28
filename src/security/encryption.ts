import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptedPayload = {
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

export function encryptJson(masterKey: string, value: unknown): EncryptedPayload {
  const key = normalizeKey(masterKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

export function decryptJson(masterKey: string, payload: unknown): unknown {
  if (!isEncryptedPayload(payload)) {
    throw new Error("Invalid encrypted payload");
  }

  const key = normalizeKey(masterKey);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]);

  return JSON.parse(plaintext.toString("utf8"));
}

function normalizeKey(masterKey: string): Buffer {
  const decoded = Buffer.from(masterKey, "base64");
  if (decoded.length === 32) {
    return decoded;
  }

  const raw = Buffer.from(masterKey, "utf8");
  if (raw.length === 32) {
    return raw;
  }

  throw new Error("SESSION_ENCRYPTION_KEY must decode to exactly 32 bytes");
}

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as EncryptedPayload).alg === "aes-256-gcm" &&
    typeof (value as EncryptedPayload).iv === "string" &&
    typeof (value as EncryptedPayload).tag === "string" &&
    typeof (value as EncryptedPayload).ciphertext === "string"
  );
}
