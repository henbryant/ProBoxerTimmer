import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { frameAt, isGongBoundary, type Frame, type Settings } from './timer';

type Session = {
  settings: Settings;
  elapsed: number;
  startedAt: number | null;
  frame: Frame;
};

export function useWorkout(gong: () => void) {
  const current = useRef<Session | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const publish = useCallback((next: Session | null) => {
    current.current = next;
    setSession(next);
  }, []);

  const update = useCallback((pause: boolean) => {
    const previous = current.current;
    if (!previous || previous.startedAt === null) return;
    const elapsed = previous.elapsed + performance.now() - previous.startedAt;
    const frame = frameAt(previous.settings, elapsed);
    const boundary = isGongBoundary(previous.frame, frame);
    if (boundary) gong();
    if (pause || frame.phase === 'finished') {
      publish({ ...previous, elapsed, startedAt: null, frame });
    } else if (boundary || previous.frame.seconds !== frame.seconds) {
      publish({ ...previous, frame });
    }
  }, [gong, publish]);

  const running = session != null && session.startedAt !== null;
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => update(false), 100);
    return () => clearInterval(tick);
  }, [running, update]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') update(true);
    });
    return () => sub.remove();
  }, [update]);

  function start(settings: Settings) {
    const frame = frameAt(settings, 0);
    publish({ settings, startedAt: performance.now(), elapsed: 0, frame });
    gong();
  }

  function togglePause() {
    const previous = current.current;
    if (!previous || previous.frame.phase === 'finished') return;
    if (previous.startedAt === null) {
      publish({ ...previous, startedAt: performance.now() });
    } else {
      update(true);
    }
  }

  return { session, start, togglePause, reset: () => publish(null) };
}
