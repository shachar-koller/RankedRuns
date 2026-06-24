export type CommunityType = "university" | "park" | "shul" | "gym" | "friend_group" | "other";
export type CommunityVisibility = "public" | "domain_restricted";
export type MembershipRole = "member" | "admin";
export type ChallengeStatus = "pending" | "accepted" | "declined" | "completed" | "canceled";

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
  created_by: string;
  created_at: string;
};

export type Membership = {
  id: string;
  community_id: string;
  user_id: string;
  role: MembershipRole;
  joined_at: string;
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
  created_at: string;
};

export type LeaderboardEntry = PlayerStats & {
  rank: number;
  profile: Pick<Profile, "id" | "display_name" | "avatar_url" | "bio">;
};

export type ChallengeWithPlayers = Challenge & {
  challenger: Pick<Profile, "id" | "display_name" | "avatar_url">;
  challenged: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type ResultWithPlayers = Result & {
  winner: Pick<Profile, "id" | "display_name" | "avatar_url">;
  loser: Pick<Profile, "id" | "display_name" | "avatar_url">;
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
        Insert: Omit<Community, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Community>;
        Relationships: [];
      };
      community_memberships: {
        Row: Membership;
        Insert: Omit<Membership, "id" | "joined_at"> & { id?: string; joined_at?: string };
        Update: Partial<Membership>;
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
        Insert: Omit<Result, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Result>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_community: {
        Args: { target_community_id: string };
        Returns: void;
      };
      submit_result: {
        Args: { target_challenge_id: string; winner_profile_id: string };
        Returns: Result;
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
      is_community_admin: {
        Args: { target_community_id: string; target_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      community_type: CommunityType;
      community_visibility: CommunityVisibility;
      membership_role: MembershipRole;
      challenge_status: ChallengeStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
