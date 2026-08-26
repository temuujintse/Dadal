export const sanitizeInviteCode = (code) => (code || '').trim().toUpperCase().replace(/\s+/g, '');

export const generateInviteCode = () => `FAM-${Math.floor(100000 + Math.random() * 900000)}`;
