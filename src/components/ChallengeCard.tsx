import Link from "next/link";
import { updateChallengeStatus } from "@/actions/challenges";
import { Avatar } from "@/components/Avatar";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { getChallengeStatusLabel, timeAgo } from "@/lib/utils";
import type { ChallengeWithPlayers, PlayerStats, Profile } from "@/lib/types";

export function ChallengeCard({
  challenge,
  currentUserId,
  stats,
}: {
  challenge: ChallengeWithPlayers;
  currentUserId: string;
  stats?: Map<string, PlayerStats>;
}) {
  const incoming = challenge.challenged_id === currentUserId;
  const opponent = incoming ? challenge.challenger : challenge.challenged;
  const opponentStats = stats?.get(opponent.id);

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <PlayerLine profile={opponent} stats={opponentStats} />
        <span className="text-xs font-semibold text-slate-400">{timeAgo(challenge.created_at)}</span>
      </div>

      {challenge.status === "pending" && incoming ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatusButton challengeId={challenge.id} label="Accept" status="accepted" variant="primary" />
          <StatusButton
            challengeId={challenge.id}
            confirmMessage="Decline this challenge?"
            label="Decline"
            status="declined"
          />
        </div>
      ) : null}

      {challenge.status === "pending" && !incoming ? (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-court">Pending</span>
          <StatusButton
            challengeId={challenge.id}
            confirmMessage="Cancel this challenge?"
            label="Cancel"
            status="canceled"
            textOnly
          />
        </div>
      ) : null}

      {challenge.status === "accepted" ? (
        <Link className="btn-secondary mt-4 w-full" href={`/matches/${challenge.id}`}>
          Submit result
        </Link>
      ) : null}

      {challenge.status === "result_pending" ? (
        <Link className="btn-secondary mt-4 w-full" href={`/matches/${challenge.id}`}>
          Review pending result
        </Link>
      ) : null}

      {challenge.status === "disputed" ? (
        <Link className="btn-secondary mt-4 w-full" href={`/matches/${challenge.id}`}>
          View dispute
        </Link>
      ) : null}

      {challenge.status === "completed" ? (
        <div className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
          Completed
        </div>
      ) : null}

      {challenge.status === "declined" || challenge.status === "canceled" ? (
        <div className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
          {getChallengeStatusLabel(challenge.status)}
        </div>
      ) : null}
    </article>
  );
}

function PlayerLine({ profile, stats }: { profile: Pick<Profile, "id" | "display_name" | "avatar_url">; stats?: PlayerStats }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={profile.display_name} src={profile.avatar_url} />
      <div className="min-w-0">
        <p className="truncate font-black">{profile.display_name}</p>
        <p className="text-sm text-slate-500">{stats?.elo_rating ?? 1200} Elo</p>
      </div>
    </div>
  );
}

function StatusButton({
  challengeId,
  label,
  status,
  variant,
  textOnly,
  confirmMessage,
}: {
  challengeId: string;
  label: string;
  status: string;
  variant?: "primary";
  textOnly?: boolean;
  confirmMessage?: string;
}) {
  return (
    <form action={updateChallengeStatus}>
      <input name="challenge_id" type="hidden" value={challengeId} />
      <input name="status" type="hidden" value={status} />
      <FormSubmitButton
        className={textOnly ? "min-h-10 px-3 text-sm font-bold text-court" : variant === "primary" ? "btn-primary w-full" : "btn-secondary w-full"}
        confirmMessage={confirmMessage}
        pendingLabel={getPendingLabel(label)}
      >
        {label}
      </FormSubmitButton>
    </form>
  );
}

function getPendingLabel(label: string) {
  const labels: Record<string, string> = {
    Accept: "Accepting...",
    Decline: "Declining...",
    Cancel: "Canceling...",
  };

  return labels[label] ?? "Working...";
}
