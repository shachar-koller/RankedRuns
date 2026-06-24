import Link from "next/link";
import { CommunityCard } from "@/components/CommunityCard";
import { PageShell } from "@/components/PageShell";
import { getCommunitiesForUser, requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function CommunitiesPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { memberships, available } = await getCommunitiesForUser(supabase, user.id);

  return (
    <PageShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Communities</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Switch communities, join a public one, or create a new group.</p>
        </div>
        <Link className="btn-primary shrink-0" href="/communities/new">
          New
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-black">Your communities</h2>
        {memberships.length === 0 ? (
          <p className="card p-4 text-sm text-slate-500">You have not joined a community yet.</p>
        ) : (
          memberships.map((membership) => (
            <CommunityCard community={membership.communities} joined key={membership.community_id} />
          ))
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-black">Available to join</h2>
        {available.length === 0 ? (
          <p className="card p-4 text-sm text-slate-500">No additional communities are available.</p>
        ) : (
          available.map((community) => <CommunityCard community={community} key={community.id} />)
        )}
      </section>
    </PageShell>
  );
}
