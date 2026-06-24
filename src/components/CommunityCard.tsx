import { MapPin, ShieldCheck, UsersRound } from "lucide-react";
import { switchCommunity } from "@/actions/communities";
import { JoinCommunityButton } from "@/components/JoinCommunityButton";
import type { Community } from "@/lib/types";

export function CommunityCard({ community, joined = false }: { community: Community; joined?: boolean }) {
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">{community.name}</h3>
          <p className="mt-1 text-sm capitalize text-slate-500">{community.type.replace("_", " ")}</p>
        </div>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-court">
          {community.visibility === "public" ? "Public" : "Domain"}
        </span>
      </div>

      {community.description ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{community.description}</p>
      ) : null}

      <div className="mt-4 space-y-2 text-sm text-slate-500">
        {community.location ? (
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            {community.location}
          </div>
        ) : null}
        {community.allowed_email_domain ? (
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} />
            {community.allowed_email_domain}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <UsersRound size={16} />
            Open to join
          </div>
        )}
      </div>

      {joined ? (
        <form action={switchCommunity} className="mt-4">
          <input name="community_id" type="hidden" value={community.id} />
          <button className="btn-secondary w-full" type="submit">
            Set active
          </button>
        </form>
      ) : (
        <JoinCommunityButton communityId={community.id} />
      )}
    </article>
  );
}
