import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { RecentResultsList } from "@/components/RecentResultsList";
import {
  getChallenges,
  getLeaderboard,
  getProfileMaybe,
  getRecentResults,
  getSelectableCommunity,
  requireUser,
} from "@/lib/data";
import { isActiveChallengeStatus } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { community } = await getSelectableCommunity(supabase, user);

  if (!community) redirect("/onboarding");

  const [{ leaderboard }, challenges, results, profile] = await Promise.all([
    getLeaderboard(supabase, community.id, user.id),
    getChallenges(supabase, community.id, user.id, { statuses: ["pending", "accepted"] }),
    getRecentResults(supabase, community.id, id),
    getProfileMaybe(supabase, id),
  ]);

  const player = leaderboard.find((entry) => entry.user_id === id);
  if (!player) notFound();
  player.profile.bio = profile?.bio ?? null;

  const hasActiveChallenge = challenges.some(
    (challenge) =>
      isActiveChallengeStatus(challenge.status) &&
      ((challenge.challenger_id === user.id && challenge.challenged_id === id) ||
        (challenge.challenger_id === id && challenge.challenged_id === user.id)),
  );

  return (
    <PageShell>
      <Link className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-slate-600" href="/dashboard">
        <ChevronLeft size={18} />
        Leaderboard
      </Link>
      <div className="space-y-8">
        <PlayerProfileCard
          communityId={community.id}
          currentUserId={user.id}
          hasActiveChallenge={hasActiveChallenge}
          player={player}
        />
        <RecentResultsList results={results} userId={id} />
      </div>
    </PageShell>
  );
}
