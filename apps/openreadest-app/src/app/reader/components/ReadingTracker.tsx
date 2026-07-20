'use client';

import { useEffect, useRef } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useReadingStatsStore } from '@/store/readingStatsStore';
import { saveReadingStats } from '@/services/readingStatsService';

interface ReadingTrackerProps {
  bookKey: string;
  bookTitle: string;
  currentPage: number;
}

const ReadingTracker: React.FC<ReadingTrackerProps> = ({ bookKey, bookTitle, currentPage }) => {
  const { appService } = useEnv();
  const { startSession, updateSessionPage, endSession } = useReadingStatsStore();
  const sessionStartedRef = useRef(false);
  const bookHashRef = useRef(bookKey.split('-')[0]);

  useEffect(() => {
    const bookHash = bookHashRef.current;
    if (!sessionStartedRef.current && bookHash) {
      startSession(bookHash, bookTitle, currentPage);
      sessionStartedRef.current = true;
    }

    return () => {
      if (sessionStartedRef.current && appService) {
        endSession(currentPage);
        sessionStartedRef.current = false;
        saveReadingStats(appService).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey]);

  useEffect(() => {
    if (sessionStartedRef.current && currentPage > 0) {
      updateSessionPage(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return null;
};

export default ReadingTracker;
