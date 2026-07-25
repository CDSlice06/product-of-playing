// AI opponent engine - Canvas version
// Ported from ai.ts

const AI_PROFILES = {
  easy: {
    name: '简单',
    moveWeight: 5,
    obstacleWeight: 3,
    trapWeight: 1,
    aggressionWeight: 1,
  },
  medium: {
    name: '中等',
    moveWeight: 7,
    obstacleWeight: 5,
    trapWeight: 3,
    aggressionWeight: 4,
  },
  hard: {
    name: '困难',
    moveWeight: 10,
    obstacleWeight: 8,
    trapWeight: 6,
    aggressionWeight: 7,
  },
};

function getAIConfig(difficulty) {
  return AI_PROFILES[difficulty] || AI_PROFILES.medium;
}

function chooseAiMove(state) {
  const profile = getAIConfig(state.aiDifficulty);
  const ai = state.p2;
  const human = state.p1;

  // Strategy: prefer moves that reduce opponent's options
  const moves = state.getLegalMoves('player2');
  if (moves.length === 0) return null;

  // Score each move
  const scored = moves.map(m => {
    let score = 0;

    // 1. Move towards center (better position)
    const distCenter = Math.abs(m.r - BOARD_SIZE / 2) + Math.abs(m.c - BOARD_SIZE / 2);
    score -= distCenter * 0.5;

    // 2. Get closer to opponent (aggression)
    const distOpponent = Math.abs(m.r - human.r) + Math.abs(m.c - human.c);
    score -= distOpponent * profile.aggressionWeight * 0.3;

    // 3. Prefer positions that leave AI with more options
    const aiNewPos = { r: m.r, c: m.c };
    const tempAi = { ...ai, r: m.r, c: m.c };

    // Count AI's future options from this position
    const futureMoves = getNeighbors(m.r, m.c).filter(n => state.isCellEmpty(n.r, n.c));
    score += futureMoves.length * profile.moveWeight * 0.5;

    // 4. Prefer positions that limit opponent (trap)
    const humanMoves = state.getLegalMoves('player1');
    score += (BOARD_SIZE - humanMoves.length) * profile.trapWeight * 0.2;

    // 5. Some randomness
    score += Math.random() * profile.moveWeight * 0.3;

    return { move: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.move || moves[Math.floor(Math.random() * moves.length)];
}

function chooseAiCard(state) {
  const ai = state.p2;
  const human = state.p1;
  const profile = getAIConfig(state.aiDifficulty);

  if (ai.hand.length === 0) return null;

  // Score each card
  const scored = ai.hand.map((card, idx) => {
    let score = 0;
    switch (card) {
      case 'obstacle':
        // Place near opponent to limit their movement
        const humanNeighbors = getNeighbors(human.r, human.c).filter(n => state.isCellEmpty(n.r, n.c));
        score = humanNeighbors.length * profile.obstacleWeight;
        break;
      case 'swords8':
        score = profile.obstacleWeight * 2; // Can place multiple
        break;
      case 'chalice':
        // Swap if AI is in bad position
        const aiMoves = state.getLegalMoves('player2').length;
        const humanMovesCount = state.getLegalMoves('player1').length;
        if (aiMoves < 3 && humanMovesCount > 5) score = profile.trapWeight * 3;
        else if (aiMoves < 2) score = profile.trapWeight * 4;
        break;
      case 'storm':
        // Worth it if many obstacles near opponent
        const ring = state.getStormRing(human.r, human.c);
        const nearbyObs = ring.filter(p => state.obstacles.some(o => o.r === p.r && o.c === p.c));
        score = nearbyObs.length * profile.obstacleWeight;
        break;
      case 'fool':
        score = profile.aggressionWeight * 3;
        break;
      case 'temperance':
        if (human.hand.length >= 3) score = profile.aggressionWeight * 4;
        else if (human.hand.length >= 1) score = profile.aggressionWeight * 2;
        break;
      case 'hangedman':
        score = profile.aggressionWeight * 2;
        break;
      case 'fate':
        score = profile.aggressionWeight * 3 + Math.random() * 2;
        break;
      case 'tower':
        score = profile.moveWeight * 1.5;
        break;
    }
    score += Math.random() * 2;
    return { idx, card, score };
  });

  // Only use cards if they're good enough
  const threshold = profile.aggressionWeight * 2;
  const good = scored.filter(s => s.score >= threshold);
  good.sort((a, b) => b.score - a.score);

  if (good.length > 0) return good[0];
  return null; // Skip card, end turn instead
}

function aiSelectFateChoice(state) {
  const ai = state.p2;
  const aiMoves = state.getLegalMoves('player2');

  // If trapped, choose sun (reset position)
  if (aiMoves.length <= 1) return 'sun';
  // If opponent near the edge, death might help
  const humanMoves = state.getLegalMoves('player1');
  if (humanMoves.length > 5) return 'empress';
  // Default vary
  const choices = ['sun', 'death', 'empress'];
  return choices[Math.floor(Math.random() * choices.length)];
}

function executeAiTurn(state) {
  // 1. Move phase
  const move = chooseAiMove(state);
  if (!move) {
    state.endGame(state.p2.id, 'AI无法移动');
    return;
  }
  state.movePlayer('player2', move.r, move.c);

  // Handle discard if needed
  if (state.phase === 'discard') {
    // AI discards its worst card
    const scored = state.p2.hand.map((card, idx) => {
      let score = 0;
      switch (card) {
        case 'obstacle': score = 8; break;
        case 'swords8': score = 9; break;
        case 'chalice': score = 7; break;
        case 'storm': score = 6; break;
        case 'fool': score = 5; break;
        case 'temperance': score = 5; break;
        case 'hangedman': score = 4; break;
        case 'fate': score = 5; break;
        case 'tower': score = 6; break;
        default: score = 5;
      }
      return { idx, score };
    });
    scored.sort((a, b) => a.score - b.score);
    state.discardCard(scored[0].idx);
  }

  if (state.phase === 'skill') {
    const cardChoice = chooseAiCard(state);
    if (cardChoice) {
      state.selectCard(cardChoice.idx);
      const card = state.p2.hand[state.selectedCard];

      if (card === 'obstacle' || card === 'storm' || card === 'swords8') {
        // Pick a good cell
        const human = state.p1;
        const blocked = getNeighbors(human.r, human.c).filter(n => state.isCellEmpty(n.r, n.c));
        if (blocked.length > 0) {
          const target = blocked[Math.floor(Math.random() * blocked.length)];
          state.useCardOnTarget(target.r, target.c);
        } else {
          // Find any empty cell
          let found = false;
          for (let r = 0; r < BOARD_SIZE && !found; r++) {
            for (let c = 0; c < BOARD_SIZE && !found; c++) {
              if (state.isCellEmpty(r, c)) {
                state.useCardOnTarget(r, c);
                found = true;
              }
            }
          }
        }
      } else if (card === 'fate') {
        const choice = aiSelectFateChoice(state);
        state.selectFateChoice(choice);
      } else if (['chalice', 'fool', 'temperance', 'hangedman'].includes(card)) {
        state.useCardOnTarget(null, null);
      }
    }
  }

  // End AI's turn
  if (state.phase !== 'gameover') {
    state.endTurn();
  }
}
