import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalytics, resetAnalyticsData, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import {
  deleteUnsentReports, getCrashlytics, setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics';

const consentKey = 'proboxer:firebase-monitoring-consent';

async function applyConsent(allowed: boolean, resetAnalytics = false) {
  const results = await Promise.allSettled([
    (async () => {
      const analytics = getAnalytics();
      await setAnalyticsCollectionEnabled(analytics, allowed);
      if (resetAnalytics) await resetAnalyticsData(analytics);
    })(),
    (async () => {
      const crashlytics = getCrashlytics();
      await setCrashlyticsCollectionEnabled(crashlytics, allowed);
      if (!allowed) await deleteUnsentReports(crashlytics);
    })(),
  ]);
  if (results.some(result => result.status === 'rejected')) {
    throw new Error('Firebase monitoring preferences could not be applied');
  }
}

export function useMonitoringConsent() {
  const [choice, setChoice] = useState<boolean | null>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function restore() {
      let savedChoice: boolean | null = null;
      let failed = false;
      try {
        const saved = await AsyncStorage.getItem(consentKey);
        if (saved === 'allowed') savedChoice = true;
        if (saved === 'declined') savedChoice = false;
      } catch {
        failed = true;
      }
      try {
        if (active) await applyConsent(savedChoice === true);
      } catch {
        failed = true;
      }
      if (active) {
        setChoice(savedChoice);
        setError(failed);
      }
    }

    void restore();
    return () => { active = false; };
  }, []);

  async function choose(allowed: boolean) {
    if (choice === undefined || savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setError(false);

    try {
      if (allowed) {
        if (choice !== true) await deleteUnsentReports(getCrashlytics());
        await AsyncStorage.setItem(consentKey, 'allowed');
        setChoice(true);
        await applyConsent(true);
      } else {
        const [saved, applied] = await Promise.allSettled([
          AsyncStorage.setItem(consentKey, 'declined'),
          applyConsent(false, true),
        ]);
        if (saved.status === 'fulfilled') setChoice(false);
        if (saved.status === 'rejected' || applied.status === 'rejected') {
          throw new Error('Firebase monitoring preferences could not be saved or applied');
        }
      }
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return { choice, saving, error, choose };
}
