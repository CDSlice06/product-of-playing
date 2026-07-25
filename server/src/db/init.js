import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "arcane_duel.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  rating_points INTEGER NOT NULL DEFAULT 0,
  rank_tier TEXT NOT NULL DEFAULT '知灵',
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'online',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS custom_rooms (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_joined INTEGER NOT NULL DEFAULT 0,
  invited_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  invited_joined INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  ranked_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rank_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  rating_snapshot INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_history (
  id TEXT PRIMARY KEY,
  winner_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  loser_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  room_id TEXT REFERENCES custom_rooms(id) ON DELETE SET NULL,
  match_type TEXT NOT NULL,
  winner_points_delta INTEGER NOT NULL DEFAULT 0,
  loser_points_delta INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS battle_sessions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL UNIQUE REFERENCES custom_rooms(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'playing',
  player1_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player1_name TEXT NOT NULL,
  player2_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  winner_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (player1_user_id <> player2_user_id)
);
`);

console.log("SQLite 数据库初始化完成！路径:", DB_PATH);
db.close();
