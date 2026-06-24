"use client";

import { usePathname } from "next/navigation";
import { switchCommunity } from "@/actions/communities";
import type { Community, Membership } from "@/lib/types";

export function CommunitySelector({
  community,
  memberships,
}: {
  community: Community;
  memberships: Array<Membership & { communities: Community }>;
}) {
  const pathname = usePathname();

  return (
    <form action={switchCommunity}>
      <input name="redirect_to" type="hidden" value={pathname} />
      <label className="label" htmlFor="community">
        Community
      </label>
      <select
        className="input mt-1 font-semibold"
        defaultValue={community.id}
        id="community"
        name="community_id"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {memberships.map((membership) => (
          <option key={membership.community_id} value={membership.community_id}>
            {membership.communities.name}
          </option>
        ))}
      </select>
    </form>
  );
}
