import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import db from "./db/pool.js";
import { verifyToken } from "./services/auth.js";

import authRoutes from "./routes/auth.js";
import roomsRoutes from "./routes/rooms.js";
import rankedRoutes from "./routes/ranked.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import friendsRoutes from "./routes/friends.js";
import battleRoutes from "./routes/battle.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH"] },
});

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/ranked", rankedRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/battle", battleRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const roomSubscriptions = new Map();
const battleSubscriptions = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("认证失败"));
  const payload = verifyToken(token);
  if (!payload) return next(new Error("认证失败"));
  socket.userId = payload.userId;
  next();
});

io.on("connection", (socket) => {
  console.log(`用户连接: ${socket.userId}`);

  socket.on("subscribe:room", (roomId) => {
    socket.join(`room:${roomId}`);
    if (!roomSubscriptions.has(roomId)) {
      roomSubscriptions.set(roomId, setInterval(() => {
        try {
          const row = db.prepare(`
            SELECT cr.id, cr.room_code, cr.owner_id, cr.owner_joined, cr.invited_user_id, cr.invited_joined,
              cr.status, cr.ranked_enabled, cr.created_at,
              p1.display_name AS owner_name, p2.display_name AS invited_name
            FROM custom_rooms cr
            JOIN profiles p1 ON p1.id = cr.owner_id
            LEFT JOIN profiles p2 ON p2.id = cr.invited_user_id
            WHERE cr.id = ?
          `).get(roomId);
          if (row) {
            io.to(`room:${roomId}`).emit("room:updated", {
              id: row.id, roomCode: row.room_code, ownerId: row.owner_id, ownerName: row.owner_name,
              ownerJoined: !!row.owner_joined, invitedUserId: row.invited_user_id, invitedUserName: row.invited_name,
              invitedJoined: !!row.invited_joined, status: row.status, rankedEnabled: !!row.ranked_enabled, createdAt: row.created_at,
            });
          }
        } catch {}
      }, 2000));
    }
  });

  socket.on("unsubscribe:room", (roomId) => {
    socket.leave(`room:${roomId}`);
  });

  socket.on("subscribe:battle", (roomId) => {
    socket.join(`battle:${roomId}`);
    if (!battleSubscriptions.has(roomId)) {
      battleSubscriptions.set(roomId, setInterval(() => {
        try {
          const row = db.prepare(
            `SELECT bs.*, cr.room_code FROM battle_sessions bs JOIN custom_rooms cr ON cr.id = bs.room_id WHERE bs.room_id = ?`
          ).get(roomId);
          if (row) {
            io.to(`battle:${roomId}`).emit("battle:updated", {
              id: row.id, roomId: row.room_id, roomCode: row.room_code, matchType: row.match_type,
              status: row.status, player1UserId: row.player1_user_id, player1Name: row.player1_name,
              player2UserId: row.player2_user_id, player2Name: row.player2_name, version: row.version,
              winnerUserId: row.winner_user_id, state: typeof row.state === "string" ? JSON.parse(row.state) : row.state,
              createdAt: row.created_at, updatedAt: row.updated_at,
            });
          }
        } catch {}
      }, 1500));
    }
  });

  socket.on("unsubscribe:battle", (roomId) => {
    socket.leave(`battle:${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`用户断开: ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`星盘大厅服务器已启动: http://localhost:${PORT}`);
});
