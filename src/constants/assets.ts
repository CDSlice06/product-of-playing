import ASTROLOGER_SPRITE from "../assets/astrologer.png";
import OCCULTIST_SPRITE from "../assets/occultist.png";
import THORN_SPRITE from "../assets/thorn.png";

export const generateImageUrl = (prompt: string, size: string = "landscape_16_9") => {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;
};

export const ASSETS = {
  PLAYER_1_IDLE: ASTROLOGER_SPRITE,
  PLAYER_2_IDLE: OCCULTIST_SPRITE,

  LOBBY_BG: generateImageUrl("2D pixel art background, dark epic fantasy tarot theme, floating stone island, glowing purple and blue lightning, dark stormy sky, gothic castle entrance, masterpiece", "landscape_16_9"),
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
