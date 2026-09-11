import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/services/auth-service";
import {
  grantAdmin,
  LastAdminError,
  listAdmins,
  NotAnOfficerError,
  revokeAdmin,
} from "@/lib/services/bootstrap-service";
import { setMemberActive, setMemberRole, BootstrapOfficerProtectionError } from "@/lib/services/roster-service";
import { truncateAll } from "../helpers/db";

async function makeUser(
  firstName: string,
  opts: { role?: string; admin?: boolean; deactivated?: boolean } = {},
) {
  return db.user.create({
    data: {
      firstName,
      lastName: "Test",
      email: `${firstName.toLowerCase()}@test.local`,
      passwordHash: await hashPassword("password123"),
      role: opts.role ?? "officer",
      isBootstrapOfficer: opts.admin ?? false,
      deactivatedAt: opts.deactivated ? new Date() : null,
      emailVerifiedAt: new Date(),
    },
  });
}

beforeEach(() => truncateAll(db));

describe("multiple admins", () => {
  it("grants admin to an active officer; several admins can coexist", async () => {
    const first = await makeUser("First", { admin: true });
    const second = await makeUser("Second");
    const third = await makeUser("Third");

    await grantAdmin(second.id);
    await grantAdmin(third.id);

    const admins = await listAdmins();
    expect(admins.map((a) => a.id).sort()).toEqual([first.id, second.id, third.id].sort());
  });

  it("is idempotent when the target is already an admin", async () => {
    const a = await makeUser("A", { admin: true });
    const again = await grantAdmin(a.id);
    expect(again.isBootstrapOfficer).toBe(true);
    expect(await listAdmins()).toHaveLength(1);
  });

  it("refuses to grant admin to members, organizers, or deactivated officers", async () => {
    const member = await makeUser("Mem", { role: "member" });
    const organizer = await makeUser("Org", { role: "organizer" });
    const gone = await makeUser("Gone", { deactivated: true });

    await expect(grantAdmin(member.id)).rejects.toBeInstanceOf(NotAnOfficerError);
    await expect(grantAdmin(organizer.id)).rejects.toBeInstanceOf(NotAnOfficerError);
    await expect(grantAdmin(gone.id)).rejects.toBeInstanceOf(NotAnOfficerError);
    await expect(grantAdmin(999999)).rejects.toBeInstanceOf(NotAnOfficerError);
  });

  it("revokes admin when another admin remains", async () => {
    const a = await makeUser("A", { admin: true });
    const b = await makeUser("B", { admin: true });

    const revoked = await revokeAdmin(b.id);
    expect(revoked.isBootstrapOfficer).toBe(false);
    expect((await listAdmins()).map((x) => x.id)).toEqual([a.id]);
  });

  it("never revokes the last active admin", async () => {
    const only = await makeUser("Only", { admin: true });
    // A deactivated admin doesn't count as a remaining admin.
    await makeUser("Gone", { admin: true, deactivated: true });

    await expect(revokeAdmin(only.id)).rejects.toBeInstanceOf(LastAdminError);
    expect((await db.user.findUnique({ where: { id: only.id } }))?.isBootstrapOfficer).toBe(true);
  });

  it("every admin is protected from demotion and deactivation", async () => {
    const a = await makeUser("A", { admin: true });
    const b = await makeUser("B", { admin: true });

    for (const admin of [a, b]) {
      await expect(setMemberRole(admin.id, "member")).rejects.toBeInstanceOf(
        BootstrapOfficerProtectionError,
      );
      await expect(setMemberActive(admin.id, false)).rejects.toBeInstanceOf(
        BootstrapOfficerProtectionError,
      );
    }

    // Once the role is removed, the former admin can be demoted like anyone else.
    await revokeAdmin(b.id);
    await setMemberRole(b.id, "member");
    expect((await db.user.findUnique({ where: { id: b.id } }))?.role).toBe("member");
  });
});
