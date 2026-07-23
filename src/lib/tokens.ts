import crypto from "node:crypto";

/** Opaque URL-safe token. Only its sha256 hash is ever stored. */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
