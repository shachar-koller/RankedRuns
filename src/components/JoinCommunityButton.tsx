import { joinCommunity } from "@/actions/communities";

export function JoinCommunityButton({ communityId }: { communityId: string }) {
  return (
    <form action={joinCommunity} className="mt-4">
      <input name="community_id" type="hidden" value={communityId} />
      <button className="btn-primary w-full" type="submit">
        Join community
      </button>
    </form>
  );
}
