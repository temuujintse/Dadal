import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Application from 'expo-application';
import { Mail, Lock, LogIn, Users, Eye, EyeOff, Globe, Apple } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ onEmailContinue, onResetPassword, onGuest, onGoogle, onApple, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');

  // expo-auth-session v7 (SDK 54)-д Expo-ийн OAuth proxy бүрэн хасагдсан тул
  // Expo Go дотор Google нэвтрэлт ажиллахгүй — зөвхөн development/production
  // build дээр л ажиллана (docs.expo.dev/guides/authentication).
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  const googleIds = useMemo(() => ({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  }), []);

  // Native build дээр ашиглах ЯВЦУУ redirect URI:
  // - iOS: Google нь iOS client-д зөвхөн reverse-client-ID scheme (`com.googleusercontent.apps.<id>:/…`)
  //   зөвшөөрдөг тул iosClientId-аэс автоматаар гаргаж авна.
  // - Android: package-scheme `<applicationId>:/oauthredirect` — Android client-ын
  //   package name таарвал Google авто зөвшөөрдөг. Intent filter-ийг app.config.js
  //   дээр бүртгэсэн.
  // - Web: default (window.location-д суурилсан) URI-г хэвээр нь үлдээнэ.
  const googleRedirectUri = useMemo(() => {
    if (Platform.OS === 'web') return undefined;
    if (Platform.OS === 'ios') {
      const rawIosId = googleIds.iosClientId || '';
      const numericId = rawIosId.replace(/\.apps\.googleusercontent\.com$/, '');
      if (numericId && numericId !== rawIosId) {
        return `com.googleusercontent.apps.${numericId}:/oauthredirect`;
      }
    }
    return `${Application.applicationId}:/oauthredirect`;
  }, [googleIds]);

  // Google товчийг харуулах эсэхийг ЯГ ЭНЭ ПЛАТФОРМД хэрэглэгдэх client id-аар
  // шийднэ. Өмнө нь дурын нэг id байхад л `true` буцаадаг байсан тул жишээ нь
  // зөвхөн web id тохируулсан үед iOS дээр товч гарч ирээд, Google нь
  // `familyhabit://` redirect-ийг Web төрлийн client-д зөвшөөрдөггүй учир
  // ойлгомжгүй алдаагаар унадаг байв.
  const platformClientId = Platform.select({
    ios: googleIds.iosClientId,
    android: googleIds.androidClientId,
    default: googleIds.webClientId,
  });
  const googleConfigured = Boolean(platformClientId) && !isExpoGo;

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    ...googleIds,
    // useAuthRequest нь clientId дутуу үед шууд throw хийдэг тул сүүлийн
    // нөөц утга үлдээв — товч нь googleConfigured-аар аль хэдийн нуугдсан байна.
    clientId: platformClientId || googleIds.webClientId || 'GOOGLE_CLIENT_ID_NOT_CONFIGURED',
    scopes: ['openid', 'profile', 'email'],
    // Multi-account хэрэглэгч бүрт account сонгох цонхыг албадан гаргана
    // (prompt=select_account). Үгүй бол browser-ийн өмнөх session-д хольцолгоно.
    selectAccount: true,
    redirectUri: googleRedirectUri,
  });

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  // onGoogle prop нь AuthProvider render бүрт шинэ identity-тэй байдаг тул
  // доорх effect-ийн dependency-д шууд оруулбал success response ирсэн ч
  // дахин дахин fire болох (effect replay) асуудал үүснэ. Тиймээс хамгийн
  // сүүлийн callback-ийг ref-ээр дамжуулж, effect зөвхөн response өөрчлөгдөхөд
  // НЭГ удаа ажилладаг болгов.
  const onGoogleRef = useRef(onGoogle);
  useEffect(() => {
    onGoogleRef.current = onGoogle;
  }, [onGoogle]);

  const processedGoogleResponseRef = useRef(null);
  useEffect(() => {
    if (!googleResponse) return;
    // Ижил response объектыг хоёр удаа боловсруулахыг хамгаална.
    if (processedGoogleResponseRef.current === googleResponse) return;
    processedGoogleResponseRef.current = googleResponse;

    if (googleResponse.type === 'error') {
      const detail = googleResponse.error?.message || '';
      setLocalError(
        `Google нэвтрэлт амжилтгүй боллоо${detail ? ` (${detail})` : ''}. Redirect URI болон OAuth client ID тохиргоогоо шалгана уу.`
      );
      return;
    }

    // Хэрэглэгч өөрөө цонх хаасан (dismissed/cancel) бол алдаа гэж үзэхгүй,
    // чимээгүй орхино — Apple урсгалтай ижил зан үйл.
    if (googleResponse.type !== 'success') return;

    const idToken = googleResponse.authentication?.idToken || googleResponse.params?.id_token || null;
    const accessToken = googleResponse.authentication?.accessToken || googleResponse.params?.access_token || null;
    if (!idToken && !accessToken) {
      setLocalError('Google token авч чадсангүй. OAuth client тохиргоогоо шалгана уу.');
      return;
    }
    setBusy(true);
    Promise.resolve(onGoogleRef.current?.({ idToken, accessToken }))
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [googleResponse]);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Нэг товч: бүртгэлтэй бол нэвтэрнэ, үгүй бол автоматаар бүртгэнэ (AuthContext).
  const submit = async () => {
    setLocalError('');
    setNotice('');
    if (!emailLooksValid) return setLocalError('Email хаягаа зөв бичнэ үү.');
    if (password.length < 6) return setLocalError('Нууц үг 6-аас дээш тэмдэгттэй байх ёстой.');
    if (busy) return;
    setBusy(true);
    try {
      await onEmailContinue?.(email.trim(), password);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setLocalError('');
    setNotice('');
    if (!emailLooksValid) return setLocalError('Эхлээд email хаягаа бичнэ үү.');
    const result = await onResetPassword?.(email.trim());
    if (result?.ok) setNotice(`${email.trim()} хаяг руу нууц үг сэргээх холбоос илгээлээ.`);
    else setLocalError(result?.message || 'Илгээж чадсангүй.');
  };

  const handleGoogle = async () => {
    setLocalError('');
    if (isExpoGo) {
      // OAuth proxy SDK 53+ дээр хасагдсан тул Expo Go-оор Google нэвтрэх боломжгүй.
      setLocalError('Expo Go дээр Google нэвтрэлт ажиллахгүй. Development build ашиглана уу (SOCIAL_AUTH_SETUP.md).');
      return;
    }
    if (!googleConfigured) {
      setLocalError('Google OAuth client ID тохируулаагүй байна. SOCIAL_AUTH_SETUP.md файлыг дагана уу.');
      return;
    }
    if (!googleRequest || busy) return;
    setBusy(true);
    try {
      await promptGoogle();
    } catch {
      setLocalError('Google нэвтрэлтийн цонх нээгдсэнгүй. Дахин оролдоно уу.');
    } finally {
      setBusy(false);
    }
  };

  const handleApple = async () => {
    if (!appleAvailable || busy) return;
    setLocalError('');
    setBusy(true);
    try {
      const bytes = await Crypto.getRandomBytesAsync(24);
      const rawNonce = Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('');
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new Error('Apple identity token missing');
      await onApple?.({ identityToken: credential.identityToken, nonce: rawNonce });
    } catch (e) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') setLocalError('Apple ID нэвтрэлт амжилтгүй боллоо. Firebase provider тохиргоог шалгана уу.');
    } finally {
      setBusy(false);
    }
  };

  const displayError = localError || error;

  const submitDisabled = busy || !email.trim() || password.length < 6;

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf5]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-[28px] bg-orange-500 items-center justify-center mb-4">
              <Users size={38} color="#fff" strokeWidth={2.5} />
            </View>
            <Text className="text-[31px] font-black text-gray-950 text-center leading-9">Дадал</Text>
            <Text className="text-sm font-semibold text-gray-500 text-center mt-2 leading-5 px-4">Email, нууц үгээ бичээд үргэлжлүүлээрэй. Шинэ бол автоматаар бүртгэнэ.</Text>
          </View>

          <View className="bg-white border border-orange-100 rounded-[28px] p-4 gap-3">
            <View className="flex-row items-center bg-[#fffaf5] border border-orange-100 rounded-2xl px-3"><Mail size={18} color="#fb923c" /><TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#94a3b8" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" keyboardType="email-address" returnKeyType="next" className="flex-1 p-3 text-sm font-bold text-gray-900" /></View>
            <View className="flex-row items-center bg-[#fffaf5] border border-orange-100 rounded-2xl px-3"><Lock size={18} color="#fb923c" /><TextInput value={password} onChangeText={setPassword} onSubmitEditing={submit} placeholder="Нууц үг (6+ тэмдэгт)" placeholderTextColor="#94a3b8" secureTextEntry={!showPassword} autoComplete="password" textContentType="password" returnKeyType="go" className="flex-1 p-3 text-sm font-bold text-gray-900" /><TouchableOpacity onPress={() => setShowPassword((v) => !v)} accessibilityLabel={showPassword ? 'Нууц үг нуух' : 'Нууц үг харах'} className="p-2">{showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}</TouchableOpacity></View>
            {displayError ? <Text className="text-xs font-bold text-red-500 leading-5">{displayError}</Text> : null}
            {notice ? <Text className="text-xs font-bold text-green-600 leading-5">{notice}</Text> : null}
            <TouchableOpacity onPress={submit} disabled={submitDisabled} className="bg-orange-500 py-4 rounded-2xl items-center flex-row justify-center gap-2" style={{ opacity: submitDisabled ? 0.5 : 1 }}>
              {busy ? <ActivityIndicator color="#fff" /> : <LogIn size={18} color="#fff" />}
              <Text className="text-white font-black">Үргэлжлүүлэх</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetPassword} className="items-center py-1"><Text className="text-xs font-black text-gray-400">Нууц үгээ мартсан</Text></TouchableOpacity>
          </View>

          <View className="flex-row items-center my-5"><View className="flex-1 h-px bg-gray-200" /><Text className="mx-3 text-xs font-black text-gray-400">эсвэл</Text><View className="flex-1 h-px bg-gray-200" /></View>

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={handleGoogle} disabled={busy} className="flex-1 bg-white border border-gray-200 rounded-2xl py-3.5 flex-row items-center justify-center gap-2">
              <Globe size={18} color="#f97316" /><Text className="text-sm font-black text-gray-900">Google</Text>
            </TouchableOpacity>
            {appleAvailable ? (
              <TouchableOpacity onPress={handleApple} disabled={busy} className="flex-1 bg-gray-950 rounded-2xl py-3.5 flex-row items-center justify-center gap-2">
                <Apple size={18} color="#fff" fill="#fff" /><Text className="text-sm font-black text-white">Apple</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity onPress={onGuest} className="items-center py-4 mt-2"><Text className="text-xs font-black text-gray-400">Demo байдлаар үзэх</Text></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
