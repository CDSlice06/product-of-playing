// 78-card Tarot deck data for Canvas project

// Major Arcana data (essence only)
const MAJOR_ARCANA = [
  { name: '愚者', en: 'The Fool', rank: '0', keywords: ['冒险', '开始', '天真', '自由'] },
  { name: '魔术师', en: 'The Magician', rank: 'I', keywords: ['创造', '专注', '技能', '显化'] },
  { name: '女祭司', en: 'The High Priestess', rank: 'II', keywords: ['直觉', '内在', '神秘', '潜意识'] },
  { name: '女皇', en: 'The Empress', rank: 'III', keywords: ['丰盛', '孕育', '自然', '母爱'] },
  { name: '皇帝', en: 'The Emperor', rank: 'IV', keywords: ['权威', '秩序', '稳定', '掌控'] },
  { name: '教皇', en: 'The Hierophant', rank: 'V', keywords: ['传统', '教导', '信仰', '常规'] },
  { name: '恋人', en: 'The Lovers', rank: 'VI', keywords: ['选择', '联结', '和谐', '爱'] },
  { name: '战车', en: 'The Chariot', rank: 'VII', keywords: ['胜利', '意志', '前进', '控制'] },
  { name: '力量', en: 'Strength', rank: 'VIII', keywords: ['勇气', '耐心', '内在力量', '柔和'] },
  { name: '隐者', en: 'The Hermit', rank: 'IX', keywords: ['内省', '独处', '指引', '智慧'] },
  { name: '命运之轮', en: 'Wheel of Fortune', rank: 'X', keywords: ['转变', '机遇', '循环', '命运'] },
  { name: '正义', en: 'Justice', rank: 'XI', keywords: ['公平', '平衡', '因果', '决策'] },
  { name: '倒吊人', en: 'The Hanged Man', rank: 'XII', keywords: ['牺牲', '放手', '新视角', '等待'] },
  { name: '死神', en: 'Death', rank: 'XIII', keywords: ['结束', '蜕变', '放下', '新生'] },
  { name: '节制', en: 'Temperance', rank: 'XIV', keywords: ['调和', '平衡', '耐心', '融合'] },
  { name: '恶魔', en: 'The Devil', rank: 'XV', keywords: ['束缚', '欲望', '执念', '阴影'] },
  { name: '高塔', en: 'The Tower', rank: 'XVI', keywords: ['崩塌', '觉醒', '突变', '释放'] },
  { name: '星星', en: 'The Star', rank: 'XVII', keywords: ['希望', '疗愈', '灵感', '平静'] },
  { name: '月亮', en: 'The Moon', rank: 'XVIII', keywords: ['幻觉', '恐惧', '潜意识', '迷宫'] },
  { name: '太阳', en: 'The Sun', rank: 'XIX', keywords: ['喜悦', '成功', '活力', '光芒'] },
  { name: '审判', en: 'Judgement', rank: 'XX', keywords: ['觉醒', '宽恕', '重获新生', '召唤'] },
  { name: '世界', en: 'The World', rank: 'XXI', keywords: ['完成', '圆满', '旅程', '达成'] },
];

const MINOR_SUITS = [
  { id: 'wands', label: '权杖', en: 'Wands', keys: ['行动', '热情', '创造'] },
  { id: 'cups', label: '圣杯', en: 'Cups', keys: ['情感', '直觉', '联结'] },
  { id: 'swords', label: '宝剑', en: 'Swords', keys: ['思维', '决断', '沟通'] },
  { id: 'pentacles', label: '星币', en: 'Pentacles', keys: ['资源', '稳定', '现实'] },
];

const MINOR_RANKS = [
  { id: 'ace', label: '首牌', num: 'A' },
  { id: 'two', label: '二', num: '2' },
  { id: 'three', label: '三', num: '3' },
  { id: 'four', label: '四', num: '4' },
  { id: 'five', label: '五', num: '5' },
  { id: 'six', label: '六', num: '6' },
  { id: 'seven', label: '七', num: '7' },
  { id: 'eight', label: '八', num: '8' },
  { id: 'nine', label: '九', num: '9' },
  { id: 'ten', label: '十', num: '10' },
  { id: 'page', label: '侍者', num: 'P' },
  { id: 'knight', label: '骑士', num: 'K' },
  { id: 'queen', label: '皇后', num: 'Q' },
  { id: 'king', label: '国王', num: 'Kg' },
];

function buildFullDeck() {
  const deck = [];

  // Major Arcana
  for (const card of MAJOR_ARCANA) {
    deck.push({
      id: `major-${card.name}`,
      name: card.name,
      en: card.en,
      rank: card.rank,
      arcana: 'major',
      suit: '大阿尔卡那',
      keywords: card.keywords,
      upright: `${card.name}——预示着新的开始与无限可能。`,
      reversed: `逆位${card.name}——提醒你注意潜在的阻碍或延迟。`,
    });
  }

  // Minor Arcana
  for (const suit of MINOR_SUITS) {
    for (const rank of MINOR_RANKS) {
      const isPageKnightQueenKing = ['page', 'knight', 'queen', 'king'].includes(rank.id);
      deck.push({
        id: `${suit.id}-${rank.id}`,
        name: `${suit.label}${rank.label}`,
        en: `${rank.label} of ${suit.en}`,
        rank: rank.num,
        arcana: 'minor',
        suit: suit.label,
        keywords: [...suit.keys, isPageKnightQueenKing ? '人物' : '能量'],
        upright: `${suit.label}${rank.label}——在${suit.keys[0]}方面带来正向的推动。`,
        reversed: `逆位${suit.label}${rank.label}——在${suit.keys[0]}方面需要警惕失衡或内耗。`,
      });
    }
  }

  return deck;
}

const FULL_TAROT_DECK = buildFullDeck();

const TAROT_SPREADS = [
  {
    id: 'single',
    name: '单张指引',
    desc: '快速获取此刻最重要的一条提醒',
    positions: [{ label: '核心指引', prompt: '此刻最重要的指引是什么？' }],
  },
  {
    id: 'three-card',
    name: '三张时间流',
    desc: '过去、现在、未来',
    positions: [
      { label: '过去', prompt: '影响现状的过去因素' },
      { label: '现在', prompt: '当前的状态与核心课题' },
      { label: '未来', prompt: '即将到来的趋势或结果' },
    ],
  },
  {
    id: 'five-card',
    name: '五张局势牌阵',
    desc: '全面了解现状、阻碍、建议与结果',
    positions: [
      { label: '现状', prompt: '当下的核心状况' },
      { label: '阻碍', prompt: '面临的挑战或障碍' },
      { label: '潜流', prompt: '潜在的深层影响' },
      { label: '建议', prompt: '可以采取的行动' },
      { label: '结果', prompt: '可能的走向或结果' },
    ],
  },
];

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dealCards(deck, count) {
  return deck.slice(0, count);
}
