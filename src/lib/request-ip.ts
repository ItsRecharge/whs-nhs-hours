import { headers } from "next/headers";

/** Best-effort client IP for rate-limit keys (local/VPS deployments). */
export async function requestIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
