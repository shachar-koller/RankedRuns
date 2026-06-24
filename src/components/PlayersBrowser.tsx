"use client";

import Link from "next/link";
import * as React from "react";
import { Search } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { formatRecord } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

type SortKey = "elo" | "name" | "winRate" | "wins" | "games" | "losses";

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "elo", label: "Elo" },
  { value: "name", label: "Alphabetical" },
  { value: "winRate", label: "Win rate" },
  { value: "wins", label: "Total wins" },
  { value: "games", label: "Games played" },
  { value: "losses", label: "Losses" },
];

export function PlayersBrowser({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
}) {
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("elo");

  const filtered = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries
      .filter((entry) => entry.profile.display_name.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => comparePlayers(a, b, sortKey));
  }, [entries, search, sortKey]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3">
        <label className="relative block">
          <span className="sr-only">Search players</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search players"
            type="search"
            value={search}
          />
        </label>

        <label>
          <span className="label">Order by</span>
          <select
            className="input mt-1 font-semibold"
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            value={sortKey}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">No players match that search.</div>
        ) : (
          filtered.map((entry, index) => (
            <PlayerRow
              currentUserId={currentUserId}
              displayRank={sortKey === "elo" ? entry.rank : index + 1}
              entry={entry}
              key={entry.id}
            />
          ))
        )}
      </div>
    </section>
  );
}

function PlayerRow({
  entry,
  currentUserId,
  displayRank,
}: {
  entry: LeaderboardEntry;
  currentUserId: string;
  displayRank: number;
}) {
  const isCurrentUser = entry.user_id === currentUserId;
  const winRate = getWinRate(entry);

  return (
    <Link className={`card block p-4 ${isCurrentUser ? "border-orange-200 bg-orange-50" : ""}`} href={`/players/${entry.user_id}`}>
      <div className="flex items-center gap-3">
        <span className="w-7 text-sm font-black text-slate-400">#{displayRank}</span>
        <Avatar name={entry.profile.display_name} src={entry.profile.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">{isCurrentUser ? "You" : entry.profile.display_name}</p>
          <p className="truncate text-sm text-slate-500">
            {entry.profile.bio || `${formatRecord(entry.wins, entry.losses)} record`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-black text-court">{entry.elo_rating}</p>
          <p className="text-xs font-semibold text-slate-400">Elo</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-white/70 p-3 text-center">
        <MiniStat label="Win rate" value={entry.games_played ? `${Math.round(winRate * 100)}%` : "-"} />
        <MiniStat label="Wins" value={entry.wins} />
        <MiniStat label="Games" value={entry.games_played} />
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-black text-ink">{value}</p>
    </div>
  );
}

function comparePlayers(a: LeaderboardEntry, b: LeaderboardEntry, sortKey: SortKey) {
  if (sortKey === "name") return a.profile.display_name.localeCompare(b.profile.display_name);
  if (sortKey === "winRate") return getWinRate(b) - getWinRate(a) || b.wins - a.wins || b.elo_rating - a.elo_rating;
  if (sortKey === "wins") return b.wins - a.wins || b.elo_rating - a.elo_rating;
  if (sortKey === "games") return b.games_played - a.games_played || b.elo_rating - a.elo_rating;
  if (sortKey === "losses") return b.losses - a.losses || b.games_played - a.games_played;
  return b.elo_rating - a.elo_rating || b.wins - a.wins;
}

function getWinRate(entry: LeaderboardEntry) {
  return entry.games_played === 0 ? 0 : entry.wins / entry.games_played;
}
