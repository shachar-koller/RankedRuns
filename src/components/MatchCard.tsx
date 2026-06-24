import Link from "next/link";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import type { ChallengeWithPlayers } from "@/lib/types";

export function MatchCard({ challenge, currentUserId }: { challenge: ChallengeWithPlayers; currentUserId: string }) {
  const challengerName = challenge.challenger_id === currentUserId ? "You" : challenge.challenger.display_name;
  const challengedName = challenge.challenged_id === currentUserId ? "You" : challenge.challenged.display_name;

  return (
    <article className="card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-orange-50">
          <Trophy className="text-court" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">
            {challengerName} vs {challengedName}
          </p>
          <p className="text-sm font-semibold text-emerald-600">Accepted</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">{timeAgo(challenge.accepted_at ?? challenge.created_at)}</span>
      </div>
      <Link className="btn-secondary mt-4 w-full" href={`/matches/${challenge.id}`}>
        Submit result
      </Link>
    </article>
  );
}

export function PlayerDuel({
  leftName,
  leftAvatar,
  leftElo,
  rightName,
  rightAvatar,
  rightElo,
}: {
  leftName: string;
  leftAvatar?: string | null;
  leftElo: number;
  rightName: string;
  rightAvatar?: string | null;
  rightElo: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_36px_1fr] items-center gap-3">
      <DuelPlayer name={leftName} avatar={leftAvatar} elo={leftElo} />
      <div className="text-center text-xs font-black uppercase text-slate-400">vs</div>
      <DuelPlayer name={rightName} avatar={rightAvatar} elo={rightElo} />
    </div>
  );
}

function DuelPlayer({ name, avatar, elo }: { name: string; avatar?: string | null; elo: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <div className="mx-auto w-fit">
        <Avatar name={name} src={avatar} size={64} />
      </div>
      <p className="mt-3 truncate font-black">{name}</p>
      <p className="text-sm text-slate-500">
        <span className="font-black text-court">{elo}</span> Elo
      </p>
    </div>
  );
}
