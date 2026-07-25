import { verifyToken } from "../services/auth.js";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未登录" });
  }

  const token = header.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }

  req.userId = payload.userId;
  next();
}