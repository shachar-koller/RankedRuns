import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  Challenge,
  ChallengeStatus,
  ChallengeWithPlayers,
  Community,
  LeaderboardEntry,
  Membership,
  PlayerStats,
  Profile,
  ResultWithPlayers,
} from "@/lib/types";

type Client = SupabaseClient<any>;

export async function getCurrentUser(supabase: Client) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(supabase: Client) {
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/");
  return user;
}

export async function ensureProfile(supabase: Client, user: User) {
  const email = user.email ?? "";
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    email.split("@")[0] ??
    "Player";

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        display_name: displayName,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        bio: null,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProfile(supabase: Client, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function getProfileMaybe(supabase: Client, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProfilesForUsers(supabase: Client, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Profile>();

  const { data, error } = await supabase.from("profiles").select("*").in("id", userIds);
  if (error) throw error;

  return new Map((data ?? []).map((profile) => [profile.id, profile as Profile]));
}

export async function getMemberships(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("community_memberships")
    .select("*, communities(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<Membership & { communities: Community }>;
}

export async function getSelectableCommunity(supabase: Client, user: User) {
  const [existingProfile, memberships] = await Promise.all([
    getProfileMaybe(supabase, user.id),
    getMemberships(supabase, user.id),
  ]);
  const profile = existingProfile ?? (await ensureProfile(supabase, user));

  if (memberships.length === 0) return { profile, memberships, community: null };

  const selected =
    memberships.find((membership) => membership.community_id === profile.last_selected_community_id) ??
    memberships[0];

  return { profile, memberships, community: selected.communities };
}

async function getAllCommunities(supabase: Client) {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Community[];
}

export async function getCommunitiesForUser(supabase: Client, userId: string) {
  const [memberships, communities] = await Promise.all([
    getMemberships(supabase, userId),
    getAllCommunities(supabase),
  ]);
  const joinedIds = new Set(memberships.map((membership) => membership.community_id));

  return {
    memberships,
    available: communities.filter((community) => !joinedIds.has(community.id)),
  };
}

export async function getAvailableCommunities(supabase: Client, userId: string) {
  const { available } = await getCommunitiesForUser(supabase, userId);
  return available;
}

export async function getLeaderboard(supabase: Client, communityId: string, currentUserId?: string) {
  const { data, error } = await supabase
    .from("community_player_stats")
    .select("*, profiles(id, display_name, avatar_url)")
    .eq("community_id", communityId)
    .order("elo_rating", { ascending: false })
    .order("wins", { ascending: false });

  if (error) throw error;

  const leaderboard = (data ?? []).map((row, index) => {
    const typedRow = row as PlayerStats & { profiles: Profile };
    return {
      ...typedRow,
      rank: index + 1,
      profile: typedRow.profiles,
    };
  });

  const current = currentUserId
    ? leaderboard.find((entry) => entry.user_id === currentUserId) ?? null
    : null;

  return { leaderboard: leaderboard as LeaderboardEntry[], current };
}

export async function getChallenges(
  supabase: Client,
  communityId: string,
  userId: string,
  options: { limit?: number; statuses?: ChallengeStatus[] } = {},
) {
  let query = supabase
    .from("challenges")
    .select("*, challenger:profiles!challenges_challenger_id_fkey(id, display_name, avatar_url), challenged:profiles!challenges_challenged_id_fkey(id, display_name, avatar_url)")
    .eq("community_id", communityId)
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (options.statuses?.length) query = query.in("status", options.statuses);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ChallengeWithPlayers[];
}

export async function getChallenge(supabase: Client, challengeId: string) {
  const { data, error } = await supabase
    .from("challenges")
    .select("*, challenger:profiles!challenges_challenger_id_fkey(id, display_name, avatar_url), challenged:profiles!challenges_challenged_id_fkey(id, display_name, avatar_url)")
    .eq("id", challengeId)
    .single();

  if (error) throw error;
  return data as unknown as ChallengeWithPlayers;
}

export async function getStatsForUsers(supabase: Client, communityId: string, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, PlayerStats>();

  const { data, error } = await supabase
    .from("community_player_stats")
    .select("*")
    .eq("community_id", communityId)
    .in("user_id", userIds);

  if (error) throw error;
  return new Map((data ?? []).map((stats) => [stats.user_id, stats]));
}

export async function getRecentResults(
  supabase: Client,
  communityId: string,
  userId?: string,
  options: { limit?: number } = {},
) {
  let query = supabase
    .from("results")
    .select("*, winner:profiles!results_winner_id_fkey(id, display_name, avatar_url), loser:profiles!results_loser_id_fkey(id, display_name, avatar_url)")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 10);

  if (userId) {
    query = query.or(`winner_id.eq.${userId},loser_id.eq.${userId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ResultWithPlayers[];
}

export function splitChallenges(challenges: ChallengeWithPlayers[], userId: string) {
  return {
    incoming: challenges.filter(
      (challenge) => challenge.status === "pending" && challenge.challenged_id === userId,
    ),
    outgoing: challenges.filter(
      (challenge) => challenge.status === "pending" && challenge.challenger_id === userId,
    ),
    accepted: challenges.filter((challenge) => challenge.status === "accepted"),
    completed: challenges.filter((challenge) => challenge.status === "completed"),
  };
}

export function getOpponent(challenge: Challenge, userId: string) {
  return challenge.challenger_id === userId ? challenge.challenged_id : challenge.challenger_id;
}
