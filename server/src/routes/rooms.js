import { Router } from "express";
import db from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

function mapRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomCode: row.room_code,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerJoined: !!row.owner_joined,
    invitedUserId: row.invited_user_id,
    invitedUserName: row.invited_name,
    invitedJoined: !!row.invited_joined,
    status: row.status,
    rankedEnabled: !!row.ranked_enabled,
    createdAt: row.created_at,
  };
}

const ROOM_QUERY = `
  SELECT cr.id, cr.room_code, cr.owner_id, cr.owner_joined,
    cr.invited_user_id, cr.invited_joined, cr.status,
    cr.ranked_enabled, cr.created_at,
    p1.display_name AS owner_name,
    p2.display_name AS invited_name
  FROM custom_rooms cr
  JOIN profiles p1 ON p1.id = cr.owner_id
  LEFT JOIN profiles p2 ON p2.id = cr.invited_user_id
`;

router.get("/", authMiddleware, (req, res) => {
  const rows = db.prepare(
    `${ROOM_QUERY} WHERE (cr.owner_id = ? OR cr.invited_user_id = ?) AND cr.status != 'closed' ORDER BY cr.created_at DESC`
  ).all(req.userId, req.userId);
  res.json({ rooms: rows.map(mapRoom) });
});

router.get("/:id", authMiddleware, (req, res) => {
  const row = db.prepare(`${ROOM_QUERY} WHERE cr.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "房间不存在" });
  res.json({ room: mapRoom(row) });
});

router.post("/", authMiddleware, (req, res) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let roomCode = "";
  for (let i = 0; i < 6; i++) roomCode += alphabet[Math.floor(Math.random() * alphabet.length)];

  const id = uuidv4();
  db.prepare(
    `INSERT INTO custom_rooms (id, room_code, owner_id, owner_joined, status, ranked_enabled) VALUES (?, ?, ?, 1, 'waiting', 0)`
  ).run(id, roomCode, req.userId);

  const row = db.prepare(`${ROOM_QUERY} WHERE cr.id = ?`).get(id);
  res.json({ room: mapRoom(row) });
});

router.post("/join-by-code", authMiddleware, (req, res) => {
  const code = (req.body.roomCode || "").toUpperCase().trim();
  if (!code) return res.status(400).json({ error: "房间码不能为空" });

  const room = db.prepare("SELECT * FROM custom_rooms WHERE room_code = ?").get(code);
  if (!room) return res.status(400).json({ error: "找不到这个房间码" });
  if (room.status === "closed") return res.status(400).json({ error: "房间已关闭" });
  if (room.status === "playing" && room.invited_user_id !== req.userId && room.owner_id !== req.userId) {
    return res.status(400).json({ error: "房间正在对局中" });
  }
  if (room.owner_id !== req.userId && room.invited_user_id && room.invited_user_id !== req.userId) {
    return res.status(400).json({ error: "房间已有其他玩家" });
  }

  if (room.owner_id !== req.userId) {
    db.prepare("UPDATE custom_rooms SET invited_user_id = ?, invited_joined = 0, status = 'waiting' WHERE id = ?")
      .run(req.userId, room.id);
  } else {
    db.prepare("UPDATE custom_rooms SET owner_joined = 1 WHERE id = ?").run(room.id);
  }

  const row = db.prepare(`${ROOM_QUERY} WHERE cr.id = ?`).get(room.id);
  res.json({ room: mapRoom(row) });
});

router.post("/:id/enter-waiting", authMiddleware, (req, res) => {
  const roomId = req.params.id;
  const userId = req.userId;

  const room = db.prepare("SELECT * FROM custom_rooms WHERE id = ?").get(roomId);
  if (!room) return res.status(404).json({ error: "房间不存在" });
  if (room.owner_id !== userId && room.invited_user_id !== userId) {
    return res.status(400).json({ error: "你不是房间成员" });
  }

  const ownerJoined = room.owner_id === userId ? 1 : room.owner_joined;
  const invitedJoined = room.invited_user_id === userId ? 1 : room.invited_joined;
  let status = room.status;
  if (status !== "closed" && status !== "playing") {
    status = (room.invited_user_id && ownerJoined && invitedJoined) ? "ready" : "waiting";
  }

  db.prepare("UPDATE custom_rooms SET owner_joined = ?, invited_joined = ?, status = ? WHERE id = ?")
    .run(ownerJoined, invitedJoined, status, roomId);

  const row = db.prepare(`${ROOM_QUERY} WHERE cr.id = ?`).get(roomId);
  res.json({ room: mapRoom(row) });
});

router.post("/:id/start", authMiddleware, (req, res) => {
  const result = db.prepare(
    "UPDATE custom_rooms SET status = 'playing' WHERE id = ? AND owner_id = ? AND status = 'ready'"
  ).run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(400).json({ error: "无法开始对局" });
  res.json({ success: true });
});

router.post("/:id/close", authMiddleware, (req, res) => {
  db.prepare("UPDATE custom_rooms SET status = 'closed' WHERE id = ? AND owner_id = ?")
    .run(req.params.id, req.userId);
  res.json({ success: true });
});

export default router;
