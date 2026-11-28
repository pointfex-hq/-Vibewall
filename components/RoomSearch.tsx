"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { RoomDTO } from "@/types/vibewall";
import { Icon } from "@/components/icons";

function extractRoomCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(trimmed, base);
    const match = parsed.pathname.match(/^\/r\/([^/]+)\/?$/i);
    if (match?.[1] && (trimmed.includes("://") || trimmed.startsWith("/r/"))) {
      return decodeURIComponent(match[1]).toUpperCase();
    }
  } catch {
    // Not a URL; treat as a room code or event name query.
  }
  return null;
}

export default function RoomSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<RoomDTO[]>([]);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const latestSearch = useRef(0);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      setMessage("Enter an event name or room code.");
      return;
    }

    const linkedCode = extractRoomCode(term);
    if (linkedCode) {
      router.push(`/r/${encodeURIComponent(linkedCode)}`);
      return;
    }

    const request = ++latestSearch.current;
    setSearching(true);
    setMatches([]);
    setMessage("Searching for live rooms…");
    try {
      const rooms = await api.getActiveRooms(term);
      if (request !== latestSearch.current) return;
      const exactCode = rooms.find((room) => room.code.toUpperCase() === term.toUpperCase());
      const destination = exactCode || (rooms.length === 1 ? rooms[0] : undefined);
      if (destination) {
        router.push(`/r/${encodeURIComponent(destination.code)}`);
        return;
      }
      setMatches(rooms);
      setMessage(rooms.length ? "Choose a live room" : "No live room matches that name or code.");
    } catch {
      if (request === latestSearch.current) {
        setMessage("Couldn’t search live rooms. Please try again.");
      }
    } finally {
      if (request === latestSearch.current) setSearching(false);
    }
  }

  return (
    <form onSubmit={handleSearch} className="mt-1 max-w-md">
      <label htmlFor="room-search" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
        Find a live room
      </label>
      <div className="relative">
        <input
          id="room-search"
          type="text"
          placeholder="Enter Room Code or event name"
          value={query}
          onChange={(event) => {
            latestSearch.current++;
            setQuery(event.target.value);
            setMatches([]);
            setMessage("");
            setSearching(false);
          }}
          aria-describedby="room-search-status"
          className="w-full rounded-full border border-outline/70 bg-surface py-3 pl-4 pr-12 text-sm font-bold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-variant/60 focus:border-primary"
        />
        <button
          type="submit"
          aria-label="Find room"
          disabled={searching}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary hover:scale-105 disabled:opacity-60"
        >
          <Icon name="arrow_forward" size={18} />
        </button>
      </div>
      <p id="room-search-status" role="status" className="mt-1 text-xs font-semibold text-on-surface-variant">{message}</p>
      {matches.length > 0 && (
        <ul className="mt-2 divide-y divide-outline/50 rounded-xl border border-outline/60 bg-surface">
          {matches.map((room) => (
            <li key={room.code}>
              <Link href={`/r/${encodeURIComponent(room.code)}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm font-semibold hover:text-primary">
                <span>{room.title}</span>
                <span className="text-xs text-on-surface-variant">{room.code}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
