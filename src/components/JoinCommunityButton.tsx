import { joinCommunity } from "@/actions/communities";

export function JoinCommunityButton({
  communityId,
  requiresApproval = false,
}: {
  communityId: string;
  requiresApproval?: boolean;
}) {
  return (
    <form action={joinCommunity} className="mt-4">
      <input name="community_id" type="hidden" value={communityId} />
      <button className="btn-primary w-full" type="submit">
        {requiresApproval ? "Request to join" : "Join community"}
      </button>
    </form>
  );
}
