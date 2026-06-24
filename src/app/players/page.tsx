import { redirect } from "next/navigation";
import { CommunitySelector } from "@/components/CommunitySelector";
import { PageShell } from "@/components/PageShell";
import { PlayersBrowser } from "@/components/PlayersBrowser";
import { getLeaderboard, getProfilesForUsers, getSelectableCommunity, requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function PlayersPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { memberships, community } = await getSelectableCommunity(supabase, user);

  if (!community) redirect("/onboarding");

  const { leaderboard } = await getLeaderboard(supabase, community.id, user.id);
  const profiles = await getProfilesForUsers(
    supabase,
    leaderboard.map((entry) => entry.user_id),
  );
  const players = leaderboard.map((entry) => ({
    ...entry,
    profile: {
      ...entry.profile,
      bio: profiles.get(entry.user_id)?.bio ?? null,
    },
  }));

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

      <PlayersBrowser currentUserId={user.id} entries={players} />
    </PageShell>
  );
}
