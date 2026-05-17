import type { RankedThreshold } from "@/types/platform";

export const RANK_THRESHOLDS: RankedThreshold[] = [
  { key: "zhiling", name: "知灵", minPoints: 0 },
  { key: "zhiying", name: "知影", minPoints: 30 },
  { key: "tongxu", name: "通绪", minPoints: 70 },
  { key: "guanyao", name: "观爻", minPoints: 120 },
  { key: "kuiming", name: "窥命", minPoints: 190 },
  { key: "suyuan", name: "溯缘", minPoints: 280 },
  { key: "duchen", name: "渡尘", minPoints: 390 },
  { key: "yubu", name: "御卜", minPoints: 530 },
  { key: "mingshu", name: "冥枢", minPoints: 700 },
  { key: "xingheng", name: "星衡", minPoints: 920 },
  { key: "yuanbu", name: "元卜", minPoints: 1200 },
];

export const RANKED_RESULT_POINTS = {
  win: 3,
  loss: -1,
} as const;

export function getRankByPoints(points: number) {
  const safePoints = Math.max(0, points);
  return [...RANK_THRESHOLDS].reverse().find((rank) => safePoints >= rank.minPoints) ?? RANK_THRESHOLDS[0];
}
