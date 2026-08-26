import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

const hasFirebaseValue = (value) => typeof value === 'string' && value.trim() !== '' && !value.startsWith('YOUR_');
export const isFirebaseConfigured =
  hasFirebaseValue(firebaseConfig?.apiKey) &&
  hasFirebaseValue(firebaseConfig?.authDomain) &&
  hasFirebaseValue(firebaseConfig?.projectId) &&
  hasFirebaseValue(firebaseConfig?.appId);

let app = null;
let auth = null;
let db = null;

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
}

export { app, auth, db };
