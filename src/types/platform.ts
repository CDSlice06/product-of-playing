export type AuthView = "login" | "register";

export type PlayerAccessMode = "guest" | "authenticated";

export type LobbyMode = "ranked" | "custom" | "friends" | "leaderboard";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  ratingPoints: number;
  rankTier: string;
  wins: number;
  losses: number;
  isGuest: boolean;
  createdAt?: string;
}

export interface FriendProfile {
  id: string;
  username: string;
  displayName: string;
  ratingPoints: number;
  rankTier: string;
  status: "online" | "offline" | "in_match";
}

export interface FriendRequestRecord {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
}

export interface CustomRoomRecord {
  id: string;
  roomCode: string;
  ownerId: string;
  ownerName: string;
  invitedUserId: string | null;
  invitedUserName: string | null;
  status: "waiting" | "ready" | "playing" | "closed";
  rankedEnabled: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  ratingPoints: number;
  rankTier: string;
  wins: number;
  losses: number;
}

export interface RankedThreshold {
  key: string;
  name: string;
  minPoints: number;
}

export interface RankedQueueEntry {
  id: string;
  userId: string;
  ratingSnapshot: number;
  createdAt: string;
}

export interface RankedRoomRecord {
  id: string;
  roomCode: string;
  ownerId: string;
  ownerName: string;
  invitedUserId: string | null;
  invitedUserName: string | null;
  status: "waiting" | "ready" | "playing" | "closed";
  rankedEnabled: boolean;
  createdAt: string;
}

export interface RankedJoinResult {
  matched: boolean;
  roomId: string | null;
  roomCode: string | null;
  opponentId: string | null;
  opponentName: string | null;
  queueSize: number;
}

export interface RankedMatchRecord {
  id: string;
  createdAt: string;
  winnerId: string | null;
  winnerName: string;
  loserId: string | null;
  loserName: string;
  winnerPointsDelta: number;
  loserPointsDelta: number;
  matchType: "ranked" | "custom" | "pve" | "local";
}

export interface OnlineBattleRoomInfo {
  roomId: string;
  roomCode: string;
  ownerId: string;
  ownerName: string;
  invitedUserId: string;
  invitedUserName: string;
  rankedEnabled: boolean;
  status: "waiting" | "ready" | "playing" | "closed";
}

export interface BattleSessionRecord {
  id: string;
  roomId: string;
  roomCode: string;
  matchType: "ranked" | "custom";
  status: "waiting" | "playing" | "finished";
  player1UserId: string;
  player1Name: string;
  player2UserId: string;
  player2Name: string;
  version: number;
  winnerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}
