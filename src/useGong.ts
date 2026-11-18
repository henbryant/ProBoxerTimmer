import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';

export function useGong() {
  const player = useAudioPlayer(require('../assets/gong.wav'));
  const sequence = useRef(0);
  const [error, setError] = useState(false);

  useEffect(() => () => { sequence.current++; }, [player]);

  const ring = useCallback(async () => {
    const request = ++sequence.current;
    try {
      await player.seekTo(0);
      if (request === sequence.current) {
        player.play();
        setError(false);
      }
    } catch {
      if (request === sequence.current) setError(true);
    }
  }, [player]);

  return { ring, error };
}
