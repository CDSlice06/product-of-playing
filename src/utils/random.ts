export function normalizeSeed(seed: number) {
  const normalized = (seed >>> 0) || 0x9e3779b9;
  return normalized;
}

export function nextRandom(seed: number) {
  let next = normalizeSeed(seed);
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next = normalizeSeed(next);
  return {
    seed: next,
    value: next / 0x100000000,
  };
}

export function createSeededRandom(seed: number) {
  let currentSeed = normalizeSeed(seed);

  return {
    random() {
      const next = nextRandom(currentSeed);
      currentSeed = next.seed;
      return next.value;
    },
    getSeed() {
      return currentSeed;
    },
  };
}
