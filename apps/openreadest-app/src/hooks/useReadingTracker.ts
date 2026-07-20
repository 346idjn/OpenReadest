import { useEffect, useRef, useCallback } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useReadingStatsStore } from '@/store/readingStatsStore';
import { saveReadingStats } from '@/services/readingStatsService';

export const useReadingTracker = (bookKey: string, bookTitle: string, currentPage: number) => {
  const { appService } = useEnv();
  const { startSession, updateSessionPage, endSession, cancelSession, activeSession } =
    useReadingStatsStore();
  const isActiveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveRef = useRef<number>(0);

  // Start tracking when the book is opened
  useEffect(() => {
    if (!bookKey || !appService) return;
    const bookHash = bookKey;
    startSession(bookHash, bookTitle, currentPage || 0);
    isActiveRef.current = true;

    // Periodically save stats to disk (every 30 seconds)
    saveTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastSaveRef.current > 25000 && isActiveRef.current) {
        lastSaveRef.current = now;
        saveReadingStats(appService).catch(() => {});
      }
    }, 30000);

    // Save on page visibility change (tab hidden = save)
    const handleVisibility = () => {
      if (document.hidden && isActiveRef.current) {
        saveReadingStats(appService).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isActiveRef.current = false;
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey]);

  // Update page tracking
  useEffect(() => {
    if (currentPage > 0 && isActiveRef.current) {
      updateSessionPage(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Cleanup: end session when component unmounts
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        endSession(currentPage || 0);
        isActiveRef.current = false;
        if (appService) {
          saveReadingStats(appService).catch(() => {});
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
