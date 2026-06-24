"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackType } from "@/lib/types";

export type FeedbackActionState = {
  ok?: string;
  error?: string;
};

const feedbackTypes = new Set<FeedbackType>([
  "bug",
  "complaint",
  "feature_request",
  "confusing_behavior",
  "general",
]);

export async function submitFeedbackAction(
  _previousState: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const headerStore = await headers();

  const requestedType = String(formData.get("type") ?? "general") as FeedbackType;
  const type = feedbackTypes.has(requestedType) ? requestedType : "general";
  const message = String(formData.get("message") ?? "").trim();
  const screen = String(formData.get("screen") ?? "").trim() || null;
  const communityId = String(formData.get("community_id") ?? "").trim() || null;
  const screenshotUrl = String(formData.get("screenshot_url") ?? "").trim() || null;

  if (message.length < 5) return { error: "Add a few details before submitting." };

  const { error } = await supabase.from("feedback_submissions").insert({
    user_id: user.id,
    community_id: communityId,
    type,
    screen,
    message,
    screenshot_url: screenshotUrl,
    user_agent: headerStore.get("user-agent"),
    metadata: {
      referer: headerStore.get("referer"),
    },
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: "Feedback sent." };
}
