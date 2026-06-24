import { Trophy, X } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { ResultWithPlayers } from "@/lib/types";

export function RecentResultsList({ results, userId }: { results: ResultWithPlayers[]; userId?: string }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-black">Recent results</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {results.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No completed matches yet.</p>
        ) : (
          results.map((result) => {
            const userWon = userId ? result.winner_id === userId : false;
            const delta = result.winner_elo_after - result.winner_elo_before;
            const label = userId
              ? userWon
                ? `beat ${result.loser.display_name}${formatScore(result)}`
                : `lost to ${result.winner.display_name}${formatScore(result)}`
              : `${result.winner.display_name} beat ${result.loser.display_name}${formatScore(result)}`;

            return (
              <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 last:border-b-0" key={result.id}>
                <div className={`grid h-9 w-9 place-items-center rounded-full ${userId && !userWon ? "bg-red-100" : "bg-emerald-100"}`}>
                  {userId && !userWon ? <X className="text-red-500" size={18} /> : <Trophy className="text-emerald-600" size={18} />}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-bold">{label}</p>
                <span className={`text-sm font-black ${userId && !userWon ? "text-red-500" : "text-emerald-600"}`}>
                  {userId && !userWon ? result.loser_elo_after - result.loser_elo_before : `+${delta}`}
                </span>
                <span className="text-xs font-semibold text-slate-400">{timeAgo(result.created_at)}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function formatScore(result: ResultWithPlayers) {
  if (result.winner_score === null || result.loser_score === null) return "";
  return ` ${result.winner_score}-${result.loser_score}`;
}
