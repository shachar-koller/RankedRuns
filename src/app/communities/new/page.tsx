import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateCommunityForm } from "@/components/CreateCommunityForm";
import { PageShell } from "@/components/PageShell";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function NewCommunityPage() {
  const supabase = await createClient();
  await requireUser(supabase);

  return (
    <PageShell withNav={false}>
      <Link className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-slate-600" href="/communities">
        <ChevronLeft size={18} />
        Back
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Create community</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Start a ranking group for a school, park, shul, gym, or friend group.
        </p>
      </div>
      <div className="card p-4">
        <CreateCommunityForm />
      </div>
    </PageShell>
  );
}
