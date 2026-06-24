import type { ChallengeStatus, Community } from "@/lib/types";

export function formatRecord(wins: number, losses: number) {
  return `${wins}-${losses}`;
}

export function isActiveChallengeStatus(status: ChallengeStatus) {
  return status === "pending" || status === "accepted" || status === "result_pending" || status === "disputed";
}

export function getChallengeStatusLabel(status: ChallengeStatus) {
  const labels: Record<ChallengeStatus, string> = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
    completed: "Completed",
    canceled: "Canceled",
    result_pending: "Needs confirmation",
    disputed: "Disputed",
  };

  return labels[status];
}

export function formatWinPercentage(wins: number, totalGames: number) {
  if (totalGames === 0) return "-";
  return `${Math.round((wins / totalGames) * 100)}%`;
}

export function getEmailDomain(email?: string | null) {
  return email?.split("@")[1]?.toLowerCase() ?? "";
}

export function canJoinDomainRestrictedCommunity(community: Community, email?: string | null) {
  if (community.visibility === "public") return true;
  if (!community.allowed_email_domain) return false;
  return getEmailDomain(email) === community.allowed_email_domain.toLowerCase();
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function timeAgo(dateString: string) {
  const deltaMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
