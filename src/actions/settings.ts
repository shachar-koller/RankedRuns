"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data";
import { hasSupabaseServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionState = {
  ok?: string;
  error?: string;
};

export async function updatePlayerStatsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createClient();
  await requireUser(supabase);

  const communityId = String(formData.get("community_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const elo = Number(formData.get("elo_rating"));
  const wins = Number(formData.get("wins"));
  const losses = Number(formData.get("losses"));

  if (!communityId || !userId || !Number.isInteger(elo) || !Number.isInteger(wins) || !Number.isInteger(losses)) {
    return { error: "Enter a valid player, Elo, wins, and losses." };
  }

  const { error } = await supabase.rpc("admin_update_player_stats", {
    target_community_id: communityId,
    target_user_id: userId,
    new_elo_rating: elo,
    new_wins: wins,
    new_losses: losses,
  });

  if (error) return { error: error.message };

  revalidateRankedRoutes();
  return { ok: "Player stats updated." };
}

export async function createTestAccountAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  if (!hasSupabaseServiceRoleKey()) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is required for creating auth test accounts." };
  }

  const communityId = String(formData.get("community_id") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const elo = Number(formData.get("elo_rating") || 1200);
  const wins = Number(formData.get("wins") || 0);
  const losses = Number(formData.get("losses") || 0);

  if (!communityId || !displayName || !email || !email.includes("@")) {
    return { error: "Enter a display name and valid email." };
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) return { error: "Community admin access is required." };

  const admin = createAdminClient();
  const password = crypto.randomUUID();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });

  if (authError || !created.user) {
    return { error: authError?.message ?? "Could not create test account." };
  }

  const profileId = created.user.id;

  const profilePayload = {
    id: profileId,
    email,
    display_name: displayName,
    avatar_url: null,
    ...(bio ? { bio } : {}),
  };

  const { error: profileError } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });

  if (profileError) return { error: profileError.message };

  const { error: membershipError } = await admin.from("community_memberships").upsert(
    {
      community_id: communityId,
      user_id: profileId,
      role: "member",
      status: "active",
    },
    { onConflict: "community_id,user_id" },
  );

  if (membershipError) return { error: membershipError.message };

  const { error: statsError } = await admin.from("community_player_stats").upsert(
    {
      community_id: communityId,
      user_id: profileId,
      elo_rating: elo,
      wins,
      losses,
      games_played: wins + losses,
    },
    { onConflict: "community_id,user_id" },
  );

  if (statsError) return { error: statsError.message };

  revalidateRankedRoutes();
  return { ok: `Created ${displayName} as a test player.` };
}

function revalidateRankedRoutes() {
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/players");
  revalidatePath("/profile");
  revalidatePath("/settings");
}
