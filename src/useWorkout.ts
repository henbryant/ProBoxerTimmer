import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { frameAt, isGongBoundary, prepareSession, stopSession, type Session, type Settings } from './timer';

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
    publish({ ...prepareSession(settings), startedAt: performance.now(), ready: false });
    gong();
  }

  function rewind() {
    const previous = current.current;
    if (previous) publish(prepareSession(previous.settings));
  }

  function togglePause() {
    const previous = current.current;
    if (!previous || previous.ready || previous.frame.phase === 'finished' || previous.frame.phase === 'stopped') return;
    if (previous.startedAt === null) {
      publish({ ...previous, startedAt: performance.now() });
    } else {
      update(true);
    }
  }

  function stop() {
    const previous = current.current;
    if (!previous || previous.ready || previous.frame.phase === 'finished') return;
    publish(stopSession(previous));
  }

  return { session, start, togglePause, rewind, stop, clear: () => publish(null) };
}
