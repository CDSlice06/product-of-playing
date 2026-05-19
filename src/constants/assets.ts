import ASTROLOGER_SPRITE from "../assets/astrologer.png";
import OCCULTIST_SPRITE from "../assets/occultist.png";
import THORN_SPRITE from "../assets/thorn.png";

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

function createBackdropSvg(label: string, accent: string, accentSoft: string) {
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="55%" stop-color="#111827" />
          <stop offset="100%" stop-color="#030712" />
        </linearGradient>
        <radialGradient id="glowA" cx="50%" cy="12%" r="50%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.52" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowB" cx="82%" cy="18%" r="26%">
          <stop offset="0%" stop-color="${accentSoft}" stop-opacity="0.45" />
          <stop offset="100%" stop-color="${accentSoft}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)" />
      <rect width="1600" height="900" fill="url(#glowA)" />
      <rect width="1600" height="900" fill="url(#glowB)" />
      <g opacity="0.22" stroke="${accentSoft}" stroke-width="3" fill="none">
        <path d="M140 640 C380 420 650 790 940 540 S1330 330 1490 460" />
        <path d="M160 720 C470 520 830 860 1170 610 S1420 430 1510 560" />
      </g>
      <g opacity="0.16" fill="${accent}">
        <circle cx="250" cy="160" r="4" />
        <circle cx="480" cy="120" r="3" />
        <circle cx="820" cy="150" r="5" />
        <circle cx="1190" cy="110" r="3" />
        <circle cx="1370" cy="180" r="4" />
      </g>
      <g fill="#0f172a" stroke="rgba(245, 208, 92, 0.32)" stroke-width="6">
        <path d="M290 660 L430 420 L560 660 Z" />
        <path d="M1060 690 L1210 410 L1350 690 Z" />
        <rect x="640" y="390" width="320" height="250" rx="28" />
      </g>
      <g opacity="0.85" fill="rgba(245, 208, 92, 0.78)">
        <circle cx="690" cy="460" r="6" />
        <circle cx="910" cy="460" r="6" />
        <circle cx="800" cy="520" r="8" />
      </g>
      <text x="800" y="792" text-anchor="middle" fill="rgba(255,255,255,0.82)" font-size="68" font-family="Verdana, Arial, sans-serif" letter-spacing="12">${label}</text>
    </svg>
  `);
}

function createFloorTileSvg() {
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" fill="url(#tile)" />
      <g stroke="#f59e0b" stroke-opacity="0.28" stroke-width="3" fill="none">
        <path d="M64 12 L105 34 L105 78 L64 102 L23 78 L23 34 Z" />
        <path d="M64 28 L90 42 L90 70 L64 86 L38 70 L38 42 Z" />
      </g>
      <g stroke="#38bdf8" stroke-opacity="0.18" stroke-width="2">
        <path d="M26 92 L50 68" />
        <path d="M76 62 L100 38" />
        <path d="M40 28 L88 28" />
      </g>
    </svg>
  `);
}

function createPanelSvg() {
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" rx="32" fill="url(#panel)" />
      <rect x="20" y="20" width="1160" height="760" rx="24" fill="none" stroke="#f59e0b" stroke-opacity="0.38" stroke-width="8" />
      <rect x="44" y="44" width="1112" height="712" rx="20" fill="none" stroke="#38bdf8" stroke-opacity="0.18" stroke-width="4" />
      <g fill="rgba(245, 208, 92, 0.15)">
        <circle cx="110" cy="110" r="12" />
        <circle cx="1090" cy="110" r="12" />
        <circle cx="110" cy="690" r="12" />
        <circle cx="1090" cy="690" r="12" />
      </g>
    </svg>
  `);
}

function createCardSvg(title: string, subtitle: string, accent: string) {
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 540">
      <defs>
        <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#09090b" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="22%" r="58%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.65" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="540" rx="30" fill="url(#card)" />
      <rect width="360" height="540" rx="30" fill="url(#glow)" />
      <rect x="16" y="16" width="328" height="508" rx="22" fill="none" stroke="#f5d05c" stroke-width="6" stroke-opacity="0.8" />
      <rect x="34" y="34" width="292" height="472" rx="18" fill="none" stroke="${accent}" stroke-width="3" stroke-opacity="0.65" />
      <circle cx="180" cy="208" r="90" fill="${accent}" fill-opacity="0.12" />
      <path d="M180 110 L236 146 L236 236 L180 272 L124 236 L124 146 Z" fill="none" stroke="${accent}" stroke-width="6" stroke-opacity="0.9" />
      <path d="M180 134 L216 158 L216 224 L180 248 L144 224 L144 158 Z" fill="none" stroke="#f5d05c" stroke-width="4" stroke-opacity="0.75" />
      <text x="180" y="84" text-anchor="middle" fill="#f8fafc" font-size="34" font-family="Verdana, Arial, sans-serif" font-weight="bold" letter-spacing="4">${title}</text>
      <text x="180" y="366" text-anchor="middle" fill="#e2e8f0" font-size="22" font-family="Verdana, Arial, sans-serif" letter-spacing="2">${subtitle}</text>
      <text x="180" y="454" text-anchor="middle" fill="${accent}" font-size="92" font-family="Verdana, Arial, sans-serif" font-weight="bold">${title.slice(0, 1)}</text>
    </svg>
  `);
}

function createEffectSvg(accent: string) {
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="48" fill="#0f172a" />
      <circle cx="128" cy="128" r="74" fill="${accent}" fill-opacity="0.16" />
      <path d="M132 34 L88 134 H126 L108 222 L176 114 H136 L164 34 Z" fill="${accent}" />
    </svg>
  `);
}

export const ASSETS = {
  PLAYER_1_IDLE: ASTROLOGER_SPRITE,
  PLAYER_2_IDLE: OCCULTIST_SPRITE,

  LOBBY_BG: createBackdropSvg("ASTRAL LOBBY", "#a855f7", "#38bdf8"),
  BATTLE_BG: createBackdropSvg("TAROT BATTLE", "#f59e0b", "#8b5cf6"),
  FLOOR_TILE: createFloorTileSvg(),
  OBSTACLE_TILE: THORN_SPRITE,

  VFX_STORM: createEffectSvg("#8b5cf6"),
  VFX_HEAL: createEffectSvg("#f59e0b"),

  UI_PANEL: createPanelSvg(),

  CARD_BACK: createCardSvg("BACK", "FATE", "#8b5cf6"),
  CARD_MOON: createCardSvg("MOON", "Barrier", "#38bdf8"),
  CARD_CHALICE: createCardSvg("CHALICE", "Swap", "#f59e0b"),
  CARD_DEVIL: createCardSvg("DEVIL", "Storm", "#ef4444"),
  CARD_TOWER: createCardSvg("TOWER", "Rift", "#a855f7"),
  CARD_FOOL: createCardSvg("FOOL", "Chaos", "#22c55e"),
  CARD_SWORDS8: createCardSvg("SWORDS", "Lock", "#3b82f6"),
  CARD_TEMPERANCE: createCardSvg("TEMPER", "Balance", "#14b8a6"),
  CARD_HANGEDMAN: createCardSvg("HANGED", "Repeat", "#f97316"),
  CARD_FATE: createCardSvg("FATE", "Judgement", "#eab308"),
};

export const getCardImage = (cardName: string) => {
  switch (cardName) {
    case "obstacle": return ASSETS.CARD_MOON;
    case "chalice": return ASSETS.CARD_CHALICE;
    case "storm": return ASSETS.CARD_DEVIL;
    case "tower": return ASSETS.CARD_TOWER;
    case "fool": return ASSETS.CARD_FOOL;
    case "swords8": return ASSETS.CARD_SWORDS8;
    case "temperance": return ASSETS.CARD_TEMPERANCE;
    case "hangedman": return ASSETS.CARD_HANGEDMAN;
    case "fate": return ASSETS.CARD_FATE;
    default: return ASSETS.CARD_BACK;
  }
};
