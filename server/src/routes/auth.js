import { Router } from "express";
import { signUp, signIn, fetchProfile } from "../services/auth.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await signUp(username, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await signIn(username, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const profile = await fetchProfile(req.userId);
    if (!profile) return res.status(404).json({ error: "用户不存在" });
    res.json({ user: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/profile/:id", authMiddleware, async (req, res) => {
  try {
    const profile = await fetchProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: "用户不存在" });
    res.json({ user: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;