import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for FBR credentials at rest (SPEC §10). Key is 32 bytes,
 * base64-encoded in FBR_ENCRYPTION_KEY. Each value stored with its own
 * random 12-byte IV + 16-byte auth tag.
 *
 * Wire format (base64 of concatenation): iv(12) | tag(16) | ciphertext
 *
 *   encryptFbrField("POS-1234567") → "abc...base64"
 *   decryptFbrField("abc...base64") → "POS-1234567"
 *
 * Keep decryption out of the web-app data flow — ideally only the worker
 * decrypts before POSTing to FBR. The web app ONLY encrypts (on save) and
 * displays `isSet: true/false` (never the plaintext).
 */

const IV_LEN = 12;
const TAG_LEN = 16;

function loadKey(): Buffer {
  const b64 = process.env.FBR_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error("FBR_ENCRYPTION_KEY not set — cannot encrypt FBR credentials");
  }
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `FBR_ENCRYPTION_KEY must be 32 bytes (base64). Got ${buf.length}. Generate with: openssl rand -base64 32`,
    );
  }
  return buf;
}

export function encryptFbrField(plaintext: string): string {
  if (!plaintext) throw new Error("encryptFbrField: plaintext empty");
  const key = loadKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptFbrField(payloadB64: string): string {
  if (!payloadB64) throw new Error("decryptFbrField: payload empty");
  const key = loadKey();
  const payload = Buffer.from(payloadB64, "base64");
  if (payload.length <= IV_LEN + TAG_LEN) {
    throw new Error("decryptFbrField: malformed payload");
  }
  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = payload.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return dec.toString("utf8");
}

/** Safe preview — last 4 chars of plaintext, nothing earlier. */
export function maskedPreview(plaintext: string): string {
  if (!plaintext) return "";
  const tail = plaintext.slice(-4);
  return `••••${tail}`;
}
