// Game state engine - Canvas version
// Ported from gameStore.ts

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.boardSize = BOARD_SIZE;
    this.gameMode = 'pve';
    this.aiDifficulty = 'medium';
    this.currentPlayer = 'player1';
    this.phase = 'move'; // move | skill | discard | fate | gameover
    this.turnNumber = 0;
    this.selectedCard = null;
    this.selectedCardAnchor = null;
    this.pendingDrawCard = null;
    this.highlightedCells = [];
    this.dangerCells = [];
    this.fateState = null;
    this.pendingFateTriggers = [];
    this.battleLog = [];
    this.winner = null;
    this.winReason = '';
    this.message = '占星师先手。请点击相邻格子移动。';
    this.startedAt = Date.now();
    this.turnEndsAt = Date.now() + TURN_DURATION_MS;

    // Player states
    this.p1 = {
      id: 'player1', name: '占星师',
      r: SPAWN_P1.r, c: SPAWN_P1.c,
      hand: [], movesThisTurn: 0, cardsUsedThisTurn: 0,
      isConfused: false, confusionTurns: 0,
      hangedmanActive: false, hangedmanCount: 0,
    };
    this.p2 = {
      id: 'player2', name: '秘术师',
      r: SPAWN_P2.r, c: SPAWN_P2.c,
      hand: [], movesThisTurn: 0, cardsUsedThisTurn: 0,
      isConfused: false, confusionTurns: 0,
      hangedmanActive: false, hangedmanCount: 0,
    };
    this.obstacles = [];
    this.startGame();
  }

  startGame() {
    // Deal initial hands
    for (let i = 0; i < 3; i++) {
      this.p1.hand.push(drawRandomCard());
      this.p2.hand.push(drawRandomCard());
    }
  }

  getPlayer(id) { return id === 'player1' ? this.p1 : this.p2; }
  getOtherPlayer(id) { return id === 'player1' ? this.p2 : this.p1; }

  getPlayerAt(r, c) {
    if (this.p1.r === r && this.p1.c === c) return 'player1';
    if (this.p2.r === r && this.p2.c === c) return 'player2';
    return null;
  }

  isCellEmpty(r, c) {
    return this.getPlayerAt(r, c) === null &&
      !this.obstacles.some(o => o.r === r && o.c === c);
  }

  getOccupant(r, c) {
    const player = this.getPlayerAt(r, c);
    if (player) return { type: player === 'player1' ? 'player1' : 'player2' };
    if (this.obstacles.some(o => o.r === r && o.c === c)) return { type: 'obstacle' };
    return null;
  }

  getLegalMoves(playerId) {
    const player = this.getPlayer(playerId);
    const neighbors = getNeighbors(player.r, player.c);
    return neighbors.filter(n => this.isCellEmpty(n.r, n.c));
  }

  canPlayerAct(playerId) {
    const moves = this.getLegalMoves(playerId);
    return moves.length > 0 ||
      this.getPlayer(playerId).hand.some(c => canUseCard(this, playerId, c));
  }

  getStormRing(r, c) {
    const result = [];
    const dirs = (r % 2 === 0) ? EVEN_DIRS : ODD_DIRS;
    for (const d of dirs) {
      const nr = r + d.dr, nc = c + d.dc;
      if (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize) {
        result.push({ r: nr, c: nc });
      }
    }
    return result;
  }

  // ---- Card effects (ported from cards.ts) ----

  placeObstacle(r, c) {
    if (this.isCellEmpty(r, c)) {
      this.obstacles.push({ r, c });
      return true;
    }
    return false;
  }

  applyStorm(r, c) {
    const ring = this.getStormRing(r, c);
    const targets = ring.filter(p => this.obstacles.some(o => o.r === p.r && o.c === p.c));
    // Shuffle obstacles around
    for (const t of targets) {
      const ringCells = this.getStormRing(t.r, t.c).filter(n => this.isCellEmpty(n.r, n.c));
      if (ringCells.length > 0) {
        const dest = ringCells[Math.floor(Math.random() * ringCells.length)];
        this.obstacles = this.obstacles.filter(o => !(o.r === t.r && o.c === t.c));
        this.obstacles.push({ r: dest.r, c: dest.c });
      }
    }
  }

  swapPlayers() {
    const p1r = this.p1.r, p1c = this.p1.c;
    this.p1.r = this.p2.r; this.p1.c = this.p2.c;
    this.p2.r = p1r; this.p2.c = p1c;
  }

  applyFool(playerId) {
    const other = this.getOtherPlayer(playerId);
    other.isConfused = true;
    other.confusionTurns = 1;
  }

  applyTemperance(playerId) {
    const other = this.getOtherPlayer(playerId);
    if (other.hand.length > 0) {
      const idx = Math.floor(Math.random() * other.hand.length);
      other.hand.splice(idx, 1);
    }
  }

  applyHangedman(playerId) {
    const player = this.getPlayer(playerId);
    player.hangedmanActive = true;
    player.hangedmanCount = 2;
  }

  // ---- Turn flow ----

  startTurn(playerId) {
    this.currentPlayer = playerId;
    this.phase = 'move';
    this.selectedCard = null;
    this.selectedCardAnchor = null;
    this.pendingDrawCard = null;
    this.highlightedCells = [];
    this.turnEndsAt = Date.now() + TURN_DURATION_MS;
    this.turnNumber++;

    const player = this.getPlayer(playerId);
    player.movesThisTurn = 0;
    player.cardsUsedThisTurn = 0;

    // Confused player moves randomly
    if (player.isConfused) {
      player.confusionTurns--;
      if (player.confusionTurns <= 0) player.isConfused = false;
      const moves = this.getLegalMoves(playerId);
      if (moves.length > 0) {
        const randMove = moves[Math.floor(Math.random() * moves.length)];
        player.r = randMove.r; player.c = randMove.c;
        player.movesThisTurn = 1;
        if (player.hand.length < MAX_HAND_SIZE) {
          player.hand.push(drawRandomCard());
        }
        this.phase = 'skill';
        this.highlightedCells = [];
      }
    }

    // Get legal moves for display
    this.highlightedCells = this.getLegalMoves(playerId);
    this.message = `${player.name}的回合。请移动一步或直接出牌。`;

    // Check if player can act
    if (!this.canPlayerAct(playerId)) {
      this.endGame(this.getOtherPlayer(playerId).id, '无法行动');
    }
  }

  movePlayer(playerId, r, c) {
    const player = this.getPlayer(playerId);
    player.r = r; player.c = c;
    player.movesThisTurn = 1;
    this.highlightedCells = [];

    // Draw a card if hand not full
    if (player.hand.length < MAX_HAND_SIZE) {
      player.hand.push(drawRandomCard());
    } else {
      this.pendingDrawCard = drawRandomCard();
      this.phase = 'discard';
      this.message = '手牌已满，请选择一张弃掉。';
      return;
    }

    this.phase = 'skill';
    this.message = '请出牌或结束回合。';
  }

  selectCard(cardIdx) {
    const player = this.getPlayer(this.currentPlayer);
    if (cardIdx < 0 || cardIdx >= player.hand.length) return;
    this.selectedCard = cardIdx;
    const card = player.hand[cardIdx];

    if (card === 'obstacle' || card === 'storm') {
      // Need to select a target cell
      this.highlightedCells = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (this.isCellEmpty(r, c)) {
            this.highlightedCells.push({ r, c });
          }
        }
      }
      this.message = `请选择${card === 'obstacle' ? '放置障碍物' : '风暴'}的目标格。`;
    } else if (card === 'swords8') {
      this.highlightedCells = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (this.isCellEmpty(r, c)) {
            this.highlightedCells.push({ r, c });
          }
        }
      }
      this.message = '请选择宝剑八的起点格（需要连续2格）。';
    } else if (card === 'tower') {
      this.highlightedCells = [];
      this.message = '请点击方向移动（高塔跳跃）。';
    } else if (['chalice', 'fool', 'temperance', 'hangedman', 'fate'].includes(card)) {
      this.useCardOnTarget(null, null);
    }
  }

  useCardOnTarget(r, c) {
    if (this.selectedCard === null) return;
    const player = this.getPlayer(this.currentPlayer);
    const other = this.getOtherPlayer(this.currentPlayer);
    const card = player.hand[this.selectedCard];
    let multiplier = 1;
    let useHangedman = false;

    if (player.hangedmanActive && player.hangedmanCount > 0) {
      useHangedman = true;
      player.hangedmanCount--;
      if (player.hangedmanCount <= 0) player.hangedmanActive = false;
      multiplier = 2;
    }

    let swordSecond = null;

    switch (card) {
      case 'obstacle':
        for (let i = 0; i < multiplier; i++) {
          this.placeObstacle(r, c);
        }
        this.message = useHangedman ? '双倍月亮！放置了2个障碍物。' : '放置了一个障碍物。';
        break;
      case 'chalice':
        for (let i = 0; i < multiplier; i++) {
          this.swapPlayers();
        }
        this.message = '圣杯！与敌方交换了位置。';
        break;
      case 'storm':
        this.applyStorm(r, c);
        this.message = '恶魔！风暴席卷了障碍物。';
        break;
      case 'tower':
        this.message = '高塔跳跃！';
        break;
      case 'fool':
        this.applyFool(this.currentPlayer);
        this.message = '愚人！对方下次移动将随机方向。';
        break;
      case 'temperance':
        for (let i = 0; i < multiplier; i++) {
          this.applyTemperance(this.currentPlayer);
        }
        this.message = '节制！对方失去了手牌。';
        break;
      case 'hangedman':
        this.applyHangedman(this.currentPlayer);
        this.message = '倒吊人！接下来2张卡牌双倍效果。';
        break;
      case 'fate':
        this.fateState = { playerId: this.currentPlayer, choices: ['sun', 'death', 'empress'] };
        this.message = '命运牌！请选择：太阳/死神/女皇。';
        return; // Don't remove card yet
      case 'swords8':
        this.placeObstacle(r, c);
        this.message = '宝剑八！放置了障碍物。';
        break;
    }

    // Remove the played card
    player.hand[this.selectedCard] = player.hand[player.hand.length - 1];
    player.hand.pop();
    player.cardsUsedThisTurn++;
    this.selectedCard = null;
    this.highlightedCells = [];

    // Check game over
    if (!this.canPlayerAct(other.id)) {
      this.endGame(this.currentPlayer, '困住对方');
      return;
    }
  }

  selectFateChoice(choice) {
    if (!this.fateState) return;
    const player = this.getPlayer(this.currentPlayer);
    const other = this.getOtherPlayer(this.currentPlayer);

    switch (choice) {
      case 'sun':
        player.r = SPAWN_P1.r; player.c = SPAWN_P1.c;
        this.message = '太阳！你回到了出生点。';
        break;
      case 'death':
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (!this.isCellEmpty(r, c)) {
              this.obstacles = this.obstacles.filter(o => !(o.r === r && o.c === c));
            }
          }
        }
        this.message = '死神！清除了所有障碍物。';
        break;
      case 'empress':
        for (let i = 0; i < 3; i++) {
          const neighbors = getNeighbors(other.r, other.c).filter(n => this.isCellEmpty(n.r, n.c));
          if (neighbors.length > 0) {
            const n = neighbors[Math.floor(Math.random() * neighbors.length)];
            this.placeObstacle(n.r, n.c);
          }
        }
        this.message = '女皇！对方周围出现了障碍物。';
        break;
    }

    // Remove the fate card from hand
    player.hand[this.selectedCard] = player.hand[player.hand.length - 1];
    player.hand.pop();
    this.selectedCard = null;
    this.fateState = null;
    this.highlightedCells = [];

    if (!this.canPlayerAct(other.id)) {
      this.endGame(this.currentPlayer, '困住对方');
    }
  }

  discardCard(cardIdx) {
    const player = this.getPlayer(this.currentPlayer);
    if (cardIdx < 0 || cardIdx >= player.hand.length) return;
    player.hand.splice(cardIdx, 1);
    if (this.pendingDrawCard) {
      player.hand.push(this.pendingDrawCard);
      this.pendingDrawCard = null;
    }
    this.phase = 'skill';
    this.message = '弃牌完毕。请出牌或结束回合。';
  }

  endTurn() {
    const player = this.getPlayer(this.currentPlayer);
    // Draw card from move if not drawn yet
    if (player.movesThisTurn === 1 && player.hand.length < MAX_HAND_SIZE && !this.pendingDrawCard) {
      player.hand.push(drawRandomCard());
    }
    const nextPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';
    this.startTurn(nextPlayer);
  }

  endGame(winnerId, reason) {
    this.phase = 'gameover';
    this.winner = winnerId;
    this.winReason = reason;
    this.message = `${this.getPlayer(winnerId).name}获胜！原因：${reason}`;
  }

  checkTurnTimeout() {
    if (this.phase === 'gameover') return;
    if (Date.now() > this.turnEndsAt) {
      this.endGame(this.currentPlayer === 'player1' ? 'player2' : 'player1', '超时');
    }
  }
}

// ---- Card draw system ----

const CARD_POOL = [
  'obstacle', 'obstacle', 'obstacle',  // 30%
  'swords8', 'swords8',               // 20%
  'fool',                              // 10%
  'storm',                             // 8% (rounded)
  'chalice',                           // 6%
  'tower',                             // 6%
  'temperance',                        // 6%
  'hangedman',                         // 6%
  'fate',                              // 5%
];

function drawRandomCard() {
  return CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
}

// ---- Card legality ----

function canUseCard(state, playerId, cardType) {
  // Most cards can always be used
  // Tower needs a path with obstacles
  if (cardType === 'swords8') {
    // Need 2 consecutive empty cells
    let canPlace = false;
    for (let r = 0; r < BOARD_SIZE && !canPlace; r++) {
      for (let c = 0; c < BOARD_SIZE && !canPlace; c++) {
        if (state.isCellEmpty(r, c)) {
          const neighbors = getNeighbors(r, c).filter(n => state.isCellEmpty(n.r, n.c));
          if (neighbors.length > 0) canPlace = true;
        }
      }
    }
    return canPlace;
  }
  return true;
}
