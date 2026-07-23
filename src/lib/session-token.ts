// Pure JWT envelope sign/verify — no next/headers or DB import, so it is safe
// to use from middleware (edge runtime) as well as server code. The JWT carries
// the session id (`sid`), a per-session secret, and cached role/name so the edge
// middleware can gate routes without a database call. Revocation is enforced
// separately against the Session row (see services/session-service.ts).
import { SignJWT, jwtVerify } from "jose";
import { SESSION_TTL_SECONDS, type Role } from "./constants";

export interface SessionClaims {
  sid: string;
  secret: string;
  role: Role;
  name: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ secret: claims.secret, role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sid = payload.sub;
    const secret = payload.secret;
    const role = payload.role;
    if (
      !sid ||
      typeof secret !== "string" ||
      (role !== "member" && role !== "officer")
    ) {
      return null;
    }
    return { sid, secret, role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
