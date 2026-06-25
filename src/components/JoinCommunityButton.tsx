import { joinCommunity } from "@/actions/communities";
import { FormSubmitButton } from "@/components/FormSubmitButton";

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
      <FormSubmitButton pendingLabel={requiresApproval ? "Sending request..." : "Joining..."}>
        {requiresApproval ? "Request to join" : "Join community"}
      </FormSubmitButton>
    </form>
  );
}
