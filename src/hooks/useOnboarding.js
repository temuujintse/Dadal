import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'familyHabitOnboardingDone';

export function useOnboarding() {
  const [bootLoading, setBootLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => { if (mounted) setHasSeenOnboarding(value === 'true'); })
      .finally(() => { if (mounted) setBootLoading(false); });
    return () => { mounted = false; };
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasSeenOnboarding(true);
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setHasSeenOnboarding(false);
  };

  return { bootLoading, hasSeenOnboarding, finishOnboarding, resetOnboarding };
}
