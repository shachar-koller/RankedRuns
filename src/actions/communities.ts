"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { CommunityType, CommunityVisibility } from "@/lib/types";

export async function createCommunity(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other") as CommunityType;
  const visibility = String(formData.get("visibility") ?? "public") as CommunityVisibility;
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
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: membershipError } = await supabase.from("community_memberships").insert({
    community_id: community.id,
    user_id: user.id,
    role: "admin",
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

  const { error } = await supabase.rpc("join_community", {
    target_community_id: communityId,
  });

  if (error) throw error;

  await supabase
    .from("profiles")
    .update({ last_selected_community_id: communityId })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function switchCommunity(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const communityId = String(formData.get("community_id") ?? "");
  const redirectTo = getSafeRedirectPath(String(formData.get("redirect_to") ?? "/dashboard"));

  const { error } = await supabase
    .from("profiles")
    .update({ last_selected_community_id: communityId })
    .eq("id", user.id);

  if (error) throw error;

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

function getSafeRedirectPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}
