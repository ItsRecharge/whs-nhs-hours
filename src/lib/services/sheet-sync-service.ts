import {
  appendHoursRows,
  syncRosterSheet,
  type HoursRow,
  type RosterRow,
  type SheetWriteResult,
} from "../sheets";
import { listMembersWithProgress } from "./member-service";
import { hoursHistoryForUser } from "./history-service";

/**
 * Builds the full roster snapshot — one row per member with their current
 * standing and the events they earned hours from this school year.
 *
 * NOTE: N+1 (one hoursHistoryForUser per member). Fine at chapter scale; a single
 * grouped query is the future optimization if rosters grow large.
 */
export async function buildRosterRows(): Promise<RosterRow[]> {
  const members = await listMembersWithProgress();
  return Promise.all(
    members.map(async (m): Promise<RosterRow> => {
      const history = await hoursHistoryForUser(m.id);
      const events = [...new Set(history.map((h) => h.source))].join("; ");
      return {
        name: `${m.firstName} ${m.lastName}`.trim(),
        email: m.email,
        gradYear: m.graduationYear != null ? String(m.graduationYear) : "",
        hoursCompleted: m.earned,
        remaining: m.remaining,
        events,
      };
    }),
  );
}

/**
 * Rebuilds and overwrites the Roster snapshot now, returning the result so the
 * caller can report success/failure (used by the config-save verify path).
 */
export async function syncRosterNow(): Promise<SheetWriteResult> {
  const rows = await buildRosterRows();
  return syncRosterSheet(rows);
}

/**
 * Single entry point every hours-affecting mutation calls (from inside
 * `after(...)`): appends any provided Log rows, then rebuilds the live Roster
 * snapshot so the sheet stays a true mirror. Fire-and-forget — swallows errors.
 */
export async function syncSheetsAfterChange(logRows?: HoursRow[]): Promise<void> {
  try {
    if (logRows && logRows.length > 0) {
      await appendHoursRows(logRows);
    }
    await syncRosterSheet(await buildRosterRows());
  } catch (err) {
    console.error("[sheets] post-change sync failed:", err);
  }
}
