import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PlayerDuel } from "@/components/MatchCard";
import { ResultSubmissionForm } from "@/components/ResultSubmissionForm";
import { ResultReportCard } from "@/components/ResultReportCard";
import { getChallenge, getResultReportForChallenge, getSelectableCommunity, getStatsForUsers, requireUser } from "@/lib/data";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const [{ community }, challenge] = await Promise.all([
    getSelectableCommunity(supabase, user),
    getChallenge(supabase, id),
  ]);

  if (!community) redirect("/onboarding");
  if (challenge.community_id !== community.id) notFound();

  const involved = challenge.challenger_id === user.id || challenge.challenged_id === user.id;
  if (!involved) notFound();

  const statsByUser = await getStatsForUsers(supabase, community.id, [
    challenge.challenger_id,
    challenge.challenged_id,
  ]);
  const resultReport =
    challenge.status === "result_pending" || challenge.status === "disputed"
      ? await getResultReportForChallenge(supabase, challenge.id)
      : null;
  const challengerStats = statsByUser.get(challenge.challenger_id);
  const challengedStats = statsByUser.get(challenge.challenged_id);

  return (
    <PageShell withNav={false}>
      <Link className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-slate-600" href="/challenges">
        <ChevronLeft size={18} />
        Challenges
      </Link>

      <div className="mb-7 text-center">
        <p className="text-sm font-black uppercase text-court">Match result</p>
        <h1 className="mt-2 text-3xl font-black">
          {challenge.challenger.display_name} vs {challenge.challenged.display_name}
        </h1>
      </div>

      <div className="space-y-7">
        <PlayerDuel
          leftAvatar={challenge.challenger.avatar_url}
          leftElo={challengerStats?.elo_rating ?? 1200}
          leftName={challenge.challenger_id === user.id ? "You" : challenge.challenger.display_name}
          rightAvatar={challenge.challenged.avatar_url}
          rightElo={challengedStats?.elo_rating ?? 1200}
          rightName={challenge.challenged_id === user.id ? "You" : challenge.challenged.display_name}
        />

        {challenge.status === "accepted" ? (
          <ResultSubmissionForm challenge={challenge} statsByUser={statsByUser} />
        ) : resultReport ? (
          <ResultReportCard currentUserId={user.id} report={resultReport} />
        ) : (
          <div className="card p-4 text-sm text-slate-600">
            Results can only be submitted for accepted matches. Current status:{" "}
            <span className="font-bold">{challenge.status}</span>.
          </div>
        )}
      </div>
    </PageShell>
  );
}
