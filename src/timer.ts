export type Settings = { work: number; rest: number; rounds: number };
export const defaults: Settings = { work: 180, rest: 30, rounds: 3 };
export type Phase = 'work' | 'rest' | 'finished';
export type Frame = { phase: Phase; round: number; seconds: number };

export function frameAt(settings: Settings, elapsedMs: number): Frame {
  const { work, rest, rounds } = settings;
  const elapsed = Math.floor(Math.max(0, elapsedMs) / 1000);
  const cycle = work + rest;
  if (elapsed >= cycle * rounds - rest) {
    return { phase: 'finished', round: rounds, seconds: 0 };
  }
  const round = Math.floor(elapsed / cycle) + 1;
  const within = elapsed % cycle;
  return within < work
    ? { phase: 'work', round, seconds: work - within }
    : { phase: 'rest', round, seconds: cycle - within };
}

export function isGongBoundary(previous: Frame | null, current: Frame) {
  return previous?.phase !== current.phase || previous.round !== current.round;
}

export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  return minutes + ':' + (seconds % 60).toString().padStart(2, '0');
}

export function parseSetting(value: string, min: number, max: number) {
  const number = Number(value);
  return /^\d+$/.test(value) && number >= min && number <= max ? number : null;
}
