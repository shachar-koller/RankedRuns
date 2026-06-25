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
  if (!["accepted", "declined", "canceled"].includes(status)) {
    throw new Error("Unsupported challenge status.");
  }
  const update =
    status === "accepted"
      ? { status, accepted_at: new Date().toISOString() }
      : { status };

  const { error } = await supabase.from("challenges").update(update).eq("id", challengeId);
  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function submitResultReport(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const challengeId = String(formData.get("challenge_id") ?? "");
  const winnerId = String(formData.get("winner_id") ?? "");
  const gameTo = Number(formData.get("game_to"));
  const loserScore = Number(formData.get("loser_score"));

  if (![7, 11, 21].includes(gameTo) || !Number.isInteger(loserScore) || loserScore < 0 || loserScore >= gameTo) {
    throw new Error("Enter a valid score.");
  }

  const { error } = await supabase.rpc("submit_result_report", {
    target_challenge_id: challengeId,
    winner_profile_id: winnerId,
    winner_score_input: gameTo,
    loser_score_input: loserScore,
    game_to_input: gameTo,
  });

  if (error) throw error;

  revalidatePath("/", "layout");
  redirect("/challenges");
}

export async function confirmResultReport(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const reportId = String(formData.get("result_report_id") ?? "");

  const { error } = await supabase.rpc("confirm_result_report", {
    target_report_id: reportId,
  });

  if (error) throw error;

  revalidatePath("/", "layout");
  redirect("/challenges");
}

export async function disputeResultReport(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const reportId = String(formData.get("result_report_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const { error } = await supabase.rpc("dispute_result_report", {
    target_report_id: reportId,
    reason,
  });

  if (error) throw error;

  revalidatePath("/", "layout");
  redirect("/challenges");
}
