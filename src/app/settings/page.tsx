import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthButton } from "@/components/AuthButton";
import { CommunityAdminPanel } from "@/components/CommunityAdminPanel";
import { CommunitySelector } from "@/components/CommunitySelector";
import { FeedbackForm } from "@/components/FeedbackForm";
import { PageShell } from "@/components/PageShell";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCommunityAdminState, getCommunityMemberships, getSelectableCommunity, requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { memberships, community, profile } = await getSelectableCommunity(supabase, user);

  if (!community) redirect("/onboarding");

  const adminState = await getCommunityAdminState(supabase, community.id, user.id);
  const communityMemberships = adminState.isCommunityAdmin
    ? await getCommunityMemberships(supabase, community.id)
    : [];

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Profile and account controls.</p>
        <div className="mt-5">
          <CommunitySelector community={community} memberships={memberships} />
        </div>
      </div>

      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-black">User settings</h2>
          <ProfileSettingsForm profile={profile} />
          <ThemeToggle />
          <FeedbackForm communityId={community.id} />
          <div className="card p-5">
            <h3 className="font-black">Account</h3>
            <p className="mt-1 text-sm text-slate-500">Sign out of Ranked Runs on this device.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AuthButton signedIn />
              <Link className="text-sm font-bold text-court" href="/">
                View landing page
              </Link>
            </div>
          </div>
        </section>
        {adminState.isCommunityAdmin ? (
          <CommunityAdminPanel
            community={community}
            currentUserId={user.id}
            isAppAdmin={adminState.isAppAdmin}
            memberships={communityMemberships}
          />
        ) : null}
      </div>
    </PageShell>
  );
}
