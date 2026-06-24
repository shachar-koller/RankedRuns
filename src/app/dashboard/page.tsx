import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ChallengeCard } from "@/components/ChallengeCard";
import { CommunitySelector } from "@/components/CommunitySelector";
import { CurrentPlayerStatsCard } from "@/components/CurrentPlayerStatsCard";
import { Leaderboard } from "@/components/Leaderboard";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { memberships, community } = await getSelectableCommunity(supabase, user);

  if (!community) redirect("/onboarding");

  const [{ leaderboard, current }, challenges] = await Promise.all([
    getLeaderboard(supabase, community.id, user.id),
    getChallenges(supabase, community.id, user.id, { statuses: ["pending", "accepted"] }),
  ]);
  const split = splitChallenges(challenges, user.id);
  const active = [...split.incoming, ...split.outgoing, ...split.accepted].slice(0, 3);
  const statsByUser = await getStatsForUsers(
    supabase,
    community.id,
    Array.from(new Set(active.flatMap((challenge) => [challenge.challenger_id, challenge.challenged_id]))),
  );

  return (
    <PageShell>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo className="-ml-1 drop-shadow-sm" priority size={58} />
            <div>
              <h1 className="text-4xl font-black">Ranked Runs</h1>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <CommunitySelector community={community} memberships={memberships} />
        </div>
      </div>

      <div className="space-y-7">
        <CurrentPlayerStatsCard stats={current} />
        <Leaderboard currentUserId={user.id} entries={leaderboard} />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Active challenges</h2>
            <Link className="text-sm font-bold text-court" href="/challenges">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {active.length === 0 ? (
              <div className="card flex items-center gap-3 p-4 text-sm text-slate-600">
                <ClipboardList className="text-court" size={22} />
                No open challenges. Pick a player from the leaderboard.
              </div>
            ) : (
              active.map((challenge) => (
                <ChallengeCard challenge={challenge} currentUserId={user.id} key={challenge.id} stats={statsByUser} />
              ))
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
