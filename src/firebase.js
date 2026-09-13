import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig, missingFirebaseKeys } from './firebaseConfig';

const hasFirebaseValue = (value) => typeof value === 'string' && value.trim() !== '' && !value.startsWith('YOUR_');
export const isFirebaseConfigured =
  hasFirebaseValue(firebaseConfig?.apiKey) &&
  hasFirebaseValue(firebaseConfig?.authDomain) &&
  hasFirebaseValue(firebaseConfig?.projectId) &&
  hasFirebaseValue(firebaseConfig?.appId);

if (!isFirebaseConfigured && missingFirebaseKeys.length > 0) {
  // Production build must clearly report missing config without exposing values.
  // Development/demo intentionally runs without Firebase (shows onboarding + demo login).
  console.warn(
    `[Firebase] Missing required env: ${missingFirebaseKeys.join(', ')}. ` +
      'Copy .env.example → .env and fill EXPO_PUBLIC_FIREBASE_* (see README).'
  );
}

let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Metro fast-refresh үед initializeAuth хоёр дахин дуудагдвал өмнөх auth-аа авна.
    auth = getAuth(app);
  }

  db = getFirestore(app);

  // Зургийн сан. storageBucket тохируулаагүй бол getStorage() шидэх тул
  // аппыг бүхэлд нь унагахгүйн тулд тусад нь барина — зураг оруулах
  // боломжгүй болохоос бусад бүх зүйл хэвийн ажиллана.
  try {
    storage = firebaseConfig?.storageBucket ? getStorage(app) : null;
  } catch (e) {
    console.warn('[Firebase] Storage тохируулагдаагүй байна:', e?.message);
    storage = null;
  }
}

export const isStorageConfigured = Boolean(storage);

export { app, auth, db, storage };
