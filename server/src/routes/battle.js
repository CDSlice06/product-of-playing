import { Router } from "express";
import db from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id, roomId: row.room_id, roomCode: row.room_code || "", matchType: row.match_type,
    status: row.status, player1UserId: row.player1_user_id, player1Name: row.player1_name,
    player2UserId: row.player2_user_id, player2Name: row.player2_name, version: row.version,
    winnerUserId: row.winner_user_id,
    state: typeof row.state === "string" ? JSON.parse(row.state) : row.state,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

router.get("/:roomId", authMiddleware, (req, res) => {
  const row = db.prepare("SELECT bs.*, cr.room_code FROM battle_sessions bs JOIN custom_rooms cr ON cr.id = bs.room_id WHERE bs.room_id = ?").get(req.params.roomId);
  if (!row) return res.status(404).json({ error: "战斗会话不存在" });
  res.json({ session: mapSession(row) });
});

router.post("/ensure", authMiddleware, (req, res) => {
  const { roomId, initialState } = req.body;
  const userId = req.userId;
  const room = db.prepare(`SELECT cr.*, p1.display_name AS owner_name, p2.display_name AS invited_name FROM custom_rooms cr JOIN profiles p1 ON p1.id = cr.owner_id LEFT JOIN profiles p2 ON p2.id = cr.invited_user_id WHERE cr.id = ?`).get(roomId);
  if (!room) return res.status(400).json({ error: "找不到联机房间" });
  if (userId !== room.owner_id && userId !== room.invited_user_id) return res.status(400).json({ error: "你不是房间参与者" });
  if (!room.invited_user_id) return res.status(400).json({ error: "房间还没有第二位玩家" });
  if (!room.owner_joined || !room.invited_joined) return res.status(400).json({ error: "双方尚未同时进入等待" });
  if (room.status !== "playing") return res.status(400).json({ error: "房主尚未开始对局" });

  const existing = db.prepare("SELECT * FROM battle_sessions WHERE room_id = ?").get(roomId);
  if (existing) {
    const rc = db.prepare("SELECT room_code FROM custom_rooms WHERE id = ?").get(roomId);
    return res.json({ session: mapSession({ ...existing, room_code: rc?.room_code }) });
  }

  let state = initialState || {};
  state.gameMode = "pvp"; state.aiDifficulty = "medium";
  if (state.players) { state.players.player1 = state.players.player1 || {}; state.players.player1.name = room.owner_name; state.players.player2 = state.players.player2 || {}; state.players.player2.name = room.invited_name || "玩家2"; }

  const id = uuidv4();
  db.prepare(`INSERT INTO battle_sessions (id, room_id, match_type, status, player1_user_id, player1_name, player2_user_id, player2_name, state, version) VALUES (?, ?, ?, 'playing', ?, ?, ?, ?, ?, 1)`)
    .run(id, roomId, room.ranked_enabled ? "ranked" : "custom", room.owner_id, room.owner_name, room.invited_user_id, room.invited_name || "玩家2", JSON.stringify(state));
  const row = db.prepare("SELECT * FROM battle_sessions WHERE id = ?").get(id);
  res.json({ session: mapSession({ ...row, room_code: room.room_code }) });
});

router.patch("/:id/state", authMiddleware, (req, res) => {
  const { state, status, winnerUserId } = req.body;
  const session = db.prepare("SELECT * FROM battle_sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "会话不存在" });
  const result = db.prepare(`UPDATE battle_sessions SET state = ?, status = ?, winner_user_id = ?, version = version + 1, updated_at = datetime('now') WHERE id = ? AND version = ?`)
    .run(state ? JSON.stringify(state) : session.state, status || session.status, winnerUserId !== undefined ? winnerUserId : session.winner_user_id, req.params.id, session.version);
  if (result.changes === 0) return res.status(409).json({ error: "版本冲突，请刷新重试" });
  const updated = db.prepare("SELECT * FROM battle_sessions WHERE id = ?").get(req.params.id);
  const rc = db.prepare("SELECT room_code FROM custom_rooms WHERE id = ?").get(updated.room_id);
  res.json({ session: mapSession({ ...updated, room_code: rc?.room_code }) });
});

export default router;