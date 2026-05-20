import ASTROLOGER_SPRITE from "../assets/astrologer.png";
import OCCULTIST_SPRITE from "../assets/occultist.png";
import THORN_SPRITE from "../assets/thorn.png";
import type { TarotCardDefinition } from "@/data/tarotDeck";

export const generateImageUrl = (prompt: string, size: string = "landscape_16_9") => {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;
};

export const ASSETS = {
  PLAYER_1_IDLE: ASTROLOGER_SPRITE,
  PLAYER_2_IDLE: OCCULTIST_SPRITE,

  LOBBY_BG: generateImageUrl("2D pixel art background, dark epic fantasy tarot theme, floating stone island, glowing purple and blue lightning, dark stormy sky, gothic castle entrance, masterpiece", "landscape_16_9"),
  DIVINATION_HERO: generateImageUrl("beautiful tarot divination altar, velvet table, glowing tarot cards spread in a fan, warm candlelight, celestial symbols, dreamy mystical atmosphere, elegant fantasy illustration for website hero banner", "landscape_16_9"),
  BATTLE_BG: generateImageUrl("2D pixel art background, dark epic fantasy tarot theme, floating chessboard in the void, glowing purple and blue lightning, mystical chains, dark stormy sky, masterpiece", "landscape_16_9"),
  FLOOR_TILE: generateImageUrl("2D pixel art, top-down hexagonal dungeon floor tile, dark gothic stone with faint glowing golden and purple runes, seamless texture", "square"),
  OBSTACLE_TILE: THORN_SPRITE,

  VFX_STORM: generateImageUrl("2D pixel art game effect, purple lightning storm magical effect, dark fantasy style, dark background", "square"),
  VFX_HEAL: generateImageUrl("2D pixel art game effect, golden glowing magic effect, dark fantasy style, dark background", "square"),

  UI_PANEL: generateImageUrl("2D pixel art UI panel background, dark gothic stone texture with intricate golden tarot borders, glowing purple accents, dark fantasy style", "landscape_16_9"),

  CARD_BACK: generateImageUrl("2D pixel art, tarot card back design, intricate dark gold and purple mystical wheel of fortune pattern, starry night background", "portrait_3_4"),
  CARD_MOON: generateImageUrl("2D pixel art, mysterious glowing blue moon shining over dark thorny vines and stone walls, creating a barricade, dark fantasy style, masterpiece", "portrait_3_4"),
  CARD_CHALICE: generateImageUrl("2D pixel art, glowing magical golden chalice reflecting two mirrored portals, symbolizing teleportation and exchange, dark fantasy style, masterpiece", "portrait_3_4"),
  CARD_DEVIL: generateImageUrl("2D pixel art, dark demonic figure with glowing red eyes pulling puppet strings over swirling chaotic rocks, dark fantasy style, masterpiece", "portrait_3_4"),
  CARD_TOWER: generateImageUrl("2D pixel art, towering gothic stone structure struck by violent purple lightning, shattering the walls, dark fantasy style, masterpiece", "portrait_3_4"),
  CARD_FOOL: generateImageUrl("2D pixel art, a carefree traveler stepping off a cliff edge into a glowing magical vortex, symbolizing chaos and random movement, dark fantasy style, masterpiece", "portrait_3_4"),
  CARD_SWORDS8: generateImageUrl("2D pixel art, eight glowing blue swords thrust into the ground forming a straight impenetrable cage, dark fantasy style, masterpiece", "portrait_3_4"),
  CARD_TEMPERANCE: generateImageUrl("2D pixel art, mystical angel pouring glowing liquid between two cups, dissolving dark energy into light, symbolizing purification and discard, dark fantasy style, masterpiece", "portrait_3_4"),
  CARD_HANGEDMAN: generateImageUrl("2D pixel art, a figure suspended upside down from a glowing magical tree branch, radiating immense stored potential energy, dark fantasy style, masterpiece", "portrait_3_4"),
  CARD_FATE: generateImageUrl("2D pixel art, an intricate glowing golden wheel of fortune spinning in the dark cosmos, surrounded by celestial runes, dark fantasy style, masterpiece", "portrait_3_4"),
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

function getTarotPalette(card: TarotCardDefinition) {
  switch (card.arcana) {
    case "major":
      return {
        top: "#7c5cff",
        bottom: "#33205f",
        accent: "#ffe6a7",
        ink: "#fff8ec",
      };
    case "wands":
      return {
        top: "#ffb36a",
        bottom: "#8d4f24",
        accent: "#ffe0b8",
        ink: "#fff8f0",
      };
    case "cups":
      return {
        top: "#73c4ff",
        bottom: "#245b8d",
        accent: "#dff3ff",
        ink: "#f4fbff",
      };
    case "swords":
      return {
        top: "#b8c5d6",
        bottom: "#536170",
        accent: "#eef4fb",
        ink: "#ffffff",
      };
    case "pentacles":
      return {
        top: "#82c596",
        bottom: "#2f6a43",
        accent: "#dff7e6",
        ink: "#f6fff8",
      };
  }
}

function getTarotSymbol(card: TarotCardDefinition) {
  if (card.arcana === "major") {
    const symbolMap: Record<string, string> = {
      "major-fool": "0",
      "major-magician": "I",
      "major-high-priestess": "II",
      "major-empress": "III",
      "major-emperor": "IV",
      "major-hierophant": "V",
      "major-lovers": "VI",
      "major-chariot": "VII",
      "major-strength": "VIII",
      "major-hermit": "IX",
      "major-wheel-of-fortune": "X",
      "major-justice": "XI",
      "major-hanged-man": "XII",
      "major-death": "XIII",
      "major-temperance": "XIV",
      "major-devil": "XV",
      "major-tower": "XVI",
      "major-star": "XVII",
      "major-moon": "XVIII",
      "major-sun": "XIX",
      "major-judgement": "XX",
      "major-world": "XXI",
    };

    return symbolMap[card.id] ?? "✦";
  }

  switch (card.arcana) {
    case "wands":
      return "W";
    case "cups":
      return "C";
    case "swords":
      return "S";
    case "pentacles":
      return "P";
    default:
      return "✦";
  }
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTarotInlineSvg(card: TarotCardDefinition) {
  const palette = getTarotPalette(card);
  const symbol = getTarotSymbol(card);
  const topLabel = escapeSvgText(card.arcana === "major" ? "MAJOR ARCANA" : card.suitLabel.toUpperCase());
  const title = escapeSvgText(card.englishName);
  const subtitle = escapeSvgText(card.name);
  const keyword = escapeSvgText(card.keywords.slice(0, 2).join(" · "));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 520">
      <defs>
        <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.top}" />
          <stop offset="100%" stop-color="${palette.bottom}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="38%" r="52%">
          <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="520" rx="28" fill="#f7ecd7" />
      <rect x="10" y="10" width="340" height="500" rx="24" fill="url(#bg)" />
      <rect x="24" y="24" width="312" height="472" rx="18" fill="none" stroke="${palette.accent}" stroke-width="3" opacity="0.9" />
      <rect x="38" y="38" width="284" height="444" rx="14" fill="none" stroke="${palette.accent}" stroke-width="1.5" opacity="0.55" stroke-dasharray="8 8" />
      <circle cx="180" cy="198" r="116" fill="url(#glow)" opacity="0.95" />
      <circle cx="180" cy="198" r="84" fill="none" stroke="${palette.accent}" stroke-width="4" opacity="0.95" />
      <circle cx="180" cy="198" r="56" fill="none" stroke="${palette.accent}" stroke-width="2" opacity="0.65" />
      <text x="180" y="84" text-anchor="middle" font-size="22" letter-spacing="3" fill="${palette.ink}" font-family="Georgia, serif">${topLabel}</text>
      <text x="180" y="217" text-anchor="middle" font-size="64" font-weight="700" fill="${palette.ink}" font-family="Georgia, serif">${escapeSvgText(symbol)}</text>
      <text x="180" y="348" text-anchor="middle" font-size="26" font-weight="700" fill="${palette.ink}" font-family="Georgia, serif">${title}</text>
      <text x="180" y="382" text-anchor="middle" font-size="20" fill="${palette.accent}" font-family="Arial, sans-serif">${subtitle}</text>
      <text x="180" y="430" text-anchor="middle" font-size="18" fill="${palette.ink}" font-family="Arial, sans-serif">${keyword}</text>
      <circle cx="70" cy="70" r="5" fill="${palette.accent}" />
      <circle cx="290" cy="70" r="5" fill="${palette.accent}" />
      <circle cx="70" cy="450" r="5" fill="${palette.accent}" />
      <circle cx="290" cy="450" r="5" fill="${palette.accent}" />
    </svg>
  `.trim();
}

export function getTarotCardImage(card: TarotCardDefinition) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildTarotInlineSvg(card))}`;
}
