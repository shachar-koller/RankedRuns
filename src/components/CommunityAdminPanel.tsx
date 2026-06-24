import {
  archiveCommunity,
  reviewMembership,
  updateCommunityJoinPolicy,
  updateMembershipRole,
} from "@/actions/communities";
import { Avatar } from "@/components/Avatar";
import type { Community, Membership, Profile } from "@/lib/types";

type MembershipWithProfile = Membership & { profiles: Profile };

export function CommunityAdminPanel({
  community,
  memberships,
  currentUserId,
  isAppAdmin,
}: {
  community: Community;
  memberships: MembershipWithProfile[];
  currentUserId: string;
  isAppAdmin: boolean;
}) {
  const pending = memberships.filter((membership) => membership.status === "pending");
  const active = memberships.filter((membership) => membership.status === "active");
  const inactive = memberships.filter((membership) => membership.status !== "pending" && membership.status !== "active");
  const canAssignAdmins = isAppAdmin || community.created_by === currentUserId;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black">Community admin</h2>

      <div className="card p-5">
        <h3 className="font-black">Join approvals</h3>
        <p className="mt-1 text-sm text-slate-500">Choose whether new members join immediately or wait for approval.</p>
        <form action={updateCommunityJoinPolicy} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input name="community_id" type="hidden" value={community.id} />
          <select className="input font-semibold" defaultValue={community.join_policy} name="join_policy">
            <option value="instant">Instant join</option>
            <option value="approval_required">Approval required</option>
          </select>
          <button className="btn-secondary w-full sm:w-auto" type="submit">
            Save
          </button>
        </form>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black">Pending requests</h3>
            <p className="mt-1 text-sm text-slate-500">{pending.length} waiting for review.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500">No pending requests.</p>
          ) : (
            pending.map((membership) => (
              <MembershipRow key={membership.id} membership={membership}>
                <MembershipAction membershipId={membership.id} status="active" label="Approve" primary />
                <MembershipAction membershipId={membership.id} status="rejected" label="Reject" />
                <MembershipAction membershipId={membership.id} status="banned" label="Ban" danger />
              </MembershipRow>
            ))
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-black">Active members</h3>
        <div className="mt-4 space-y-3">
          {active.map((membership) => (
            <MembershipRow key={membership.id} membership={membership}>
              {canAssignAdmins ? (
                <RoleAction
                  label={membership.role === "admin" ? "Demote" : "Make admin"}
                  membershipId={membership.id}
                  role={membership.role === "admin" ? "member" : "admin"}
                />
              ) : null}
              <MembershipAction membershipId={membership.id} status="removed" label="Remove" />
              <MembershipAction membershipId={membership.id} status="banned" label="Ban" danger />
            </MembershipRow>
          ))}
        </div>
      </div>

      {inactive.length > 0 ? (
        <div className="card p-5">
          <h3 className="font-black">Inactive members</h3>
          <div className="mt-4 space-y-3">
            {inactive.map((membership) => (
              <MembershipRow key={membership.id} membership={membership}>
                {membership.status !== "banned" ? (
                  <MembershipAction membershipId={membership.id} status="active" label="Restore" primary />
                ) : null}
                {membership.status !== "banned" ? (
                  <MembershipAction membershipId={membership.id} status="banned" label="Ban" danger />
                ) : null}
              </MembershipRow>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card border-red-200 p-5">
        <h3 className="font-black text-red-600">Archive community</h3>
        <p className="mt-1 text-sm text-slate-500">
          Archiving hides this community from normal use and blocks new challenges without deleting history.
        </p>
        <form action={archiveCommunity} className="mt-4">
          <input name="community_id" type="hidden" value={community.id} />
          <button className="btn-secondary w-full text-red-600" type="submit">
            Archive community
          </button>
        </form>
      </div>
    </section>
  );
}

function MembershipRow({
  membership,
  children,
}: {
  membership: MembershipWithProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-3">
        <Avatar name={membership.profiles.display_name} src={membership.profiles.avatar_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">{membership.profiles.display_name}</p>
          <p className="truncate text-xs font-semibold text-slate-400">
            {membership.role} · {membership.status}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MembershipAction({
  membershipId,
  status,
  label,
  primary = false,
  danger = false,
}: {
  membershipId: string;
  status: string;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <form action={reviewMembership}>
      <input name="membership_id" type="hidden" value={membershipId} />
      <input name="status" type="hidden" value={status} />
      <button
        className={
          primary
            ? "btn-primary"
            : danger
              ? "min-h-10 px-3 text-sm font-bold text-red-500"
              : "btn-secondary"
        }
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function RoleAction({
  membershipId,
  role,
  label,
}: {
  membershipId: string;
  role: string;
  label: string;
}) {
  return (
    <form action={updateMembershipRole}>
      <input name="membership_id" type="hidden" value={membershipId} />
      <input name="role" type="hidden" value={role} />
      <button className="btn-secondary" type="submit">
        {label}
      </button>
    </form>
  );
}
