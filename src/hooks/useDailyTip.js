import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTipForDayOfYear } from '../constants/healthTips';

const LAST_SHOWN_KEY = 'familyHabitLastTipShownDate';

const getDayOfYear = (date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diffMs = date - start;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

// useOnboarding.js-тэй ижил хэлбэр: AsyncStorage-д сүүлд ХАРУУЛСАН огноог
// хадгалаад, тухайн өдөр аль хэдийн харуулсан бол дахин ГАРГАХГҮЙ. Апп
// нээх бүрд шалгадаг тул "өглөө болгон" гэдгийг яг тоймоор биелүүлнэ —
// хэрэглэгч апп-аа өдөрт хэдэн ч удаа нээсэн зөвлөгөө ЗӨВХӨН нэг л удаа гарна.
export function useDailyTip() {
  const [tip, setTip] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const today = new Date();
        const todayKey = today.toDateString();
        const lastShown = await AsyncStorage.getItem(LAST_SHOWN_KEY);
        if (!mounted) return;
        if (lastShown !== todayKey) {
          setTip(getTipForDayOfYear(getDayOfYear(today)));
          setVisible(true);
        }
      } catch {
        // AsyncStorage амжилтгүй бол зөвлөмжийг зүгээр л алгасна — энэ
        // feature шүтэлцээтэй биш тул апп-ын үндсэн ажиллагаанд нөлөөлөхгүй.
      }
    })();
    return () => { mounted = false; };
  }, []);

  const dismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(LAST_SHOWN_KEY, new Date().toDateString());
    } catch {
      // хадгалагдаагүй ч дараагийн апп нээлтэд дахин харуулах нь том асуудал биш
    }
  };

  return { tip, visible, dismiss };
}
