import type { User } from "@prisma/client";
import { db } from "../db";

/**
 * The bootstrap officer is protected from demotion/removal for as long as they
 * hold the role — until they transfer it to another officer (see
 * transferBootstrapAction). Protection is simply "are you the bootstrap officer".
 */
export function isBootstrapProtected(user: Pick<User, "isBootstrapOfficer">): boolean {
  return user.isBootstrapOfficer;
}

/** The current bootstrap officer account, or null if somehow none is flagged. */
export function getBootstrapOfficer(): Promise<User | null> {
  return db.user.findFirst({ where: { isBootstrapOfficer: true } });
}
