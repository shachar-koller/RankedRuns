import { redirect } from "next/navigation";
import { CommunitySelector } from "@/components/CommunitySelector";
import { PageShell } from "@/components/PageShell";
import { PlayersBrowser } from "@/components/PlayersBrowser";
import { getChallenges, getLeaderboard, getSelectableCommunity, requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isActiveChallengeStatus } from "@/lib/utils";

export default async function PlayersPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { memberships, community } = await getSelectableCommunity(supabase, user);

  if (!community) redirect("/onboarding");

  const [{ leaderboard }, challenges] = await Promise.all([
    getLeaderboard(supabase, community.id, user.id),
    getChallenges(supabase, community.id, user.id, {
      statuses: ["pending", "accepted", "result_pending", "disputed"],
    }),
  ]);
  const activeOpponentIds = challenges
    .filter((challenge) => isActiveChallengeStatus(challenge.status))
    .map((challenge) =>
      challenge.challenger_id === user.id ? challenge.challenged_id : challenge.challenger_id,
    );

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Players</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Browse everyone in this community and compare records, Elo, and activity.
        </p>
        <div className="mt-5">
          <CommunitySelector community={community} memberships={memberships} />
        </div>
      </div>

      <PlayersBrowser
        activeOpponentIds={Array.from(new Set(activeOpponentIds))}
        communityId={community.id}
        currentUserId={user.id}
        entries={leaderboard}
      />
    </PageShell>
  );
}
