import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const key = () => Buffer.from(env.PII_ENCRYPTION_KEY, "hex");

// Layout: iv(12) | authTag(16) | ciphertext
export function encryptField(plainText: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

export function decryptField(cipherText: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key(), cipherText.subarray(0, 12));
  decipher.setAuthTag(cipherText.subarray(12, 28));
  return Buffer.concat([decipher.update(cipherText.subarray(28)), decipher.final()]).toString("utf8");
}
