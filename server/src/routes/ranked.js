import { Router } from "express";
import db from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";
import { getRankTierName } from "../services/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.post("/join", authMiddleware, (req, res) => {
  const userId = req.userId;
  const profile = db.prepare("SELECT rating_points FROM profiles WHERE id = ?").get(userId);
  const currentRating = profile?.rating_points || 0;

  const existingRoom = db.prepare(`
    SELECT cr.id, cr.room_code, cr.owner_id, cr.invited_user_id, p.display_name AS opponent_name
    FROM custom_rooms cr
    LEFT JOIN profiles p ON p.id = CASE WHEN cr.owner_id = ? THEN cr.invited_user_id ELSE cr.owner_id END
    WHERE cr.ranked_enabled = 1 AND cr.status != 'closed'
      AND (cr.owner_id = ? OR cr.invited_user_id = ?)
    ORDER BY cr.created_at DESC LIMIT 1
  `).get(userId, userId, userId);

  if (existingRoom) {
    const queueSize = db.prepare("SELECT COUNT(*) AS cnt FROM rank_queue").get().cnt;
    return res.json({
      matched: !!existingRoom.invited_user_id,
      roomId: existingRoom.id,
      roomCode: existingRoom.room_code,
      opponentId: existingRoom.invited_user_id === userId ? existingRoom.owner_id : existingRoom.invited_user_id,
      opponentName: existingRoom.opponent_name,
      queueSize,
    });
  }

  db.prepare(
    `INSERT INTO rank_queue (id, user_id, rating_snapshot) VALUES (?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET rating_snapshot = ?, created_at = datetime('now')`
  ).run(uuidv4(), userId, currentRating, currentRating);

  const opponent = db.prepare(`
    SELECT q.user_id, p.display_name FROM rank_queue q
    JOIN profiles p ON p.id = q.user_id
    WHERE q.user_id != ?
    ORDER BY ABS(q.rating_snapshot - ?), q.created_at ASC LIMIT 1
  `).get(userId, currentRating);

  if (opponent) {
    db.prepare("DELETE FROM rank_queue WHERE user_id IN (?, ?)").run(userId, opponent.user_id);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let roomCode = "";
    for (let i = 0; i < 6; i++) roomCode += alphabet[Math.floor(Math.random() * alphabet.length)];
    const roomId = uuidv4();
    db.prepare(
      `INSERT INTO custom_rooms (id, room_code, owner_id, invited_user_id, status, ranked_enabled) VALUES (?, ?, ?, ?, 'ready', 1)`
    ).run(roomId, roomCode, userId, opponent.user_id);
    db.prepare("UPDATE profiles SET status = 'in_match', updated_at = datetime('now') WHERE id IN (?, ?)")
      .run(userId, opponent.user_id);
    const queueSize = db.prepare("SELECT COUNT(*) AS cnt FROM rank_queue").get().cnt;
    return res.json({ matched: true, roomId, roomCode, opponentId: opponent.user_id, opponentName: opponent.display_name, queueSize });
  }

  const queueSize = db.prepare("SELECT COUNT(*) AS cnt FROM rank_queue").get().cnt;
  res.json({ matched: false, roomId: null, roomCode: null, opponentId: null, opponentName: null, queueSize });
});

router.post("/leave", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM rank_queue WHERE user_id = ?").run(req.userId);
  db.prepare("UPDATE profiles SET status = 'online', updated_at = datetime('now') WHERE id = ?").run(req.userId);
  res.json({ success: true });
});

router.post("/finish", authMiddleware, (req, res) => {
  const { roomId, result } = req.body;
  if (!["win", "loss"].includes(result)) return res.status(400).json({ error: "结算结果仅支持 win 或 loss" });
  const room = db.prepare("SELECT * FROM custom_rooms WHERE id = ? AND ranked_enabled = 1").get(roomId);
  if (!room) return res.status(400).json({ error: "未找到天梯对局" });
  if (room.status === "closed") return res.status(400).json({ error: "对局已结算" });
  const historyCheck = db.prepare("SELECT id FROM match_history WHERE room_id = ? AND match_type = 'ranked'").get(roomId);
  if (historyCheck) return res.status(400).json({ error: "对局已结算" });
  const opponentId = room.owner_id === req.userId ? room.invited_user_id : room.owner_id;
  if (!opponentId) return res.status(400).json({ error: "对局尚未匹配完成" });
  const winnerId = result === "win" ? req.userId : opponentId;
  const loserId = result === "win" ? opponentId : req.userId;
  const winnerProfile = db.prepare("SELECT rating_points FROM profiles WHERE id = ?").get(winnerId);
  const loserProfile = db.prepare("SELECT rating_points FROM profiles WHERE id = ?").get(loserId);
  const newWinnerPoints = (winnerProfile?.rating_points || 0) + 3;
  const newLoserPoints = Math.max(0, (loserProfile?.rating_points || 0) - 1);
  db.prepare("UPDATE profiles SET rating_points = ?, wins = wins + 1, rank_tier = ?, status = 'online', updated_at = datetime('now') WHERE id = ?")
    .run(newWinnerPoints, getRankTierName(newWinnerPoints), winnerId);
  db.prepare("UPDATE profiles SET rating_points = ?, losses = losses + 1, rank_tier = ?, status = 'online', updated_at = datetime('now') WHERE id = ?")
    .run(newLoserPoints, getRankTierName(newLoserPoints), loserId);
  db.prepare("INSERT INTO match_history (id, winner_id, loser_id, room_id, match_type, winner_points_delta, loser_points_delta) VALUES (?, ?, ?, ?, 'ranked', 3, -1)")
    .run(uuidv4(), winnerId, loserId, roomId);
  db.prepare("UPDATE custom_rooms SET status = 'closed' WHERE id = ?").run(roomId);
  db.prepare("DELETE FROM rank_queue WHERE user_id IN (?, ?)").run(winnerId, loserId);
  res.json({ success: true, winnerId, loserId });
});

router.get("/history", authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT mh.id, mh.created_at, mh.winner_id, mh.loser_id, mh.winner_points_delta, mh.loser_points_delta, mh.match_type,
      w.display_name AS winner_name, l.display_name AS loser_name
    FROM match_history mh
    LEFT JOIN profiles w ON w.id = mh.winner_id
    LEFT JOIN profiles l ON l.id = mh.loser_id
    WHERE mh.match_type = 'ranked' AND (mh.winner_id = ? OR mh.loser_id = ?)
    ORDER BY mh.created_at DESC LIMIT 8
  `).all(req.userId, req.userId);
  res.json({
    matches: rows.map((r) => ({
      id: r.id, createdAt: r.created_at, winnerId: r.winner_id, winnerName: r.winner_name,
      loserId: r.loser_id, loserName: r.loser_name, winnerPointsDelta: r.winner_points_delta,
      loserPointsDelta: r.loser_points_delta, matchType: r.match_type,
    })),
  });
});

export default router;