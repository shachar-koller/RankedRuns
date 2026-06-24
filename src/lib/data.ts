import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  Challenge,
  ChallengeStatus,
  ChallengeWithPlayers,
  Community,
  HeadToHeadStats,
  LeaderboardEntry,
  Membership,
  PlayerStats,
  Profile,
  ResultReport,
  ResultReportWithPlayers,
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
  const existing = await getProfileMaybe(supabase, user.id);
  if (existing) return existing;

  const email = user.email ?? "";
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    email.split("@")[0] ??
    "Player";

  const { data, error } = await supabase
    .from("profiles")
    .insert(
      {
        id: user.id,
        email,
        display_name: displayName,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        bio: null,
      },
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
    .select("*, communities!inner(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("communities.archived_at", null)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<Membership & { communities: Community }>;
}

export async function getMembershipRowsForUser(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("community_memberships")
    .select("*, communities(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<Membership & { communities: Community | null }>;
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
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Community[];
}

export async function getCommunitiesForUser(supabase: Client, userId: string) {
  const [memberships, allMemberships, communities] = await Promise.all([
    getMemberships(supabase, userId),
    getMembershipRowsForUser(supabase, userId),
    getAllCommunities(supabase),
  ]);
  const unavailableIds = new Set(
    allMemberships
      .filter((membership) => membership.status === "active" || membership.status === "pending" || membership.status === "banned")
      .map((membership) => membership.community_id),
  );

  return {
    memberships,
    pending: allMemberships.filter((membership) => membership.status === "pending"),
    unavailable: allMemberships.filter((membership) => membership.status === "banned"),
    available: communities.filter((community) => !unavailableIds.has(community.id)),
  };
}

export async function getAvailableCommunities(supabase: Client, userId: string) {
  const { available } = await getCommunitiesForUser(supabase, userId);
  return available;
}

export async function getLeaderboard(supabase: Client, communityId: string, currentUserId?: string) {
  const [{ data, error }, activeIds] = await Promise.all([
    supabase
      .from("community_player_stats")
      .select("*, profiles(id, display_name, avatar_url, bio)")
      .eq("community_id", communityId)
      .order("elo_rating", { ascending: false })
      .order("wins", { ascending: false }),
    getActiveMemberIds(supabase, communityId),
  ]);

  if (error) throw error;

  const leaderboard = (data ?? []).filter((row) => activeIds.has(row.user_id)).map((row, index) => {
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

export async function getActiveMemberIds(supabase: Client, communityId: string) {
  const { data, error } = await supabase
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", communityId)
    .eq("status", "active");

  if (error) throw error;
  return new Set((data ?? []).map((membership) => membership.user_id as string));
}

export async function getChallenges(
  supabase: Client,
  communityId: string,
  userId: string,
  options: { limit?: number; statuses?: ChallengeStatus[] } = {},
) {
  let query = supabase
    .from("challenges")
    .select(
      "*, challenger:profiles!challenges_challenger_id_fkey(id, display_name, avatar_url), challenged:profiles!challenges_challenged_id_fkey(id, display_name, avatar_url), result_reports(*)",
    )
    .eq("community_id", communityId)
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (options.statuses?.length) query = query.in("status", options.statuses);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeChallengeResultReport) as ChallengeWithPlayers[];
}

export async function getChallenge(supabase: Client, challengeId: string) {
  const { data, error } = await supabase
    .from("challenges")
    .select(
      "*, challenger:profiles!challenges_challenger_id_fkey(id, display_name, avatar_url), challenged:profiles!challenges_challenged_id_fkey(id, display_name, avatar_url), result_reports(*)",
    )
    .eq("id", challengeId)
    .single();

  if (error) throw error;
  return normalizeChallengeResultReport(data) as ChallengeWithPlayers;
}

function normalizeChallengeResultReport(row: any) {
  const reports = row.result_reports as ResultReport[] | undefined;
  const [resultReport] = reports ?? [];
  const { result_reports: _resultReports, ...challenge } = row;
  return { ...challenge, result_report: resultReport ?? null };
}

export async function getResultReportForChallenge(supabase: Client, challengeId: string) {
  const { data, error } = await supabase
    .from("result_reports")
    .select(
      "*, winner:profiles!result_reports_winner_id_fkey(id, display_name, avatar_url), loser:profiles!result_reports_loser_id_fkey(id, display_name, avatar_url), submitter:profiles!result_reports_submitted_by_fkey(id, display_name, avatar_url)",
    )
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ResultReportWithPlayers | null;
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

export async function getHeadToHeadStats(
  supabase: Client,
  communityId: string,
  playerId: string,
  opponentId: string,
): Promise<HeadToHeadStats> {
  const { data, error } = await supabase
    .from("results")
    .select("winner_id, loser_id")
    .eq("community_id", communityId)
    .or(`winner_id.eq.${playerId},loser_id.eq.${playerId}`);

  if (error) throw error;

  const games = (data ?? []).filter(
    (result) => result.winner_id === opponentId || result.loser_id === opponentId,
  );
  const wins = games.filter((result) => result.winner_id === playerId).length;
  const totalGames = games.length;

  return {
    wins,
    losses: totalGames - wins,
    totalGames,
    winPercentage: totalGames === 0 ? 0 : wins / totalGames,
  };
}

export async function getCommunityMemberships(supabase: Client, communityId: string) {
  const { data, error } = await supabase
    .from("community_memberships")
    .select("*, profiles(id, display_name, avatar_url, email, bio)")
    .eq("community_id", communityId)
    .order("status", { ascending: true })
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<Membership & { profiles: Profile }>;
}

export async function getCommunityAdminState(supabase: Client, communityId: string, userId: string) {
  const [{ data: isCommunityAdmin, error: communityAdminError }, { data: isAppAdmin, error: appAdminError }] =
    await Promise.all([
      supabase.rpc("is_community_admin", { target_community_id: communityId, target_user_id: userId }),
      supabase.rpc("is_app_admin", { target_user_id: userId }),
    ]);

  if (communityAdminError) throw communityAdminError;
  if (appAdminError) throw appAdminError;

  return {
    isCommunityAdmin: Boolean(isCommunityAdmin),
    isAppAdmin: Boolean(isAppAdmin),
  };
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
    resultPending: challenges.filter((challenge) => challenge.status === "result_pending"),
    disputed: challenges.filter((challenge) => challenge.status === "disputed"),
    completed: challenges.filter((challenge) => challenge.status === "completed"),
    closed: challenges.filter((challenge) => challenge.status === "declined" || challenge.status === "canceled"),
  };
}

export function getOpponent(challenge: Challenge, userId: string) {
  return challenge.challenger_id === userId ? challenge.challenged_id : challenge.challenger_id;
}
