"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function createChallenge(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const communityId = String(formData.get("community_id") ?? "");
  const challengedId = String(formData.get("challenged_id") ?? "");

  if (!communityId || !challengedId) throw new Error("Choose a player to challenge.");
  if (challengedId === user.id) throw new Error("You cannot challenge yourself.");

  const { error } = await supabase.from("challenges").insert({
    community_id: communityId,
    challenger_id: user.id,
    challenged_id: challengedId,
    status: "pending",
  });

  if (error) throw error;

  revalidatePath("/", "layout");
  redirect("/challenges");
}

export async function updateChallengeStatus(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const challengeId = String(formData.get("challenge_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const update =
    status === "accepted"
      ? { status, accepted_at: new Date().toISOString() }
      : { status };

  const { error } = await supabase.from("challenges").update(update).eq("id", challengeId);
  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function submitResult(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const challengeId = String(formData.get("challenge_id") ?? "");
  const winnerId = String(formData.get("winner_id") ?? "");

  const { error } = await supabase.rpc("submit_result", {
    target_challenge_id: challengeId,
    winner_profile_id: winnerId,
  });

  if (error) throw error;

  revalidatePath("/", "layout");
  redirect("/challenges");
}
