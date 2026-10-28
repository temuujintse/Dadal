import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext(null);

const authErrorText = (code) => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Энэ email-ээр account аль хэдийн бүртгэгдсэн байна. Нэвтрэх хэсгээр орно уу.';
    case 'auth/invalid-email':
      return 'Email хаяг буруу байна.';
    case 'auth/weak-password':
      return 'Нууц үг хэт сул байна. 6-аас дээш тэмдэгт ашиглана уу.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email эсвэл нууц үг буруу байна.';
    case 'auth/too-many-requests':
      return 'Оролдлого хэт олон удаа амжилтгүй боллоо. Түр хүлээгээд дахин оролдоно уу.';
    case 'auth/network-request-failed':
      return 'Сүлжээний алдаа. Интернэт холболтоо шалгана уу.';
    case 'auth/operation-not-allowed':
      return 'Email/Password нэвтрэх арга Firebase Console дээр асаагаагүй байна (Authentication > Sign-in method).';
    default:
      return `Алдаа гарлаа${code ? ` (${code})` : ''}. Дахин оролдоно уу.`;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setFirebaseError('Firebase config хийгдээгүй байна. firebaseConfig.js дээр config оруулна уу.');
      setAuthReady(true);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      // Auth төлөв шилжих бүрд хуучин алдааны мессежийг цэвэрлэнэ — өгүүлбэр:
      // унасан login-ийн "Нууц үг буруу" мессеж дараагийн амжилттай нэвтрэлт/
      // logout-ын дараа ч дэлгэцэнд наалддаг байв.
      if (u) setAuthError(null);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    if (!isFirebaseConfigured || !auth) return setAuthError('Firebase config эхлээд холбоно уу.');
    setAuthError(null);
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (e) { setAuthError(authErrorText(e.code)); }
  };

  const handleRegister = async (email, password) => {
    if (!isFirebaseConfigured || !auth) return setAuthError('Firebase config эхлээд холбоно уу.');
    setAuthError(null);
    try { await createUserWithEmailAndPassword(auth, email, password); }
    catch (e) { setAuthError(authErrorText(e.code)); }
  };

  const handleGuestLogin = async () => {
    if (!isFirebaseConfigured || !auth) {
      // Dev-д Firebase config байхгүй үед ч дэлгэцүүдийг үзэж засварлах
      // боломжтой локал demo хэрэглэгч (өгөгдөл зөвхөн санах ойд).
      if (__DEV__) {
        setFirebaseError(null);
        setUser({ uid: 'local-demo-user', isAnonymous: true, isLocalDemo: true, email: null });
        return undefined;
      }
      return setAuthError('Firebase config эхлээд холбоно уу.');
    }
    setAuthError(null);
    try { await signInAnonymously(auth); }
    catch (e) { setAuthError(`${e.code || 'auth/error'}: Anonymous provider асаасан эсэхээ шалгана уу.`); }
  };

  const handleGoogleLogin = async ({ idToken, accessToken }) => {
    if (!isFirebaseConfigured || !auth) return setAuthError('Firebase config эхлээд холбоно уу.');
    setAuthError(null);
    try {
      const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
      await signInWithCredential(auth, credential);
    } catch (e) {
      setAuthError(authErrorText(e.code));
      throw e;
    }
  };

  const handleAppleLogin = async ({ identityToken, nonce }) => {
    if (!isFirebaseConfigured || !auth) return setAuthError('Firebase config эхлээд холбоно уу.');
    setAuthError(null);
    try {
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
      await signInWithCredential(auth, credential);
    } catch (e) {
      setAuthError(authErrorText(e.code));
      throw e;
    }
  };

  const handleSignOut = async () => {
    if (isFirebaseConfigured && auth) {
      setAuthError(null);
      await signOut(auth);
    } else {
      setUser(null);
    }
  };

  const value = {
    user,
    authReady,
    firebaseError,
    authError,
    setAuthError,
    handleLogin,
    handleRegister,
    handleGuestLogin,
    handleGoogleLogin,
    handleAppleLogin,
    handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
