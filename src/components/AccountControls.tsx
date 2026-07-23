import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { requireUser, fullName } from "@/lib/current-user";
import { db } from "@/lib/db";
import { SettingsModal } from "@/components/SettingsModal";

/** Settings modal + quick Log out. "Log out everywhere" lives inside the settings modal. */
export async function AccountControls({
  className = "",
  align = "start",
}: {
  className?: string;
  align?: "start" | "end";
}) {
  const user = await requireUser();
  const activeSessions = await db.session.count({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  const itemClass = `flex items-center gap-2 text-sm opacity-85 transition hover:opacity-100 ${className}`;
  return (
    <div
      className={`flex flex-col gap-1.5 ${align === "end" ? "items-end" : "items-start"}`}
    >
      <SettingsModal
        triggerClassName={className}
        fullName={fullName(user)}
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        graduationYear={user.graduationYear}
        pendingEmail={user.pendingEmail}
        activeSessions={activeSessions}
      />
      <form action={logoutAction}>
        <button type="submit" className={itemClass}>
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </form>
    </div>
  );
}
