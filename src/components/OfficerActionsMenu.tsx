"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  KeyRound,
  Mail,
  MoreVertical,
  Pencil,
  Power,
  UserCog,
} from "lucide-react";
import {
  sendPasswordResetForUserAction,
  setOfficerActiveAction,
} from "@/actions/officers";
import { startImpersonationAction } from "@/actions/impersonation";

interface OfficerActionsMenuProps {
  officerId: number;
  active: boolean;
  protectedNow: boolean;
  meIsBootstrap: boolean;
}

const itemClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50";

export function OfficerActionsMenu({
  officerId,
  active,
  protectedNow,
  meIsBootstrap,
}: OfficerActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    right: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Anchor the portal menu to the trigger button (right-aligned, opening down,
  // flipping up — anchored to the button's top — when it'd overflow the bottom).
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const MENU_HEIGHT = 320; // generous upper bound for flip detection
    function place() {
      const rect = buttonRef.current!.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom;
      const openUp = below < MENU_HEIGHT && rect.top > below;
      setPos({
        right: window.innerWidth - rect.right,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    place();
    // Close on scroll/resize rather than chase the anchor — avoids drift.
    function dismiss() {
      setOpen(false);
    }
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Officer actions"
        className="flex items-center justify-center rounded-md border border-gray-300 p-1.5 text-gray-600 transition hover:bg-gray-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                right: pos.right,
                top: pos.top,
                bottom: pos.bottom,
              }}
              className="z-50 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {meIsBootstrap ? (
            <Link
              href={`/officer/members/${officerId}`}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Manage
            </Link>
          ) : null}

          {meIsBootstrap && active ? (
            <form action={startImpersonationAction}>
              <input type="hidden" name="userId" value={officerId} />
              <button type="submit" className={`${itemClass} text-amber-800`}>
                <UserCog className="h-3.5 w-3.5" />
                Impersonate
              </button>
            </form>
          ) : null}

          <div className="my-1 border-t border-gray-100" />
          <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Reset password
          </p>
          <form action={sendPasswordResetForUserAction}>
            <input type="hidden" name="userId" value={officerId} />
            <button type="submit" className={itemClass}>
              <KeyRound className="h-3.5 w-3.5" />
              Generate reset link
            </button>
          </form>
          <form action={sendPasswordResetForUserAction}>
            <input type="hidden" name="userId" value={officerId} />
            <input type="hidden" name="emailIt" value="1" />
            <button type="submit" className={itemClass}>
              <Mail className="h-3.5 w-3.5" />
              Send reset email
            </button>
          </form>

          <div className="my-1 border-t border-gray-100" />
          <form action={setOfficerActiveAction}>
            <input type="hidden" name="userId" value={officerId} />
            <input type="hidden" name="active" value={active ? "false" : "true"} />
            <button
              type="submit"
              disabled={protectedNow}
              title={
                protectedNow
                  ? "Transfer the bootstrap role before removing this officer."
                  : undefined
              }
              className={
                protectedNow
                  ? "flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-left text-sm text-gray-300"
                  : active
                    ? `${itemClass} text-red-700`
                    : `${itemClass} text-green-700`
              }
            >
              <Power className="h-3.5 w-3.5" />
              {active ? "Deactivate" : "Reactivate"}
            </button>
          </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
