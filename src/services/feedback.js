import * as Haptics from 'expo-haptics';

const quietly = (promise) => promise?.catch?.(() => {});

export const successFeedback = () => quietly(
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
);

export const selectionFeedback = () => quietly(Haptics.selectionAsync());

export const lightImpact = () => quietly(
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
);
