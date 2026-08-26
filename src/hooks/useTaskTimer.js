import { useCallback, useEffect, useRef, useState } from 'react';

// onFinish(taskId) — таймер 0 болоход дуудагдана.
//
// Зассан алдаанууд:
//  1) Өмнө нь onFinish-ийг setActiveTimer-ийн updater дотроос дууддаг байсан.
//     Updater pure байх ёстой; React 19 dev горимд ХОЁР удаа дуудагдаж, оноо
//     давхар нэмэгддэг байв. Одоо updater-аас ГАДНА дуудна.
//  2) Effect dependency [activeTimer?.isRunning] нь эхний onFinish closure-г
//     "хөлдөөж" байсан — одоо ref-ээр үргэлж сүүлийн хувилбарыг авна.
//  3) P2.4 TIMER DRIFT: өмнө нь setInterval tick тоолох аргаар ажилладаг байсан
//     тул OS throttle/background үед цаг нь удаширч, background-д бүр зогсдог
//     байв. Одоо үлдсэн хугацааг deadline timestamp-аас (Date.now() - start)
//     БОДОН ТОХИРУУЛНА — tick хичээн удаашралсан ч бодит цаг завсраар
//     тохирно. Background-д JS interval зогссон бол апп буцаж идэвхжихэд
//     эхний tick дээр бодит үлдэгдлийг шууд тооцоолоно.
export function useTaskTimer(onFinish) {
  const [activeTimer, setActiveTimer] = useState(null);
  const timerIntervalRef = useRef(null);
  const activeTimerRef = useRef(null);
  const deadlineRef = useRef(null); // ms epoch — төгсгөлийн бодит цаг
  const onFinishRef = useRef(onFinish);

  // Хамгийн сүүлийн onFinish-ийг ref-д байнга шинэчилж байна (stale closure-оос сэргийлнэ).
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    if (!activeTimer?.isRunning || !deadlineRef.current) {
      clearInterval(timerIntervalRef.current);
      return undefined;
    }

    timerIntervalRef.current = setInterval(() => {
      const prev = activeTimerRef.current;
      if (!prev || !prev.isRunning || !deadlineRef.current) return;

      const remainingMs = deadlineRef.current - Date.now();
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingSecs <= 0) {
        clearInterval(timerIntervalRef.current);
        deadlineRef.current = null;
        activeTimerRef.current = null;
        setActiveTimer(null);
        onFinishRef.current?.(prev.taskId);
        return;
      }

      if (remainingSecs !== prev.timeRemaining) {
        const next = { ...prev, timeRemaining: remainingSecs };
        activeTimerRef.current = next;
        setActiveTimer(next);
      }
    }, 500);

    return () => clearInterval(timerIntervalRef.current);
  }, [activeTimer?.isRunning]);

  const startTimer = useCallback((taskId, minutes) => {
    const current = activeTimerRef.current;
    if (current?.taskId === taskId && current.isRunning) {
      // Pause: одоогийн БОДИТ үлдэгдлийг хадгална
      const remainingSecs = Math.max(0, Math.ceil(((deadlineRef.current || Date.now()) - Date.now()) / 1000));
      clearInterval(timerIntervalRef.current);
      deadlineRef.current = null;
      const paused = { ...current, timeRemaining: remainingSecs, isRunning: false };
      activeTimerRef.current = paused;
      setActiveTimer(paused);
      return;
    }
    if (current?.taskId === taskId) {
      // Resume: хадгалсан үлдэгдлээс шинэ deadline
      deadlineRef.current = Date.now() + current.timeRemaining * 1000;
      const resumed = { ...current, isRunning: true };
      activeTimerRef.current = resumed;
      setActiveTimer(resumed);
      return;
    }
    const totalSecs = Math.max(1, Math.round(minutes * 60));
    deadlineRef.current = Date.now() + totalSecs * 1000;
    const fresh = { taskId, timeRemaining: totalSecs, total: totalSecs, isRunning: true };
    activeTimerRef.current = fresh;
    setActiveTimer(fresh);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerIntervalRef.current);
    deadlineRef.current = null;
    activeTimerRef.current = null;
    setActiveTimer(null);
  }, []);

  const formatTime = useCallback((secs) => `${Math.floor(secs / 60)}:${secs % 60 < 10 ? '0' : ''}${secs % 60}`, []);

  return { activeTimer, startTimer, stopTimer, formatTime };
}
