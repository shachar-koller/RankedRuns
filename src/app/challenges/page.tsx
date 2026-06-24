import { redirect } from "next/navigation";
import { ChallengeCard } from "@/components/ChallengeCard";
import { MatchCard } from "@/components/MatchCard";
import { PageShell } from "@/components/PageShell";
import {
  getChallenges,
  getSelectableCommunity,
  getStatsForUsers,
  requireUser,
  splitChallenges,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function ChallengesPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { community } = await getSelectableCommunity(supabase, user);

  if (!community) redirect("/onboarding");

  const [activeChallenges, completedChallenges] = await Promise.all([
    getChallenges(supabase, community.id, user.id, { statuses: ["pending", "accepted"] }),
    getChallenges(supabase, community.id, user.id, { limit: 5, statuses: ["completed"] }),
  ]);
  const challenges = [...activeChallenges, ...completedChallenges];
  const split = splitChallenges(challenges, user.id);
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

      <ChallengeSection empty="No completed matches yet." title="Recently completed">
        {split.completed.slice(0, 5).map((challenge) => (
          <ChallengeCard challenge={challenge} currentUserId={user.id} key={challenge.id} stats={statsByUser} />
        ))}
      </ChallengeSection>
    </PageShell>
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
