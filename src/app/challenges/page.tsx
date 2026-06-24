import { redirect } from "next/navigation";
import { createChallenge } from "@/actions/challenges";
import { ChallengeCard } from "@/components/ChallengeCard";
import { MatchCard } from "@/components/MatchCard";
import { PageShell } from "@/components/PageShell";
import {
  getChallenges,
  getLeaderboard,
  getSelectableCommunity,
  getStatsForUsers,
  requireUser,
  splitChallenges,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isActiveChallengeStatus } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

export default async function ChallengesPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { community } = await getSelectableCommunity(supabase, user);

  if (!community) redirect("/onboarding");

  const [activeChallenges, closedChallenges, { leaderboard }] = await Promise.all([
    getChallenges(supabase, community.id, user.id, {
      statuses: ["pending", "accepted", "result_pending", "disputed"],
    }),
    getChallenges(supabase, community.id, user.id, {
      limit: 5,
      statuses: ["completed", "declined", "canceled"],
    }),
    getLeaderboard(supabase, community.id, user.id),
  ]);
  const challenges = [...activeChallenges, ...closedChallenges];
  const split = splitChallenges(challenges, user.id);
  const activeOpponentIds = new Set(
    activeChallenges
      .filter((challenge) => isActiveChallengeStatus(challenge.status))
      .map((challenge) =>
        challenge.challenger_id === user.id ? challenge.challenged_id : challenge.challenger_id,
      ),
  );
  const challengeablePlayers = leaderboard.filter(
    (entry) => entry.user_id !== user.id && !activeOpponentIds.has(entry.user_id),
  );
  const statsByUser = await getStatsForUsers(
    supabase,
    community.id,
    Array.from(new Set(challenges.flatMap((challenge) => [challenge.challenger_id, challenge.challenged_id]))),
  );

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Challenges</h1>
        <p className="mt-2 text-sm text-slate-600">{community.name}</p>
      </div>

      <NewChallengeForm communityId={community.id} players={challengeablePlayers} />

      <ChallengeSection empty="No incoming challenges." title="Incoming">
        {split.incoming.map((challenge) => (
          <ChallengeCard challenge={challenge} currentUserId={user.id} key={challenge.id} stats={statsByUser} />
        ))}
      </ChallengeSection>

      <ChallengeSection empty="No outgoing challenges." title="Outgoing">
        {split.outgoing.map((challenge) => (
          <ChallengeCard challenge={challenge} currentUserId={user.id} key={challenge.id} stats={statsByUser} />
        ))}
      </ChallengeSection>

      <ChallengeSection empty="No open matches." title="Open matches">
        {split.accepted.map((challenge) => (
          <MatchCard challenge={challenge} currentUserId={user.id} key={challenge.id} />
        ))}
      </ChallengeSection>

      <ChallengeSection empty="No results waiting for confirmation." title="Pending results">
        {split.resultPending.map((challenge) => (
          <ChallengeCard challenge={challenge} currentUserId={user.id} key={challenge.id} stats={statsByUser} />
        ))}
      </ChallengeSection>

      <ChallengeSection empty="No disputed results." title="Disputes">
        {split.disputed.map((challenge) => (
          <ChallengeCard challenge={challenge} currentUserId={user.id} key={challenge.id} stats={statsByUser} />
        ))}
      </ChallengeSection>

      <ChallengeSection empty="No completed matches yet." title="Recently completed">
        {split.completed.slice(0, 5).map((challenge) => (
          <ChallengeCard challenge={challenge} currentUserId={user.id} key={challenge.id} stats={statsByUser} />
        ))}
      </ChallengeSection>

      <ChallengeSection empty="No recently closed challenges." title="Recently closed">
        {split.closed.slice(0, 5).map((challenge) => (
          <ChallengeCard challenge={challenge} currentUserId={user.id} key={challenge.id} stats={statsByUser} />
        ))}
      </ChallengeSection>
    </PageShell>
  );
}

function NewChallengeForm({
  communityId,
  players,
}: {
  communityId: string;
  players: LeaderboardEntry[];
}) {
  return (
    <section className="card mb-8 p-4">
      <h2 className="text-xl font-black">Send challenge</h2>
      <form action={createChallenge} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="community_id" type="hidden" value={communityId} />
        <label>
          <span className="sr-only">Player</span>
          <select className="input font-semibold" disabled={players.length === 0} name="challenged_id" required>
            {players.length === 0 ? (
              <option>No available players</option>
            ) : (
              <>
                <option value="">Choose a player</option>
                {players.map((player) => (
                  <option key={player.user_id} value={player.user_id}>
                    {player.profile.display_name} - {player.elo_rating} Elo
                  </option>
                ))}
              </>
            )}
          </select>
        </label>
        <button className="btn-primary w-full sm:w-auto" disabled={players.length === 0} type="submit">
          Send challenge
        </button>
      </form>
      {players.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Everyone available already has an active challenge with you.
        </p>
      ) : null}
    </section>
  );
}

function ChallengeSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-black">{title}</h2>
      <div className="space-y-3">
        {hasChildren ? children : <div className="card p-4 text-sm text-slate-500">{empty}</div>}
      </div>
    </section>
  );
}
