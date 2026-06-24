import { createChallenge } from "@/actions/challenges";
import { Avatar } from "@/components/Avatar";
import { formatRecord } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

export function PlayerProfileCard({
  player,
  currentUserId,
  communityId,
  hasActiveChallenge,
}: {
  player: LeaderboardEntry;
  currentUserId: string;
  communityId: string;
  hasActiveChallenge: boolean;
}) {
  const isSelf = player.user_id === currentUserId;

  return (
    <section className="text-center">
      <div className="mx-auto w-fit">
        <Avatar name={player.profile.display_name} src={player.profile.avatar_url} size={96} />
      </div>
      <h1 className="mt-4 text-2xl font-black">{isSelf ? "You" : player.profile.display_name}</h1>
      {player.profile.bio ? (
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">{player.profile.bio}</p>
      ) : null}
      <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white p-4">
        <Stat label="Elo" value={player.elo_rating} accent />
        <Stat label="Record" value={formatRecord(player.wins, player.losses)} />
        <Stat label="Games" value={player.games_played} />
      </div>

      {isSelf ? (
        <button className="btn-secondary mt-5 w-full" disabled type="button">
          You cannot challenge yourself
        </button>
      ) : hasActiveChallenge ? (
        <button className="btn-secondary mt-5 w-full" disabled type="button">
          Active challenge already exists
        </button>
      ) : (
        <form action={createChallenge} className="mt-5">
          <input name="community_id" type="hidden" value={communityId} />
          <input name="challenged_id" type="hidden" value={player.user_id} />
          <button className="btn-primary w-full" type="submit">
            Challenge player
          </button>
        </form>
      )}
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent ? "text-court" : "text-ink"}`}>{value}</p>
    </div>
  );
}
