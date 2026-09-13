import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

// EAS Update-ийг АВТОМАТААР татаж, шууд суулгана.
//
// АСУУДАЛ: AndroidManifest дээр `EXPO_UPDATES_LAUNCH_WAIT_MS = 0` тул апп нь
// шинэчлэлтийг НЭЭГДЭХ үедээ хүлээдэггүй — арын дэвсгэрт татаад, ДАРААГИЙН
// удаа нээхэд л хэрэглэдэг. Тиймээс хэрэглэгч `eas update` хийчихээд аппаа
// нээхэд "юу ч өөрчлөгдөөгүй" мэт харагддаг (үнэндээ таталт болсон ч
// хэрэглэгдээгүй байгаа). Аппыг БҮРЭН хааж, дахин 2 удаа нээж байж л гарч
// ирдэг — үүнийг хэн ч мэдэхгүй.
//
// ШИЙДЭЛ: апп нээгдэх бүрд болон арын дэвсгэрээс буцаж ирэх бүрд шинэчлэлт
// байгаа эсэхийг шалгаад, байвал татаад ШУУД reload хийнэ.
//
// Аюулгүй байдал:
//  - `__DEV__` буюу Expo Go / dev server дээр ОГТ ажиллахгүй (Updates.isEnabled
//    false байна) — хөгжүүлэлтийн урсгалыг эвдэхгүй.
//  - Сүлжээгүй/алдаа гарвал чимээгүй өнгөрнө — апп хэвийн үргэлжилнэ.
//  - Нэг удаад зөвхөн НЭГ шалгалт явна (давхардсан reload-оос сэргийлнэ).
export function useAppUpdates() {
  const [checking, setChecking] = useState(false);
  const busyRef = useRef(false);

  const runCheck = useCallback(async () => {
    // Dev горимд эсвэл expo-updates идэвхгүй build дээр алгасна.
    if (__DEV__ || !Updates.isEnabled || busyRef.current) return;
    busyRef.current = true;
    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result?.isAvailable) {
        await Updates.fetchUpdateAsync();
        // reloadAsync нь аппыг шинэ bundle-аар дахин эхлүүлнэ. Энэ мөрийн
        // дараах код ажиллахгүй тул busyRef-ээ эргүүлэх шаардлагагүй.
        await Updates.reloadAsync();
        return;
      }
    } catch (e) {
      // Сүлжээ тасарсан, сервер хариу өгөөгүй гэх мэт — энэ нь эгзэгтэй биш.
      console.warn('[Updates] шалгах үед алдаа:', e?.message);
    } finally {
      busyRef.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') runCheck();
    });
    return () => subscription?.remove();
  }, [runCheck]);

  return { checking, checkNow: runCheck };
}
