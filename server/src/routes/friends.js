import { Router } from "express";
import db from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/", authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT f.id, f.user_id, f.friend_id, f.created_at,
      p1.display_name AS user_name, p2.display_name AS friend_name,
      p2.rating_points AS friend_rating, p2.rank_tier AS friend_rank, p2.status AS friend_status
    FROM friends f JOIN profiles p1 ON p1.id = f.user_id JOIN profiles p2 ON p2.id = f.friend_id
    WHERE f.user_id = ? OR f.friend_id = ? ORDER BY f.created_at DESC
  `).all(req.userId, req.userId);
  res.json({ friends: rows.map((r) => ({
    id: r.id, userId: r.user_id === req.userId ? r.friend_id : r.user_id,
    username: r.user_id === req.userId ? r.friend_name : r.user_name,
    displayName: r.user_id === req.userId ? r.friend_name : r.user_name,
    ratingPoints: r.friend_rating || 0, rankTier: r.friend_rank || "", status: r.friend_status || "offline",
  })) });
});

router.get("/requests", authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
      s.display_name AS sender_name, r.display_name AS receiver_name
    FROM friend_requests fr JOIN profiles s ON s.id = fr.sender_id JOIN profiles r ON r.id = fr.receiver_id
    WHERE (fr.sender_id = ? OR fr.receiver_id = ?) AND fr.status = 'pending' ORDER BY fr.created_at DESC
  `).all(req.userId, req.userId);
  res.json({ requests: rows.map((r) => ({
    id: r.id, senderId: r.sender_id, senderName: r.sender_name,
    receiverId: r.receiver_id, receiverName: r.receiver_name, status: r.status, createdAt: r.created_at,
  })) });
});

router.post("/request", authMiddleware, (req, res) => {
  const { receiverId } = req.body;
  if (!receiverId) return res.status(400).json({ error: "缺少接收者ID" });
  if (receiverId === req.userId) return res.status(400).json({ error: "不能向自己发送好友申请" });
  const existing = db.prepare("SELECT id FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)").get(req.userId, receiverId, receiverId, req.userId);
  if (existing) return res.status(400).json({ error: "已发送过好友申请" });
  const alreadyFriend = db.prepare("SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)").get(req.userId, receiverId, receiverId, req.userId);
  if (alreadyFriend) return res.status(400).json({ error: "已经是好友" });
  db.prepare("INSERT INTO friend_requests (id, sender_id, receiver_id) VALUES (?, ?, ?)").run(uuidv4(), req.userId, receiverId);
  res.json({ success: true });
});

router.post("/request/:id/accept", authMiddleware, (req, res) => {
  const fr = db.prepare("SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'").get(req.params.id, req.userId);
  if (!fr) return res.status(400).json({ error: "好友申请不存在或已处理" });
  db.prepare("UPDATE friend_requests SET status = 'accepted' WHERE id = ?").run(fr.id);
  db.prepare("INSERT INTO friends (id, user_id, friend_id) VALUES (?, ?, ?), (?, ?, ?)").run(uuidv4(), fr.sender_id, fr.receiver_id, uuidv4(), fr.receiver_id, fr.sender_id);
  res.json({ success: true });
});

router.post("/request/:id/reject", authMiddleware, (req, res) => {
  db.prepare("UPDATE friend_requests SET status = 'rejected' WHERE id = ? AND receiver_id = ?").run(req.params.id, req.userId);
  res.json({ success: true });
});

router.post("/search", authMiddleware, (req, res) => {
  const { query: q } = req.body;
  if (!q) return res.json({ users: [] });
  const rows = db.prepare("SELECT id, username, display_name, rating_points, rank_tier, status FROM profiles WHERE username LIKE ? AND id != ? LIMIT 12").all(`%${q}%`, req.userId);
  res.json({ users: rows.map((r) => ({ id: r.id, username: r.username, displayName: r.display_name, ratingPoints: r.rating_points, rankTier: r.rank_tier, status: r.status })) });
});

export default router;