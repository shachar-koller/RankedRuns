import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { CommunityCard } from "@/components/CommunityCard";
import { PageShell } from "@/components/PageShell";
import { getCommunitiesForUser, requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { memberships, available: communities } = await getCommunitiesForUser(supabase, user.id);

  return (
    <PageShell withNav={false}>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <BrandLogo className="drop-shadow-sm" priority size={44} />
          <p className="text-sm font-black uppercase text-court">Ranked Runs</p>
        </div>
        <h1 className="mt-2 text-3xl font-black">Choose your first community</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Join an existing community or create a private one for your own runs.
        </p>
      </div>

      <Link className="btn-primary mb-6 w-full" href="/communities/new">
        Create a new community
      </Link>

      <div className="space-y-3">
        {communities.length === 0 && memberships.length === 0 ? (
          <div className="card p-4 text-sm text-slate-600">
            No communities exist yet. Create the first ranking group to start playing.
          </div>
        ) : null}
        {communities.map((community) => (
          <CommunityCard community={community} key={community.id} />
        ))}
      </div>
    </PageShell>
  );
}
