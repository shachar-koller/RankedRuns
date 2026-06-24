import { redirect } from "next/navigation";
import { AuthButton } from "@/components/AuthButton";
import { Avatar } from "@/components/Avatar";
import { CommunitySelector } from "@/components/CommunitySelector";
import { PageShell } from "@/components/PageShell";
import { RecentResultsList } from "@/components/RecentResultsList";
import { formatRecord, timeAgo } from "@/lib/utils";
import {
  getLeaderboard,
  getRecentResults,
  getSelectableCommunity,
  requireUser,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry, ResultWithPlayers } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { memberships, community, profile } = await getSelectableCommunity(supabase, user);

  if (!community) redirect("/onboarding");

  const [{ leaderboard }, results] = await Promise.all([
    getLeaderboard(supabase, community.id, user.id),
    getRecentResults(supabase, community.id, user.id, { limit: 25 }),
  ]);

  const current = leaderboard.find((entry) => entry.user_id === user.id) ?? null;
  const movement = getMovementSummary(results, user.id);

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Profile</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your account and stats in this community.</p>
        <div className="mt-5">
          <CommunitySelector community={community} memberships={memberships} />
        </div>
      </div>

      <div className="space-y-7">
        <section className="card p-5">
          <div className="flex items-center gap-4">
            <Avatar name={profile.display_name} src={profile.avatar_url} size={64} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-black">{profile.display_name}</h2>
              <p className="truncate text-sm text-slate-500">{profile.email}</p>
            </div>
          </div>

          <div className="mt-5">
            <AuthButton signedIn />
          </div>
        </section>

        <ProfileStatsCard current={current} movement={movement} />

        <section>
          <h2 className="mb-3 text-xl font-black">Notable games</h2>
          <div className="grid gap-3">
            <ResultHighlight result={results[0]} title="Last game" userId={user.id} />
            <ResultHighlight result={movement.biggestGain} title="Biggest Elo gain" userId={user.id} />
            <ResultHighlight result={movement.biggestLoss} title="Biggest Elo loss" userId={user.id} />
          </div>
        </section>

        <RecentResultsList results={results.slice(0, 10)} userId={user.id} />
      </div>
    </PageShell>
  );
}

function ProfileStatsCard({
  current,
  movement,
}: {
  current: LeaderboardEntry | null;
  movement: ReturnType<typeof getMovementSummary>;
}) {
  const winRate = current && current.games_played > 0 ? Math.round((current.wins / current.games_played) * 100) : 0;
  const avgDelta = movement.count > 0 ? movement.totalDelta / movement.count : 0;

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Ranking stats</h2>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-court">
          Rank {current ? `#${current.rank}` : "-"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Elo" value={current?.elo_rating ?? 1200} accent />
        <StatTile label="Record" value={current ? formatRecord(current.wins, current.losses) : "0-0"} />
        <StatTile label="Win rate" value={current?.games_played ? `${winRate}%` : "-"} />
        <StatTile label="Games" value={current?.games_played ?? 0} />
        <StatTile label="Wins" value={current?.wins ?? 0} />
        <StatTile label="Losses" value={current?.losses ?? 0} />
        <StatTile label="Recent Elo" value={formatSigned(movement.totalDelta)} accent={movement.totalDelta >= 0} />
        <StatTile label="Avg change" value={movement.count ? formatSigned(Math.round(avgDelta)) : "-"} />
      </div>
    </section>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent ? "text-court" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function ResultHighlight({
  result,
  title,
  userId,
}: {
  result?: ResultWithPlayers;
  title: string;
  userId: string;
}) {
  if (!result) {
    return (
      <div className="card p-4">
        <p className="text-xs font-bold uppercase text-slate-400">{title}</p>
        <p className="mt-1 text-sm text-slate-500">No completed match yet.</p>
      </div>
    );
  }

  const userWon = result.winner_id === userId;
  const opponent = userWon ? result.loser : result.winner;
  const delta = getResultDelta(result, userId);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-400">{title}</p>
          <p className="mt-1 truncate text-sm font-black">
            {userWon ? "Beat" : "Lost to"} {opponent.display_name}
          </p>
          <p className="text-xs font-semibold text-slate-400">{timeAgo(result.created_at)}</p>
        </div>
        <span className={`text-lg font-black ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {formatSigned(delta)}
        </span>
      </div>
    </div>
  );
}

function getMovementSummary(results: ResultWithPlayers[], userId: string) {
  const deltas = results.map((result) => ({ result, delta: getResultDelta(result, userId) }));
  const gains = deltas.filter((item) => item.delta > 0);
  const losses = deltas.filter((item) => item.delta < 0);
  const biggestGain = gains.reduce<ResultWithPlayers | undefined>(
    (best, item) => (!best || item.delta > getResultDelta(best, userId) ? item.result : best),
    undefined,
  );
  const biggestLoss = losses.reduce<ResultWithPlayers | undefined>(
    (best, item) => (!best || item.delta < getResultDelta(best, userId) ? item.result : best),
    undefined,
  );

  return {
    count: deltas.length,
    totalDelta: deltas.reduce((sum, item) => sum + item.delta, 0),
    biggestGain,
    biggestLoss,
  };
}

function getResultDelta(result: ResultWithPlayers, userId: string) {
  return result.winner_id === userId
    ? result.winner_elo_after - result.winner_elo_before
    : result.loser_elo_after - result.loser_elo_before;
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}
