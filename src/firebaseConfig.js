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
