"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROOM_CODE_LENGTH } from "@/lib/game/rooms";

/**
 * Compact "enter a code to join" form. Lets a player join a room directly
 * without going through the host's config screen. Navigates to /room/[code];
 * the room page handles join/not-found.
 */
export function JoinRoom() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length === ROOM_CODE_LENGTH) router.push(`/room/${c}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Room code"
        maxLength={ROOM_CODE_LENGTH}
        aria-label="Room code"
        className="w-40 rounded-xl border border-ink/10 bg-surface-2 px-3 py-2 text-sm uppercase tracking-widest text-ink placeholder-ink-soft/50 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
      <button
        type="submit"
        disabled={code.trim().length !== ROOM_CODE_LENGTH}
        className="shrink-0 rounded-xl bg-teal px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-deep disabled:opacity-40"
      >
        Join
      </button>
    </form>
  );
}
