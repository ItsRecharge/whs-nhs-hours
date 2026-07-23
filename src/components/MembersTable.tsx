"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { bulkAssignHouseAction, bulkDeactivateAction } from "@/actions/roster";

export interface MemberRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  graduationYear: number | null;
  houseId: number | null;
  houseName: string | null;
  emailVerifiedAt: string | null;
  deactivatedAt: string | null;
  earned: number;
  remaining: number;
  inside: number;
  outside: number;
}

export function MembersTable({
  members,
  houses,
}: {
  members: MemberRow[];
  houses: { id: number; name: string }[];
}) {
  const [gradYear, setGradYear] = useState<string>("all");
  const [house, setHouse] = useState<string>("all");
  const [status, setStatus] = useState<string>("active");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const gradYears = useMemo(
    () =>
      Array.from(
        new Set(members.map((m) => m.graduationYear).filter((y): y is number => !!y)),
      ).sort(),
    [members],
  );

  const visible = members.filter((m) => {
    if (gradYear !== "all" && String(m.graduationYear ?? "none") !== gradYear)
      return false;
    if (house !== "all") {
      if (house === "none" ? m.houseId !== null : String(m.houseId) !== house)
        return false;
    }
    if (status === "active" && m.deactivatedAt) return false;
    if (status === "inactive" && !m.deactivatedAt) return false;
    return true;
  });

  const visibleIds = visible.map((m) => m.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...visibleIds]);
    });
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectClass =
    "rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-primary-700";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={gradYear}
          onChange={(e) => setGradYear(e.target.value)}
          className={selectClass}
          aria-label="Filter by class"
        >
          <option value="all">All classes</option>
          {gradYears.map((y) => (
            <option key={y} value={String(y)}>
              Class of {y}
            </option>
          ))}
          <option value="none">No class year</option>
        </select>
        <select
          value={house}
          onChange={(e) => setHouse(e.target.value)}
          className={selectClass}
          aria-label="Filter by house"
        >
          <option value="all">All houses</option>
          {houses.map((h) => (
            <option key={h.id} value={String(h.id)}>
              {h.name}
            </option>
          ))}
          <option value="none">Unassigned</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All statuses</option>
        </select>
        <span className="ml-auto text-xs text-gray-500">
          {visible.length} member{visible.length === 1 ? "" : "s"}
          {selected.size > 0 ? ` · ${selected.size} selected` : ""}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          const submitter = (e.nativeEvent as SubmitEvent).submitter;
          if (
            submitter?.getAttribute("data-confirm") &&
            !window.confirm(submitter.getAttribute("data-confirm")!)
          ) {
            e.preventDefault();
          }
        }}
      >
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="userIds" value={id} />
        ))}

        {selected.size > 0 && (
          <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 shadow-sm">
            <span className="text-sm font-medium text-primary-900">
              {selected.size} selected
            </span>
            <select name="houseId" className={selectClass} aria-label="House to assign">
              <option value="">— No house —</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              formAction={bulkAssignHouseAction}
              className="rounded-md border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 transition hover:bg-primary-100"
            >
              Assign house
            </button>
            <button
              type="submit"
              formAction={bulkDeactivateAction}
              data-confirm="Deactivate all selected members? They will be logged out and unable to log in."
              className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              Deactivate
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto text-xs font-medium text-primary-800 hover:underline"
            >
              Clear selection
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          {visible.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No members match the filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      aria-label="Select all visible members"
                    />
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-center">Class</th>
                  <th className="px-4 py-3">House</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((m) => (
                  <tr
                    key={m.id}
                    className={`transition hover:bg-gray-50 ${m.deactivatedAt ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={() => toggle(m.id)}
                        aria-label={`Select ${m.firstName} ${m.lastName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/officer/members/${m.id}`}
                        className="font-medium text-gray-900 hover:text-primary-800 hover:underline"
                      >
                        {m.firstName} {m.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.email}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {m.graduationYear ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.houseName ?? "—"}</td>
                    <td
                      className="px-4 py-3 text-right font-medium text-gray-900"
                      title={`Inside ${m.inside} · Outside ${m.outside}`}
                    >
                      {m.earned}
                    </td>
                    <td className="px-4 py-3">
                      {m.deactivatedAt ? (
                        <span className="text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      ) : m.emailVerifiedAt ? (
                        <span className="text-xs font-medium text-green-700">
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-yellow-700">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/officer/members/${m.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800 transition hover:bg-primary-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </form>
    </div>
  );
}
