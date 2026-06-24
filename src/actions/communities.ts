"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { CommunityJoinPolicy, CommunityType, CommunityVisibility, MembershipRole, MembershipStatus } from "@/lib/types";

export async function createCommunity(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other") as CommunityType;
  const visibility = String(formData.get("visibility") ?? "public") as CommunityVisibility;
  const joinPolicy = String(formData.get("join_policy") ?? "instant") as CommunityJoinPolicy;
  const allowedEmailDomain = String(formData.get("allowed_email_domain") ?? "").trim().toLowerCase();

  if (!name) throw new Error("Community name is required.");
  if (visibility === "domain_restricted" && !allowedEmailDomain) {
    throw new Error("Domain-restricted communities need an allowed email domain.");
  }

  const { data: community, error } = await supabase
    .from("communities")
    .insert({
      name,
      type,
      description: String(formData.get("description") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      allowed_email_domain: allowedEmailDomain || null,
      visibility,
      join_policy: joinPolicy,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: membershipError } = await supabase.from("community_memberships").insert({
    community_id: community.id,
    user_id: user.id,
    role: "admin",
    status: "active",
  });

  if (membershipError) throw membershipError;

  await supabase
    .from("profiles")
    .update({ last_selected_community_id: community.id })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function joinCommunity(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const communityId = String(formData.get("community_id") ?? "");

  const { data: membership, error } = await supabase.rpc("join_community", {
    target_community_id: communityId,
  });

  if (error) throw error;

  if (membership?.status === "active") {
    await supabase
      .from("profiles")
      .update({ last_selected_community_id: communityId })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  redirect(membership?.status === "pending" ? "/communities?requested=1" : "/dashboard");
}

export async function switchCommunity(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const communityId = String(formData.get("community_id") ?? "");
  const redirectTo = getSafeRedirectPath(String(formData.get("redirect_to") ?? "/dashboard"));

  const { data: membership, error: membershipError } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You can only switch to active communities.");

  const { error } = await supabase
    .from("profiles")
    .update({ last_selected_community_id: communityId })
    .eq("id", user.id);

  if (error) throw error;

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function reviewMembership(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const membershipId = String(formData.get("membership_id") ?? "");
  const status = String(formData.get("status") ?? "") as MembershipStatus;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const { error } = await supabase.rpc("review_community_membership", {
    target_membership_id: membershipId,
    next_status: status,
    reason,
  });

  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function updateMembershipRole(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const membershipId = String(formData.get("membership_id") ?? "");
  const role = String(formData.get("role") ?? "") as MembershipRole;

  const { error } = await supabase.rpc("set_community_membership_role", {
    target_membership_id: membershipId,
    next_role: role,
  });

  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function archiveCommunity(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const communityId = String(formData.get("community_id") ?? "");

  const { error } = await supabase.rpc("archive_community", {
    target_community_id: communityId,
  });

  if (error) throw error;

  revalidatePath("/", "layout");
  redirect("/communities");
}

export async function updateCommunityJoinPolicy(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const communityId = String(formData.get("community_id") ?? "");
  const joinPolicy = String(formData.get("join_policy") ?? "instant") as CommunityJoinPolicy;

  if (!["instant", "approval_required"].includes(joinPolicy)) {
    throw new Error("Unsupported join policy.");
  }

  const { error } = await supabase
    .from("communities")
    .update({ join_policy: joinPolicy })
    .eq("id", communityId);

  if (error) throw error;

  revalidatePath("/", "layout");
}

function getSafeRedirectPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}
