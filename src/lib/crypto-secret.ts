import crypto from "node:crypto";

// AES-256-GCM encryption for secrets stored in the DB (mail password, Google
// private key). The key is derived from SESSION_SECRET, so rotating that secret
// invalidates stored ciphertext (it then reads as unset and falls back to env).

function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/** Returns "base64(iv).base64(tag).base64(ciphertext)". */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

/** Decrypts a value from encryptSecret; returns null on any failure/tamper. */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const [ivB64, tagB64, ctB64] = value.split(".");
    if (!ivB64 || !tagB64 || !ctB64) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}
