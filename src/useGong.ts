import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';

export function useGong() {
  const player = useAudioPlayer(require('../assets/gong.wav'));
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const sequence = useRef(0);
  const [error, setError] = useState(false);

  useEffect(() => () => { sequence.current++; }, [player]);

  const ring = useCallback(async () => {
    if (!enabledRef.current) return;
    const request = ++sequence.current;
    try {
      await player.seekTo(0);
      if (request === sequence.current && enabledRef.current) {
        player.play();
        setError(false);
      }
    } catch {
      if (request === sequence.current) setError(true);
    }
  }, [player]);

  function toggle(value: boolean) {
    enabledRef.current = value;
    sequence.current++;
    player.muted = !value;
    if (!value) player.pause();
    setEnabled(value);
  }

  return { enabled, toggle, ring, error };
}
