import Link from "next/link";
import { Medal } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { formatRecord } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

export function Leaderboard({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
  return (
    <section id="leaderboard">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">Leaderboard</h2>
        <span className="text-sm font-semibold text-slate-500">{entries.length} players</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[44px_1fr_72px_64px] border-b border-slate-100 px-3 py-3 text-[11px] font-bold uppercase text-slate-400">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Elo</span>
          <span className="text-right">Record</span>
        </div>
        {entries.map((entry) => (
          <LeaderboardRow currentUserId={currentUserId} entry={entry} key={entry.id} />
        ))}
      </div>
    </section>
  );
}

export function LeaderboardRow({ entry, currentUserId }: { entry: LeaderboardEntry; currentUserId: string }) {
  const isCurrentUser = entry.user_id === currentUserId;

  return (
    <Link
      className={`grid min-h-16 grid-cols-[44px_1fr_72px_64px] items-center border-b border-slate-100 px-3 text-sm last:border-b-0 ${
        isCurrentUser ? "bg-orange-50" : "bg-white"
      }`}
      href={`/players/${entry.user_id}`}
    >
      <span className="font-bold text-slate-500">
        {entry.rank <= 3 ? <Medal className="text-court" size={18} /> : entry.rank}
      </span>
      <span className="flex min-w-0 items-center gap-3 font-bold">
        <Avatar name={entry.profile.display_name} src={entry.profile.avatar_url} size={34} />
        <span className="truncate">{isCurrentUser ? "You" : entry.profile.display_name}</span>
      </span>
      <span className="text-right font-black text-court">{entry.elo_rating}</span>
      <span className="text-right font-bold">{formatRecord(entry.wins, entry.losses)}</span>
    </Link>
  );
}
