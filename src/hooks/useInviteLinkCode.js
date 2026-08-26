import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

// Invite link: familyhabit://join?code=FAM-XXXXXX
export function useInviteLinkCode() {
  const [pendingInviteCode, setPendingInviteCode] = useState('');

  useEffect(() => {
    const extractInviteCode = (url) => {
      if (!url) return;
      const match = url.match(/[?&]code=([^&]+)/i);
      if (!match?.[1]) return;
      // Муу % кодчилол (жишээ нь familyhabit://join?code=%zz) decodeURIComponent-ийг
      // URIError-оор унагадаг — Linking listener дотор uncaught exception болж
      // апп crash хийдэг байсан. Буруу линкийг чимээгүй орхино.
      try {
        const decoded = decodeURIComponent(match[1]);
        setPendingInviteCode(decoded.trim().toUpperCase());
      } catch {
        setPendingInviteCode('');
      }
    };
    Linking.getInitialURL().then(extractInviteCode).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => extractInviteCode(url));
    return () => subscription.remove();
  }, []);

  return pendingInviteCode;
}
