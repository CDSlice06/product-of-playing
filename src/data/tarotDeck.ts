export type TarotArcana = "major" | "wands" | "cups" | "swords" | "pentacles";

export interface TarotCardDefinition {
  id: string;
  arcana: TarotArcana;
  suitLabel: string;
  name: string;
  englishName: string;
  rank: string;
  keywords: string[];
  upright: string;
  reversed: string;
}

export interface TarotSpreadPosition {
  label: string;
  prompt: string;
}

export interface TarotSpreadDefinition {
  id: string;
  name: string;
  description: string;
  positions: TarotSpreadPosition[];
}

interface MajorCardSeed {
  id: string;
  name: string;
  englishName: string;
  keywords: string[];
  upright: string;
  reversed: string;
}

interface MinorSuitConfig {
  arcana: Exclude<TarotArcana, "major">;
  suitLabel: string;
  englishPrefix: string;
  suitKeywords: string[];
}

interface MinorRankConfig {
  rank: string;
  shortName: string;
  keywords: string[];
  uprightTemplate: (suitLabel: string) => string;
  reversedTemplate: (suitLabel: string) => string;
}

const MAJOR_ARCANA: MajorCardSeed[] = [
  {
    id: "major-fool",
    name: "愚者",
    englishName: "The Fool",
    keywords: ["开始", "勇气", "直觉"],
    upright: "象征新的旅程即将展开，适合相信直觉、轻装上阵，在未知里保持勇气与好奇。",
    reversed: "提醒你不要把冲动当成自由，先看清风险、边界与现实条件，再决定是否起步。",
  },
  {
    id: "major-magician",
    name: "魔术师",
    englishName: "The Magician",
    keywords: ["创造", "行动", "掌控"],
    upright: "代表资源齐备、表达清晰，只要聚焦目标并付诸行动，就能把想法落到现实。",
    reversed: "提示能量分散或过度包装，先停止空转，重新整理能力、节奏与真实动机。",
  },
  {
    id: "major-high-priestess",
    name: "女祭司",
    englishName: "The High Priestess",
    keywords: ["内在", "观察", "潜意识"],
    upright: "说明答案更适合向内寻找，先安静观察、等待信息浮现，不必急着给出结论。",
    reversed: "表示你可能忽略了真正的感受，或被外界声音打乱判断，需要回到内心。",
  },
  {
    id: "major-empress",
    name: "女皇",
    englishName: "The Empress",
    keywords: ["滋养", "丰盛", "关系"],
    upright: "象征关系与资源进入丰盛期，适合照顾自己、经营连接，也能稳定收获成果。",
    reversed: "提醒你别把付出变成过度消耗，先补足自己的能量，再继续照顾他人。",
  },
  {
    id: "major-emperor",
    name: "皇帝",
    englishName: "The Emperor",
    keywords: ["秩序", "边界", "责任"],
    upright: "说明现在需要建立规则、边界和执行力，用稳定结构保护你真正重视的事。",
    reversed: "可能出现控制过强、固执或失去弹性，建议放松僵硬立场，重新协调关系。",
  },
  {
    id: "major-hierophant",
    name: "教皇",
    englishName: "The Hierophant",
    keywords: ["传统", "学习", "指引"],
    upright: "代表适合借助经验、制度或导师力量，按成熟方法推进会更稳妥。",
    reversed: "提示旧规则不再完全适配，你需要在传统与个人选择之间找到新的平衡。",
  },
  {
    id: "major-lovers",
    name: "恋人",
    englishName: "The Lovers",
    keywords: ["选择", "连接", "契合"],
    upright: "象征关系与价值观正在对齐，关键在于做出真心一致、能长期承担的选择。",
    reversed: "提醒你留意关系中的摇摆、逃避或价值失衡，不要用拖延代替决定。",
  },
  {
    id: "major-chariot",
    name: "战车",
    englishName: "The Chariot",
    keywords: ["推进", "意志", "胜利"],
    upright: "表示局势可以被你推进，只要统一意志、稳住节奏，就能突破当前阻力。",
    reversed: "说明方向感正在失衡，先调整目标与速度，否则越用力越容易偏离。",
  },
  {
    id: "major-strength",
    name: "力量",
    englishName: "Strength",
    keywords: ["耐心", "温柔", "自控"],
    upright: "意味着真正的强大来自稳定、温柔和自我节制，而不是硬碰硬地压制。",
    reversed: "提示你可能在自我怀疑或情绪透支中失去力量，需要重新建立信心和节奏。",
  },
  {
    id: "major-hermit",
    name: "隐者",
    englishName: "The Hermit",
    keywords: ["独处", "思考", "寻找"],
    upright: "适合暂时放慢脚步，通过独处、学习和复盘找到更清晰的方向。",
    reversed: "可能陷入过度封闭或反复内耗，提醒你适时向可信任的人求助。",
  },
  {
    id: "major-wheel-of-fortune",
    name: "命运之轮",
    englishName: "Wheel of Fortune",
    keywords: ["变化", "转机", "循环"],
    upright: "说明命运轮盘正在转动，旧局势会松动，顺势而为比硬抗更有利。",
    reversed: "表示你暂时卡在重复模式里，需要先看清循环，再决定怎样打破惯性。",
  },
  {
    id: "major-justice",
    name: "正义",
    englishName: "Justice",
    keywords: ["平衡", "因果", "诚实"],
    upright: "提醒你回到事实、责任和长期后果上，用公平与清醒来处理问题。",
    reversed: "提示失衡、偏见或逃避责任，建议先把真相讲清楚，再谈下一步。",
  },
  {
    id: "major-hanged-man",
    name: "倒吊人",
    englishName: "The Hanged Man",
    keywords: ["暂停", "换位", "觉察"],
    upright: "表示此刻并非强行推进的时机，换一个角度看待问题，反而更快接近答案。",
    reversed: "说明你可能在无效等待或被动拖延，需要分清是真暂停还是不敢行动。",
  },
  {
    id: "major-death",
    name: "死神",
    englishName: "Death",
    keywords: ["结束", "转化", "重生"],
    upright: "象征一段阶段正在结束，放下旧模式后，新的成长与关系才会真正开始。",
    reversed: "提示你还抓着已经失效的东西不放，越抗拒改变，消耗越明显。",
  },
  {
    id: "major-temperance",
    name: "节制",
    englishName: "Temperance",
    keywords: ["调和", "疗愈", "平衡"],
    upright: "说明局势需要的是慢慢调和和稳定修复，找到适中的节奏比极端更有效。",
    reversed: "表示失衡、过度或节奏混乱，先停下来校准身体、情绪与现实安排。",
  },
  {
    id: "major-devil",
    name: "恶魔",
    englishName: "The Devil",
    keywords: ["执念", "束缚", "诱惑"],
    upright: "提醒你正被欲望、依赖或恐惧牵制，关键不是否认，而是看见并松绑。",
    reversed: "代表你已开始意识到束缚来源，适合切断耗损关系或旧有依附。",
  },
  {
    id: "major-tower",
    name: "高塔",
    englishName: "The Tower",
    keywords: ["震荡", "真相", "重建"],
    upright: "表示旧结构会被打破，虽然突然，但能让你看清真实并重建更稳的基础。",
    reversed: "提示震荡已在逼近，越逃避修正，后续清理成本可能越高。",
  },
  {
    id: "major-star",
    name: "星星",
    englishName: "The Star",
    keywords: ["希望", "修复", "信任"],
    upright: "说明希望正在回流，适合疗愈、许愿和重新相信自己正在走向更好的方向。",
    reversed: "可能暂时看不见光，但并不代表没有出路，先照顾好内在信念。",
  },
  {
    id: "major-moon",
    name: "月亮",
    englishName: "The Moon",
    keywords: ["直觉", "迷雾", "情绪"],
    upright: "表示情绪与潜意识正在放大，适合听直觉，但不宜仓促下最终结论。",
    reversed: "提醒迷雾正在散开，隐藏的信息会逐步显现，真相也将更清楚。",
  },
  {
    id: "major-sun",
    name: "太阳",
    englishName: "The Sun",
    keywords: ["明朗", "成功", "生命力"],
    upright: "象征结果明朗、关系真诚、能量充足，很多事会朝积极方向展开。",
    reversed: "表示好结果仍在，但可能被延迟或被担忧遮住，需要保持信心与耐心。",
  },
  {
    id: "major-judgement",
    name: "审判",
    englishName: "Judgement",
    keywords: ["觉醒", "决定", "召唤"],
    upright: "代表关键时刻已到，你需要回应内心召唤，做出真正改变命运的决定。",
    reversed: "提示你还在犹豫或否认旧问题，若想跨过去，先接纳真实的自己。",
  },
  {
    id: "major-world",
    name: "世界",
    englishName: "The World",
    keywords: ["完成", "整合", "圆满"],
    upright: "说明一个周期接近完成，你已经具备整合经验、进入下一阶段的能力。",
    reversed: "表示还有最后一点功课没有收尾，补上细节后，圆满就会真正落地。",
  },
];

const MINOR_SUITS: MinorSuitConfig[] = [
  {
    arcana: "wands",
    suitLabel: "权杖",
    englishPrefix: "Wands",
    suitKeywords: ["行动", "热情", "创造"],
  },
  {
    arcana: "cups",
    suitLabel: "圣杯",
    englishPrefix: "Cups",
    suitKeywords: ["情感", "关系", "感受"],
  },
  {
    arcana: "swords",
    suitLabel: "宝剑",
    englishPrefix: "Swords",
    suitKeywords: ["思维", "判断", "沟通"],
  },
  {
    arcana: "pentacles",
    suitLabel: "星币",
    englishPrefix: "Pentacles",
    suitKeywords: ["现实", "资源", "稳定"],
  },
];

const MINOR_RANKS: MinorRankConfig[] = [
  {
    rank: "ace",
    shortName: "首牌",
    keywords: ["开端", "机会", "种子"],
    uprightTemplate: (suitLabel) => `象征${suitLabel}领域的新机会正在出现，适合顺势播种、主动把握第一步。`,
    reversedTemplate: (suitLabel) => `提示${suitLabel}领域的机会感还不稳定，先别着急定论，等信号更明确再行动。`,
  },
  {
    rank: "two",
    shortName: "二",
    keywords: ["平衡", "选择", "试探"],
    uprightTemplate: (suitLabel) => `说明你正在${suitLabel}议题里学习平衡与配合，适合边观察边调整节奏。`,
    reversedTemplate: (suitLabel) => `表示${suitLabel}方面出现摇摆或失衡，先厘清优先级，再继续推进。`,
  },
  {
    rank: "three",
    shortName: "三",
    keywords: ["扩展", "连接", "成长"],
    uprightTemplate: (suitLabel) => `代表${suitLabel}层面的能量开始扩展，合作、交流或成果都会逐渐成形。`,
    reversedTemplate: (suitLabel) => `提醒${suitLabel}领域的成长节奏被拖慢，可能需要修复协作或重新规划。`,
  },
  {
    rank: "four",
    shortName: "四",
    keywords: ["稳定", "停顿", "基础"],
    uprightTemplate: (suitLabel) => `意味着${suitLabel}议题需要稳住基础，暂时停一下，反而能积蓄更扎实的力量。`,
    reversedTemplate: (suitLabel) => `表示${suitLabel}方面的停滞感过强，若长期不动，就会错过应有的流动。`,
  },
  {
    rank: "five",
    shortName: "五",
    keywords: ["冲突", "变化", "压力"],
    uprightTemplate: (suitLabel) => `提示${suitLabel}领域出现冲突与磨合，问题并非坏事，而是逼你重新定位。`,
    reversedTemplate: (suitLabel) => `说明${suitLabel}压力已经开始缓解，但仍需处理残留的矛盾与疲惫。`,
  },
  {
    rank: "six",
    shortName: "六",
    keywords: ["流动", "修复", "前进"],
    uprightTemplate: (suitLabel) => `象征${suitLabel}层面的关系或节奏开始回到顺流状态，适合继续前进。`,
    reversedTemplate: (suitLabel) => `表示${suitLabel}领域仍有未解的旧问题，若不整理，前行会被反复拉住。`,
  },
  {
    rank: "seven",
    shortName: "七",
    keywords: ["试炼", "坚持", "判断"],
    uprightTemplate: (suitLabel) => `说明${suitLabel}议题进入考验阶段，需要你坚定立场，同时保持策略。`,
    reversedTemplate: (suitLabel) => `提醒你在${suitLabel}方面可能分神或泄气，先收拢注意力，再继续守住核心。`,
  },
  {
    rank: "eight",
    shortName: "八",
    keywords: ["推进", "专注", "加速"],
    uprightTemplate: (suitLabel) => `代表${suitLabel}领域会明显加速，越专注、越简化，结果越容易落地。`,
    reversedTemplate: (suitLabel) => `表示${suitLabel}节奏失控或信息过载，建议先减速、过滤，再做决定。`,
  },
  {
    rank: "nine",
    shortName: "九",
    keywords: ["收尾", "成熟", "边界"],
    uprightTemplate: (suitLabel) => `意味着${suitLabel}层面的功课已接近完成，你需要带着经验守住自己的边界。`,
    reversedTemplate: (suitLabel) => `提示${suitLabel}问题仍在尾声反复，别让过去的疲惫影响最后一步。`,
  },
  {
    rank: "ten",
    shortName: "十",
    keywords: ["圆满", "极限", "转段"],
    uprightTemplate: (suitLabel) => `象征${suitLabel}阶段来到终点或高峰，适合总结成果并准备进入新循环。`,
    reversedTemplate: (suitLabel) => `表示${suitLabel}领域已经过载，需要卸下过重包袱，才能开始新阶段。`,
  },
  {
    rank: "page",
    shortName: "侍者",
    keywords: ["学习", "消息", "探索"],
    uprightTemplate: (suitLabel) => `代表与${suitLabel}有关的新消息、新灵感或新学习正在靠近，适合保持开放。`,
    reversedTemplate: (suitLabel) => `说明${suitLabel}领域的信息还不成熟，先别急着全盘投入，继续观察。`,
  },
  {
    rank: "knight",
    shortName: "骑士",
    keywords: ["行动", "执行", "冲劲"],
    uprightTemplate: (suitLabel) => `说明${suitLabel}能量适合进入执行阶段，关键在于把热情转成持续推进。`,
    reversedTemplate: (suitLabel) => `提醒${suitLabel}行动可能过猛或方向不稳，需要控制节奏，别只靠冲劲。`,
  },
  {
    rank: "queen",
    shortName: "皇后",
    keywords: ["成熟", "照料", "掌握"],
    uprightTemplate: (suitLabel) => `象征你能成熟地掌握${suitLabel}议题，以温柔而稳定的方式影响局面。`,
    reversedTemplate: (suitLabel) => `表示${suitLabel}方面可能出现情绪过满或照顾失衡，先回到自我稳定。`,
  },
  {
    rank: "king",
    shortName: "国王",
    keywords: ["领导", "整合", "定局"],
    uprightTemplate: (suitLabel) => `代表${suitLabel}层面已经走向成熟整合，适合做最终判断并稳住全局。`,
    reversedTemplate: (suitLabel) => `提醒${suitLabel}领域的掌控欲或固执正在上升，弹性会比强压更重要。`,
  },
];

function buildMinorArcanaDeck() {
  return MINOR_SUITS.flatMap((suit) =>
    MINOR_RANKS.map<TarotCardDefinition>((rank) => ({
      id: `${suit.arcana}-${rank.rank}`,
      arcana: suit.arcana,
      suitLabel: suit.suitLabel,
      name: `${suit.suitLabel}${rank.shortName}`,
      englishName: `${capitalize(rank.rank)} of ${suit.englishPrefix}`,
      rank: rank.rank,
      keywords: [...suit.suitKeywords, ...rank.keywords],
      upright: rank.uprightTemplate(suit.suitLabel),
      reversed: rank.reversedTemplate(suit.suitLabel),
    })),
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export const FULL_TAROT_DECK: TarotCardDefinition[] = [
  ...MAJOR_ARCANA.map((card) => ({
    ...card,
    arcana: "major" as const,
    suitLabel: "大阿尔卡那",
    rank: "major",
  })),
  ...buildMinorArcanaDeck(),
];

export const TAROT_SPREADS: TarotSpreadDefinition[] = [
  {
    id: "single",
    name: "单张指引",
    description: "适合快速获取此刻最重要的一条提醒。",
    positions: [
      {
        label: "核心指引",
        prompt: "这张牌说明你此刻最需要看见的主题与行动方向。",
      },
    ],
  },
  {
    id: "three-card",
    name: "三张时间流",
    description: "对应过去、现在、未来，适合梳理事件进程。",
    positions: [
      {
        label: "过去",
        prompt: "过去的经历、情绪或旧模式是如何影响当前局面的。",
      },
      {
        label: "现在",
        prompt: "你眼下最真实的状态、核心课题与正在面对的重点。",
      },
      {
        label: "未来",
        prompt: "如果保持当前节奏，局势最可能延伸出的方向。",
      },
    ],
  },
  {
    id: "five-card",
    name: "五张局势牌阵",
    description: "适合更完整地看现状、阻碍、建议与结果。",
    positions: [
      {
        label: "现状",
        prompt: "目前最核心的现实状态和事情主轴。",
      },
      {
        label: "阻碍",
        prompt: "真正卡住你的因素，或你暂时没有看清的压力点。",
      },
      {
        label: "潜流",
        prompt: "潜意识、隐藏信息或对局势产生影响的深层动力。",
      },
      {
        label: "建议",
        prompt: "牌阵给你的核心行动建议与调整方向。",
      },
      {
        label: "结果",
        prompt: "在当前能量延续下，最可能出现的阶段性结果。",
      },
    ],
  },
];

export const TAROT_SHUFFLE_METHODS = [
  {
    id: "mahjong",
    name: "麻将式洗牌",
    description: "牌面朝下，双手画圈混合，最适合专注问题、让直觉充分参与。",
  },
  {
    id: "drawer",
    name: "抽屉式洗牌",
    description: "一手托牌，一手从中间抽出牌叠反复混入，适合快速打散顺序。",
  },
  {
    id: "riffle",
    name: "扑克牌式洗牌",
    description: "像普通扑克牌一样洗牌，节奏快，但需要注意别太用力折牌。",
  },
] as const;
