export type Settings = { work: number; rest: number; rounds: number };
export const defaults: Settings = { work: 180, rest: 30, rounds: 3 };
export const maxWorkSeconds = 10 * 60;
export const maxRestSeconds = 99 * 60 + 59;
export const maxRounds = 12;
export type Phase = 'work' | 'rest' | 'finished' | 'stopped';
export type Frame = { phase: Phase; round: number; seconds: number };
export type Session = {
  settings: Settings;
  elapsed: number;
  startedAt: number | null;
  frame: Frame;
  ready: boolean;
};

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
  const minutes = Math.floor(seconds / 60);
  return minutes + ':' + (seconds % 60).toString().padStart(2, '0');
}

export function prepareSession(settings: Settings): Session {
  return { settings, elapsed: 0, startedAt: null, frame: frameAt(settings, 0), ready: true };
}

export function stopSession(session: Session): Session {
  return {
    ...session,
    startedAt: null,
    ready: false,
    frame: { ...session.frame, phase: 'stopped', seconds: 0 },
  };
}

export function restoreSettings(raw: string | null): Settings {
  if (raw === null) return defaults;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (data === null || typeof data !== 'object') return defaults;

  const saved = data as Partial<Record<keyof Settings, unknown>>;
  return {
    work: restoreNumber(saved.work, defaults.work, 1, maxWorkSeconds),
    rest: restoreNumber(saved.rest, defaults.rest, 0, maxRestSeconds),
    rounds: restoreNumber(saved.rounds, defaults.rounds, 1, maxRounds),
  };
}

function restoreNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) return fallback;
  return Math.min(value, max);
}
