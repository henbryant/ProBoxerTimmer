import { useCallback, useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

export function useGong() {
  const player = useAudioPlayer(require('../assets/gong.wav'));
  const sequence = useRef(0);
  const audioMode = useRef<Promise<void> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => () => { sequence.current++; }, [player]);

  const ring = useCallback(async () => {
    const request = ++sequence.current;
    try {
      if (Platform.OS === 'ios') {
        audioMode.current ??= setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
        }).catch(error => {
          audioMode.current = null;
          throw error;
        });
        await audioMode.current;
        if (request !== sequence.current) return;
      }

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
