// Firebase төслийнхөө тохиргоог `.env` файлаас уншина (`.env.example`-ийг хуулж бөглөнө).
// Firebase Console > Project Settings > General > Your apps > SDK setup and configuration
// Веб хувилбарынхаа яг ижил config-ыг энд хуулж болно — Firestore project ижил байх учиртай.
//
// Санамж: эдгээр утгууд нь `EXPO_PUBLIC_` угтвартай тул client bundle дотор харагддаг.
// Firebase web config (apiKey гэх мэт) угаасаа нууц биш ч, аюулгүй байдал нь бүрэн
// Firestore Security Rules (`FIRESTORE_RULES.txt`) дээр тулгуурладаг гэдгийг анхаарна уу.
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

// Firestore доторх document замыг тодорхойлох app id (веб хувилбартай адилхан утга байх ёстой,
// эс тэгвэл веб апп болон RN апп өөр өөр document уншиж/бичинэ)
export const appId = process.env.EXPO_PUBLIC_FIREBASE_DOC_APP_ID ?? 'family-habit-app';

// Production-safe validation: which required EXPO_PUBLIC_FIREBASE_* keys are missing.
// Never logs values, only key names. Used by firebase.js and AuthContext for user-visible errors.
// Development/demo behavior remains intentional — missing config simply disables Firebase (isFirebaseConfigured=false).
const REQUIRED_FIREBASE_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];
export const missingFirebaseKeys = REQUIRED_FIREBASE_KEYS.filter((key) => {
  // eslint-disable-next-line expo/no-dynamic-env-var -- key list is static, safe to iterate
  const v = process.env[key];
  return typeof v !== 'string' || v.trim() === '' || v.startsWith('YOUR_');
});
export const googleOAuthKeys = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
};
