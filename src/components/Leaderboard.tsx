import Link from "next/link";
import { Medal } from "lucide-react";
import { createChallenge } from "@/actions/challenges";
import { Avatar } from "@/components/Avatar";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { formatRecord } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

export function Leaderboard({
  entries,
  currentUserId,
  communityId,
  activeOpponentIds = [],
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
  communityId: string;
  activeOpponentIds?: string[];
}) {
  const activeOpponents = new Set(activeOpponentIds);

  return (
    <section id="leaderboard">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">Leaderboard</h2>
        <span className="text-sm font-semibold text-slate-500">{entries.length} players</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[34px_1fr_54px_52px_70px] border-b border-slate-100 px-3 py-3 text-[11px] font-bold uppercase text-slate-400">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Elo</span>
          <span className="text-right">Record</span>
          <span />
        </div>
        {entries.map((entry) => (
          <LeaderboardRow
            activeChallenge={activeOpponents.has(entry.user_id)}
            communityId={communityId}
            currentUserId={currentUserId}
            entry={entry}
            key={entry.id}
          />
        ))}
      </div>
    </section>
  );
}

export function LeaderboardRow({
  entry,
  currentUserId,
  communityId,
  activeChallenge,
}: {
  entry: LeaderboardEntry;
  currentUserId: string;
  communityId: string;
  activeChallenge: boolean;
}) {
  const isCurrentUser = entry.user_id === currentUserId;
  const podium = getPodiumStyle(entry.rank);

  return (
    <div
      className={`grid min-h-16 grid-cols-[34px_1fr_54px_52px_70px] items-center border-b border-slate-100 px-3 text-sm last:border-b-0 ${
        podium.background
      } ${
        isCurrentUser ? "outline outline-2 outline-inset outline-sky-400" : ""
      }`}
    >
      <Link className="contents" href={`/players/${entry.user_id}`}>
        <span className={`font-bold ${podium.text}`}>
          {entry.rank <= 3 ? <Medal className={podium.icon} size={18} /> : entry.rank}
        </span>
        <span className="flex min-w-0 items-center gap-2 font-bold">
          <Avatar name={entry.profile.display_name} src={entry.profile.avatar_url} size={32} />
          <span className="truncate">{isCurrentUser ? "You" : entry.profile.display_name}</span>
        </span>
        <span className="text-right font-black text-court">{entry.elo_rating}</span>
        <span className="text-right font-bold">{formatRecord(entry.wins, entry.losses)}</span>
      </Link>
      {isCurrentUser ? (
        <span />
      ) : activeChallenge ? (
        <button className="text-xs font-bold text-slate-400" disabled type="button">
          Active
        </button>
      ) : (
        <form action={createChallenge}>
          <input name="community_id" type="hidden" value={communityId} />
          <input name="challenged_id" type="hidden" value={entry.user_id} />
          <FormSubmitButton
            className="rounded-lg bg-court px-2 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            pendingLabel="Sending..."
          >
            Challenge
          </FormSubmitButton>
        </form>
      )}
    </div>
  );
}

function getPodiumStyle(rank: number) {
  if (rank === 1) {
    return {
      background: "bg-amber-50",
      text: "text-amber-700",
      icon: "text-amber-500",
    };
  }

  if (rank === 2) {
    return {
      background: "bg-slate-50",
      text: "text-slate-600",
      icon: "text-slate-400",
    };
  }

  if (rank === 3) {
    return {
      background: "bg-orange-50/70",
      text: "text-orange-700",
      icon: "text-orange-500",
    };
  }

  return {
    background: "bg-white",
    text: "text-slate-500",
    icon: "text-slate-500",
  };
}
