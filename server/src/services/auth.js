import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/pool.js";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "arcane-duel-jwt-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function getRankTierName(points) {
  const p = Math.max(points || 0, 0);
  if (p >= 1200) return "元卜";
  if (p >= 920) return "星衡";
  if (p >= 700) return "冥枢";
  if (p >= 530) return "御卜";
  if (p >= 390) return "渡尘";
  if (p >= 280) return "溯缘";
  if (p >= 190) return "窥命";
  if (p >= 120) return "观爻";
  if (p >= 70) return "通绪";
  if (p >= 30) return "知影";
  return "知灵";
}

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    ratingPoints: row.rating_points ?? 0,
    rankTier: row.rank_tier ?? getRankTierName(0),
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    isGuest: false,
    createdAt: row.created_at,
  };
}

export function signUp(username, password) {
  const trimmed = username.trim();
  if (!trimmed || trimmed.length < 2) throw new Error("用户名至少2个字符");
  if (!password || password.length < 4) throw new Error("密码至少4个字符");

  const existing = db.prepare("SELECT id FROM profiles WHERE username = ?").get(trimmed);
  if (existing) throw new Error("用户名已被占用");

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const rankTier = getRankTierName(0);

  db.prepare(
    `INSERT INTO profiles (id, username, display_name, password_hash, rank_tier) VALUES (?, ?, ?, ?, ?)`
  ).run(id, trimmed, trimmed, passwordHash, rankTier);

  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const user = mapProfile(db.prepare("SELECT * FROM profiles WHERE id = ?").get(id));
  return { user, token };
}

export function signIn(username, password) {
  const trimmed = username.trim();
  const row = db.prepare("SELECT * FROM profiles WHERE username = ?").get(trimmed);
  if (!row) throw new Error("用户名或密码错误");

  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) throw new Error("用户名或密码错误");

  db.prepare("UPDATE profiles SET status = 'online', updated_at = datetime('now') WHERE id = ?").run(row.id);

  const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { user: mapProfile(row), token };
}

export function getUserById(userId) {
  return mapProfile(db.prepare("SELECT * FROM profiles WHERE id = ?").get(userId));
}

export function fetchProfile(userId) {
  return mapProfile(db.prepare("SELECT * FROM profiles WHERE id = ?").get(userId));
}

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export { getRankTierName, mapProfile };
