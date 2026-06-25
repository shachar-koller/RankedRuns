import { submitResultReport } from "@/actions/challenges";
import { Avatar } from "@/components/Avatar";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { calculateElo } from "@/lib/elo";
import type { ChallengeWithPlayers, PlayerStats } from "@/lib/types";

export function ResultSubmissionForm({
  challenge,
  statsByUser,
}: {
  challenge: ChallengeWithPlayers;
  statsByUser: Map<string, PlayerStats>;
}) {
  const challengerStats = statsByUser.get(challenge.challenger_id);
  const challengedStats = statsByUser.get(challenge.challenged_id);
  const challengerElo = challengerStats?.elo_rating ?? 1200;
  const challengedElo = challengedStats?.elo_rating ?? 1200;

  const challengerWins = calculateElo(challengerElo, challengedElo);
  const challengedWins = calculateElo(challengedElo, challengerElo);

  return (
    <form action={submitResultReport} className="space-y-5">
      <input name="challenge_id" type="hidden" value={challenge.id} />
      <div>
        <p className="mb-3 text-center text-sm font-semibold text-slate-500">Who won?</p>
        <div className="grid grid-cols-2 gap-3">
          <WinnerOption
            delta={challengerWins.winnerDelta}
            elo={challengerElo}
            name={challenge.challenger.display_name}
            userId={challenge.challenger_id}
            avatar={challenge.challenger.avatar_url}
          />
          <WinnerOption
            delta={challengedWins.winnerDelta}
            elo={challengedElo}
            name={challenge.challenged.display_name}
            userId={challenge.challenged_id}
            avatar={challenge.challenged.avatar_url}
          />
        </div>
      </div>

      <div className="card p-4 text-center">
        <p className="text-sm font-semibold text-slate-500">Base projected Elo change</p>
        <div className="mt-4 grid grid-cols-2 divide-x divide-slate-200">
          <Projection name={challenge.challenger.display_name} delta={challengerWins.winnerDelta} />
          <Projection name={challenge.challenged.display_name} delta={challengedWins.winnerDelta} />
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Final Elo also uses the score margin and repeat-match rules.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Game to</span>
          <select className="input mt-1 font-semibold" name="game_to" required>
            <option value="7">7</option>
            <option value="11">11</option>
            <option value="21">21</option>
          </select>
        </label>
        <label>
          <span className="label">Loser score</span>
          <input className="input mt-1" inputMode="numeric" min={0} name="loser_score" placeholder="0" required type="number" />
        </label>
      </div>

      <p className="-mt-2 text-xs font-semibold text-slate-500">
        Enter the winner's target score and the loser's final score. The loser score must be lower than the game target.
      </p>

      <FormSubmitButton pendingLabel="Submitting result...">
        Submit for confirmation
      </FormSubmitButton>
      <p className="text-center text-xs font-semibold text-slate-400">
        Rankings update only after the other player confirms the score.
      </p>
    </form>
  );
}

function WinnerOption({
  userId,
  name,
  avatar,
  elo,
  delta,
}: {
  userId: string;
  name: string;
  avatar?: string | null;
  elo: number;
  delta: number;
}) {
  return (
    <label className="has-[:checked]:border-court has-[:checked]:bg-orange-50 rounded-2xl border border-slate-200 bg-white p-4 text-center transition">
      <input className="sr-only" name="winner_id" required type="radio" value={userId} />
      <div className="mx-auto w-fit">
        <Avatar name={name} src={avatar} size={64} />
      </div>
      <p className="mt-3 truncate font-black">{name}</p>
      <p className="text-sm text-slate-500">
        <span className="font-black text-court">{elo}</span> Elo
      </p>
      <p className="mt-2 text-sm font-black text-emerald-600">+{delta}</p>
    </label>
  );
}

function Projection({ name, delta }: { name: string; delta: number }) {
  return (
    <div>
      <p className="truncate px-2 text-sm font-bold">{name}</p>
      <p className="mt-2 text-3xl font-black text-emerald-600">+{delta}</p>
      <p className="text-xs font-semibold text-slate-400">if winner</p>
    </div>
  );
}
