import { Router } from "express";
import db from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/", authMiddleware, (_req, res) => {
  const rows = db.prepare(
    "SELECT id, username, display_name, rating_points, rank_tier, wins, losses FROM profiles ORDER BY rating_points DESC, wins DESC LIMIT 50"
  ).all();
  res.json({
    leaderboard: rows.map((r) => ({
      userId: r.id, username: r.username, displayName: r.display_name,
      ratingPoints: r.rating_points, rankTier: r.rank_tier, wins: r.wins, losses: r.losses,
    })),
  });
});

export default router;