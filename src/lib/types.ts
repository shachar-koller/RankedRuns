export type CommunityType = "university" | "park" | "shul" | "gym" | "friend_group" | "other";
export type CommunityVisibility = "public" | "domain_restricted";
export type CommunityJoinPolicy = "instant" | "approval_required";
export type MembershipRole = "member" | "admin";
export type MembershipStatus = "pending" | "active" | "rejected" | "removed" | "banned";
export type ChallengeStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed"
  | "canceled"
  | "result_pending"
  | "disputed";
export type ResultReportStatus = "pending" | "disputed" | "confirmed" | "canceled";
export type FeedbackType = "bug" | "complaint" | "feature_request" | "confusing_behavior" | "general";

export type Profile = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio?: string | null;
  last_selected_community_id: string | null;
  created_at: string;
};

export type Community = {
  id: string;
  name: string;
  type: CommunityType;
  description: string | null;
  location: string | null;
  allowed_email_domain: string | null;
  visibility: CommunityVisibility;
  join_policy: CommunityJoinPolicy;
  created_by: string;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
};

export type Membership = {
  id: string;
  community_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status_reason: string | null;
  joined_at: string;
};

export type AppAdmin = {
  user_id: string;
  created_at: string;
};

export type PlayerStats = {
  id: string;
  community_id: string;
  user_id: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
};

export type Challenge = {
  id: string;
  community_id: string;
  challenger_id: string;
  challenged_id: string;
  status: ChallengeStatus;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
};

export type Result = {
  id: string;
  challenge_id: string;
  community_id: string;
  winner_id: string;
  loser_id: string;
  submitted_by: string;
  winner_elo_before: number;
  loser_elo_before: number;
  winner_elo_after: number;
  loser_elo_after: number;
  winner_score: number | null;
  loser_score: number | null;
  game_to: number | null;
  margin_multiplier: number | null;
  repeat_match_multiplier: number;
  created_at: string;
};

export type ResultReport = {
  id: string;
  challenge_id: string;
  community_id: string;
  submitted_by: string;
  winner_id: string;
  loser_id: string;
  winner_score: number;
  loser_score: number;
  game_to: number;
  status: ResultReportStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  disputed_by: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackSubmission = {
  id: string;
  user_id: string | null;
  community_id: string | null;
  type: FeedbackType;
  screen: string | null;
  message: string;
  screenshot_url: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LeaderboardEntry = PlayerStats & {
  rank: number;
  profile: Pick<Profile, "id" | "display_name" | "avatar_url" | "bio">;
};

export type ChallengeWithPlayers = Challenge & {
  challenger: Pick<Profile, "id" | "display_name" | "avatar_url">;
  challenged: Pick<Profile, "id" | "display_name" | "avatar_url">;
  result_report?: ResultReport | null;
};

export type ResultWithPlayers = Result & {
  winner: Pick<Profile, "id" | "display_name" | "avatar_url">;
  loser: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type ResultReportWithPlayers = ResultReport & {
  winner: Pick<Profile, "id" | "display_name" | "avatar_url">;
  loser: Pick<Profile, "id" | "display_name" | "avatar_url">;
  submitter: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type HeadToHeadStats = {
  wins: number;
  losses: number;
  totalGames: number;
  winPercentage: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "email" | "display_name">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      communities: {
        Row: Community;
        Insert: Omit<Community, "id" | "created_at" | "archived_at" | "archived_by" | "join_policy"> & {
          id?: string;
          created_at?: string;
          join_policy?: CommunityJoinPolicy;
          archived_at?: string | null;
          archived_by?: string | null;
        };
        Update: Partial<Community>;
        Relationships: [];
      };
      community_memberships: {
        Row: Membership;
        Insert: Omit<Membership, "id" | "joined_at" | "reviewed_by" | "reviewed_at" | "status_reason"> & {
          id?: string;
          joined_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          status_reason?: string | null;
        };
        Update: Partial<Membership>;
        Relationships: [];
      };
      app_admins: {
        Row: AppAdmin;
        Insert: AppAdmin;
        Update: Partial<AppAdmin>;
        Relationships: [];
      };
      community_player_stats: {
        Row: PlayerStats;
        Insert: Omit<PlayerStats, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PlayerStats>;
        Relationships: [];
      };
      challenges: {
        Row: Challenge;
        Insert: Omit<Challenge, "id" | "created_at" | "accepted_at" | "completed_at"> & {
          id?: string;
          created_at?: string;
          accepted_at?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Challenge>;
        Relationships: [];
      };
      results: {
        Row: Result;
        Insert: Omit<Result, "id" | "created_at" | "winner_score" | "loser_score" | "game_to" | "margin_multiplier" | "repeat_match_multiplier"> & {
          id?: string;
          created_at?: string;
          winner_score?: number | null;
          loser_score?: number | null;
          game_to?: number | null;
          margin_multiplier?: number | null;
          repeat_match_multiplier?: number;
        };
        Update: Partial<Result>;
        Relationships: [];
      };
      result_reports: {
        Row: ResultReport;
        Insert: Omit<ResultReport, "id" | "created_at" | "updated_at" | "status" | "confirmed_by" | "confirmed_at" | "disputed_by" | "disputed_at" | "dispute_reason"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: ResultReportStatus;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          disputed_by?: string | null;
          disputed_at?: string | null;
          dispute_reason?: string | null;
        };
        Update: Partial<ResultReport>;
        Relationships: [];
      };
      feedback_submissions: {
        Row: FeedbackSubmission;
        Insert: Omit<FeedbackSubmission, "id" | "created_at" | "metadata"> & {
          id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<FeedbackSubmission>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_community: {
        Args: { target_community_id: string };
        Returns: Membership;
      };
      submit_result_report: {
        Args: {
          target_challenge_id: string;
          winner_profile_id: string;
          winner_score_input: number;
          loser_score_input: number;
          game_to_input: number;
        };
        Returns: ResultReport;
      };
      confirm_result_report: {
        Args: { target_report_id: string };
        Returns: Result;
      };
      dispute_result_report: {
        Args: { target_report_id: string; reason?: string | null };
        Returns: ResultReport;
      };
      review_community_membership: {
        Args: { target_membership_id: string; next_status: MembershipStatus; reason?: string | null };
        Returns: Membership;
      };
      set_community_membership_role: {
        Args: { target_membership_id: string; next_role: MembershipRole };
        Returns: Membership;
      };
      archive_community: {
        Args: { target_community_id: string };
        Returns: Community;
      };
      unarchive_community: {
        Args: { target_community_id: string };
        Returns: Community;
      };
      admin_update_player_stats: {
        Args: {
          target_community_id: string;
          target_user_id: string;
          new_elo_rating: number;
          new_wins: number;
          new_losses: number;
        };
        Returns: PlayerStats;
      };
      is_app_admin: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      is_community_admin: {
        Args: { target_community_id: string; target_user_id: string };
        Returns: boolean;
      };
      calculate_margin_multiplier: {
        Args: { winner_score_input: number; loser_score_input: number; game_to_input: number };
        Returns: number;
      };
      calculate_repeat_match_multiplier: {
        Args: { target_community_id: string; player_a: string; player_b: string; target_time?: string };
        Returns: number;
      };
    };
    Enums: {
      community_type: CommunityType;
      community_visibility: CommunityVisibility;
      community_join_policy: CommunityJoinPolicy;
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      challenge_status: ChallengeStatus;
      result_report_status: ResultReportStatus;
      feedback_type: FeedbackType;
    };
    CompositeTypes: Record<string, never>;
  };
};
