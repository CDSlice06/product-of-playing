// Game constants
const BOARD_SIZE = 10;
const MAX_HAND_SIZE = 4;
const TURN_DURATION_MS = 60000;

const CARD_TYPES = {
  obstacle: { name: '18号月亮', desc: '放置1个永久障碍物', target: 'cell' },
  chalice: { name: '圣杯', desc: '与敌方交换位置', target: 'instant' },
  storm: { name: '15号恶魔', desc: '打乱目标格周围6格的障碍物', target: 'cell' },
  tower: { name: '16号高塔', desc: '沿方向跳到第一个障碍物后方', target: 'direction' },
  fool: { name: '0号愚人', desc: '对方下次移动随机方向', target: 'instant' },
  swords8: { name: '宝剑八', desc: '直线连续放置3个障碍物', target: 'two_cells' },
  temperance: { name: '14号节制', desc: '随机清除对方1张手牌', target: 'instant' },
  hangedman: { name: '12号倒吊人', desc: '多数卡牌双倍效果', target: 'passive' },
  fate: { name: '10号命运', desc: '命运牌三抽一', target: 'instant' },
};

// Offset coordinates for hex grid
const EVEN_DIRS = [
  { dr: -1, dc: -1 }, { dr: -1, dc: 0 },
  { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
  { dr: 1, dc: -1 }, { dr: 1, dc: 0 }
];
const ODD_DIRS = [
  { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
  { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
  { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
];

function toKey(r, c) { return `${r},${c}`; }

function getNeighbors(r, c) {
  const dirs = (r % 2 === 0) ? EVEN_DIRS : ODD_DIRS;
  const result = [];
  for (const d of dirs) {
    const nr = r + d.dr, nc = c + d.dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
      result.push({ r: nr, c: nc });
    }
  }
  return result;
}

// SPAWN positions
const SPAWN_P1 = { r: 2, c: 4 };
const SPAWN_P2 = { r: 7, c: 5 };
