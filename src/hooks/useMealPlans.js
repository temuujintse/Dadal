import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { formatDateKey } from '../utils/dates';
import { EMPTY_PLAN, normalizePlan } from '../utils/basket';

// Өнөөдрөөс эхлэх 7 хоногийн огнооны түлхүүрүүд (2026-10-30 ...).
const nextSevenKeys = (todayKey) => {
  const [y, m, d] = todayKey.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => formatDateKey(new Date(y, m - 1, d + i)));
};

// families/{familyId}/mealPlans/{dateKey} — менежерийн сонгосон хоолны сагс.
// Гишүүд уншина, зөвхөн менежер (role parent/admin) бичнэ (FIRESTORE_RULES.txt).
export default function useMealPlans({ familyId, todayKey, isLocalDemo = false }) {
  const dateKeys = useMemo(() => (todayKey ? nextSevenKeys(todayKey) : []), [todayKey]);
  const [plans, setPlans] = useState({});
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !familyId || isLocalDemo || !dateKeys.length) return undefined;
    const unsubscribers = dateKeys.map((key) => onSnapshot(
      doc(db, 'families', familyId, 'mealPlans', key),
      (snap) => setPlans((prev) => ({ ...prev, [key]: snap.exists() ? normalizePlan(snap.data()) : EMPTY_PLAN })),
      (err) => {
        // Дүрэм deploy хийгдээгүй (permission-denied) үед 7 өдөр бүрт улаан
        // алдаа гаргахгүй — нэг удаа анхааруулаад хоосон цэс харуулна.
        setPlans((prev) => ({ ...prev, [key]: EMPTY_PLAN }));
        if (err.code === 'permission-denied') {
          if (!warnedRef.current) console.warn('mealPlans: Firestore дүрэм deploy хийгдээгүй (firebase deploy --only firestore:rules).');
          warnedRef.current = true;
          return;
        }
        console.error('Meal plan listener error:', key, err.code, err.message);
      }
    ));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [familyId, dateKeys, isLocalDemo]);

  const saveMealPlan = async (dateKey, plan) => {
    const clean = normalizePlan(plan);
    const prev = plans[dateKey];
    setPlans((current) => ({ ...current, [dateKey]: clean }));
    if (!isFirebaseConfigured || !db || !familyId || isLocalDemo) return { ok: true, local: true };
    try {
      await setDoc(doc(db, 'families', familyId, 'mealPlans', dateKey), { ...clean, dateKey, updatedAt: serverTimestamp() });
      return { ok: true };
    } catch (e) {
      console.error('Save meal plan error:', e.code, e.message);
      setPlans((current) => ({ ...current, [dateKey]: prev || EMPTY_PLAN }));
      return { ok: false, message: 'Цэсийг хадгалж чадсангүй. Firestore дүрмээ deploy хийсэн эсэхээ шалгана уу.' };
    }
  };

  return { mealPlanDateKeys: dateKeys, mealPlans: plans, saveMealPlan };
}
