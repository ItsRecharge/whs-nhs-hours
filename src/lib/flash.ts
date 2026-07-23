import { cookies } from "next/headers";
import { FLASH_COOKIE } from "./constants";

export type FlashCategory = "success" | "warning" | "danger" | "info";

export interface FlashMessage {
  category: FlashCategory;
  message: string;
}

/**
 * Read-once flash messages, replacing Flask's flash(). The cookie is set in a
 * server action before redirect, rendered by the next page, and cleared
 * client-side by <FlashMessages/> (server components cannot delete cookies).
 * It is deliberately NOT httpOnly so the client can clear it.
 */
export async function setFlash(
  category: FlashCategory,
  message: string,
): Promise<void> {
  const store = await cookies();
  const existing = await getFlash();
  existing.push({ category, message });
  store.set(FLASH_COOKIE, JSON.stringify(existing), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}

export async function getFlash(): Promise<FlashMessage[]> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
