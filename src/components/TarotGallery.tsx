import { FULL_TAROT_DECK } from "@/data/tarotDeck";
import type { TarotCardDefinition } from "@/data/tarotDeck";
import { getTarotCardImage } from "@/constants/assets";
import GALLERY_BG from "@/assets/tarot-gallery-bg.jpg";
import RETURN_BTN from "@/assets/gallery-return-btn-transparent.png";

interface TarotGalleryProps {
  onClose: () => void;
}

const ROMAN_NUMERALS: Record<string, string> = {
  "major-fool": "0", "major-magician": "I", "major-high-priestess": "II",
  "major-empress": "III", "major-emperor": "IV", "major-hierophant": "V",
  "major-lovers": "VI", "major-chariot": "VII", "major-strength": "VIII",
  "major-hermit": "IX", "major-wheel-of-fortune": "X", "major-justice": "XI",
  "major-hanged-man": "XII", "major-death": "XIII", "major-temperance": "XIV",
  "major-devil": "XV", "major-tower": "XVI", "major-star": "XVII",
  "major-moon": "XVIII", "major-sun": "XIX", "major-judgement": "XX",
  "major-world": "XXI",
};

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div
      className="flex items-center"
      style={{
        marginBottom: '0.5vw',
        marginTop: '0.5vw',
        gap: '0.5vw',
      }}
    >
      <div style={{ width: '0.3vw', height: '1.1vw', backgroundColor: '#f0b90b' }} />
      <span style={{ color: '#eed8a0', fontSize: '1vw', fontWeight: 'bold' }}>
        {label}
      </span>
      <span style={{ color: '#555', fontSize: '0.65vw' }}>
        ({count})
      </span>
    </div>
  );
}

function CardCell({ card }: { card: TarotCardDefinition }) {
  const badge = card.arcana === "major"
    ? ROMAN_NUMERALS[card.id] ?? card.rank
    : card.rank;

  return (
    <div
      className="group relative transition-all flex flex-col"
      style={{
        border: '0.1vw solid rgba(180,130,30,0.5)',
        background: 'rgba(8,6,20,0.55)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#f0b90b';
        e.currentTarget.style.zIndex = '5';
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(180,130,30,0.4)';
        e.currentTarget.style.zIndex = '1';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Rank badge */}
      <div
        className="absolute z-10"
        style={{
          top: '0.35vw',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.22vw 0.6vw',
          backgroundColor: 'rgba(120,90,20,0.85)',
          border: '0.08vw solid rgba(200,160,50,0.6)',
          color: '#eed8a0',
          fontSize: '1vw',
          fontWeight: 'bold',
          lineHeight: 1,
        }}
      >
        {badge}
      </div>

      {/* Card image */}
      <div className="w-full overflow-hidden" style={{ aspectRatio: '9/13' }}>
        <div
          className="bg-contain bg-center bg-no-repeat w-full h-full"
          style={{
            backgroundImage: `url(${getTarotCardImage(card)})`,
            transition: 'transform 0.3s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        />
      </div>

      {/* Card name */}
      <div
        style={{
          padding: '0.25vw 0.15vw',
          textAlign: 'center',
          backgroundColor: 'rgba(8,6,20,0.5)',
          borderTop: '0.08vw solid rgba(180,130,30,0.4)',
        }}
      >
        <span
          className="font-bold text-shadow-pixel truncate block"
          style={{ color: '#eed8a0', fontSize: '0.9vw' }}
        >
          {card.name}
        </span>
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 flex items-center justify-center"
        style={{
          transition: 'opacity 0.2s',
          backgroundColor: 'rgba(0,0,0,0.85)',
          padding: '0.5vw',
          textAlign: 'center',
        }}
      >
        <span style={{ color: 'rgba(255,220,160,0.9)', fontSize: '0.75vw', lineHeight: '1.4' }}>
          {card.upright?.slice(0, 80) ?? card.keywords?.slice(0, 5).join("，") ?? ""}
        </span>
      </div>
    </div>
  );
}

export default function TarotGallery({ onClose }: TarotGalleryProps) {
  const allCards = [...FULL_TAROT_DECK];

  // Split into major and minor at known boundaries
  // FULL_TAROT_DECK order: 22 major, then 14 wands, 14 cups, 14 swords, 14 pentacles
  const majorArcana = allCards.slice(0, 22);
  const wands = allCards.slice(22, 36);
  const cups = allCards.slice(36, 50);
  const swords = allCards.slice(50, 64);
  const pentacles = allCards.slice(64, 78);

  const sections: { label: string; cards: TarotCardDefinition[] }[] = [
    { label: "大阿尔卡那", cards: majorArcana },
    { label: "权杖", cards: wands },
    { label: "圣杯", cards: cups },
    { label: "宝剑", cards: swords },
    { label: "星币", cards: pentacles },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        paddingTop: '0.1vw',
        backgroundImage: `url(${GALLERY_BG})`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#050510',
      }}
    >
      {/* Title bar - fixed at top */}
      <div
        className="flex items-center justify-end shrink-0"
        style={{ marginBottom: '0.3vw', padding: '0 2vw' }}
      >
        <img
          src={RETURN_BTN}
          alt="返回"
          onClick={onClose}
          className="cursor-pointer"
          style={{
            width: '14vw',
            height: 'auto',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        />
      </div>

      {/* Scrollable content - within frame */}
      <div
        className="flex-1 overflow-y-auto pixel-scrollbar"
        style={{
          padding: '0 5vw 3vw 5vw',
          margin: '0 6vw 6vw 6vw',
        }}
      >
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: '1vw' }}>
            <SectionHeader label={section.label} count={section.cards.length} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(12vw, 1fr))',
                gap: '0.6vw',
              }}
            >
              {section.cards.map((card) => (
                <CardCell key={card.id} card={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}