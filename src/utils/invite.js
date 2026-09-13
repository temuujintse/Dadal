export const sanitizeInviteCode = (code) => (code || '').trim().toUpperCase().replace(/\s+/g, '');

// Шинэ кодууд 12 тэмдэгт alphanumeric (FAM- + 12) → ~4.7e18 хослол, brute-force эсэргүүцэл өндөр.
// Хуучин FAM-123456 (6 орон) кодууд DB-д хэвээр хүчинтэй — шинэ генерац нь зөвхөн
// ШИНЭ гэр бүлүүдэд нөлөөлнө, хуучин линк тасрахгүй.
export const generateInviteCode = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 12; i += 1) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `FAM-${suffix}`;
};
