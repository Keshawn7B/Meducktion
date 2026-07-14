import type { SeededRandomState } from "./types";

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function createSeededRandomState(
  seed: string | number,
): SeededRandomState {
  const initialSeed = String(seed);
  return {
    initialSeed,
    state: hashSeed(initialSeed),
    draws: 0,
  };
}

export function nextSeededRandom(
  source: SeededRandomState,
): { value: number; state: SeededRandomState } {
  const state = { ...source };
  let value = (state.state + 0x6d2b79f5) >>> 0;
  state.state = value;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  value = (value ^ (value >>> 14)) >>> 0;
  state.draws += 1;
  return { value: value / 4_294_967_296, state };
}

export function seededShuffle<T>(
  values: readonly T[],
  source: SeededRandomState,
): { values: T[]; state: SeededRandomState } {
  const shuffled = [...values];
  let state = { ...source };
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const next = nextSeededRandom(state);
    state = next.state;
    const swapIndex = Math.floor(next.value * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];
    if (current === undefined || swap === undefined) {
      continue;
    }
    shuffled[index] = swap;
    shuffled[swapIndex] = current;
  }
  return { values: shuffled, state };
}

export function seededChoice<T>(
  values: readonly T[],
  source: SeededRandomState,
): { value: T; state: SeededRandomState } | null {
  if (values.length === 0) {
    return null;
  }
  const next = nextSeededRandom(source);
  const value = values[Math.floor(next.value * values.length)];
  return value === undefined ? null : { value, state: next.state };
}
