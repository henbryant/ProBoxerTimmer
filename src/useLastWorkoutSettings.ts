import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaults, restoreSettings, type Settings } from './timer';

const storageKey = 'proboxer:last-workout-settings';

export function useLastWorkoutSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingSave = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey).then(
      raw => {
        if (active) setSettings(restoreSettings(raw));
      },
      () => {
        if (!active) return;
        setError('前回の設定を読み込めませんでした。');
        setSettings(defaults);
      },
    );
    return () => { active = false; };
  }, []);

  function save(settings: Settings) {
    pendingSave.current = pendingSave.current
      .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(settings)))
      .then(() => setError(null), () => setError('練習設定を保存できませんでした。'));
  }

  return { settings, setSettings, save, error };
}
