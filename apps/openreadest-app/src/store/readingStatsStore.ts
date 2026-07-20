import { create } from 'zustand';
import {
  ReadingSession,
  DailyReadingStats,
  BookReadingStats,
  ReadingStatsData,
  WeeklyStats,
  MonthlyStats,
} from '@/types/readingStats';

interface ReadingStatsState {
  data: ReadingStatsData;
  activeSession: ReadingSession | null;
  isLoaded: boolean;

  // Session management
  startSession: (bookHash: string, bookTitle: string, currentPage: number) => void;
  updateSessionPage: (currentPage: number) => void;
  endSession: (currentPage: number) => void;
  cancelSession: () => void;

  // Data management
  setData: (data: ReadingStatsData) => void;
  markLoaded: () => void;
  mergeData: (remoteData: ReadingStatsData) => void;

  // Computed
  getDailyStats: (date: string) => DailyReadingStats | undefined;
  getBookStats: (bookHash: string) => BookReadingStats | undefined;
  getWeeklyStats: (date?: string) => WeeklyStats;
  getMonthlyStats: (month?: string) => MonthlyStats;
  getTotalStats: () => { totalDuration: number; totalPagesRead: number; totalBooksRead: number; totalSessions: number; streak: number };
  getRecentDailyStats: (days: number) => DailyReadingStats[];
  getAllBookStats: () => BookReadingStats[];
}

const emptyData = (): ReadingStatsData => ({
  version: 1,
  sessions: {},
  dailyStats: {},
  bookStats: {},
  updatedAt: Date.now(),
});

const getDateString = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getMonthString = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const useReadingStatsStore = create<ReadingStatsState>((set, get) => ({
  data: emptyData(),
  activeSession: null,
  isLoaded: false,

  startSession: (bookHash, bookTitle, currentPage) => {
    const session: ReadingSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bookHash,
      bookTitle,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      startPage: currentPage,
      endPage: currentPage,
      pagesRead: 0,
    };
    set({ activeSession: session });
  },

  updateSessionPage: (currentPage) => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({
      activeSession: {
        ...activeSession,
        endPage: currentPage,
        pagesRead: Math.max(0, currentPage - activeSession.startPage),
      },
    });
  },

  endSession: (currentPage) => {
    const { activeSession, data } = get();
    if (!activeSession) return;

    const now = Date.now();
    const duration = Math.max(1, Math.round((now - activeSession.startTime) / 1000));
    const pagesRead = Math.max(0, currentPage - activeSession.startPage);
    const dateStr = getDateString(activeSession.startTime);

    const completed: ReadingSession = {
      ...activeSession,
      endTime: now,
      duration,
      endPage: currentPage,
      pagesRead,
    };

    // Update sessions
    const newSessions = { ...data.sessions, [completed.id]: completed };

    // Update daily stats
    const existingDaily = data.dailyStats[dateStr];
    const dailyBooksRead = existingDaily
      ? existingDaily.booksRead.includes(completed.bookHash)
        ? existingDaily.booksRead
        : [...existingDaily.booksRead, completed.bookHash]
      : [completed.bookHash];
    const dailySessions = existingDaily
      ? [...existingDaily.sessions, completed.id]
      : [completed.id];

    const newDaily = {
      ...data.dailyStats,
      [dateStr]: {
        date: dateStr,
        totalDuration: (existingDaily?.totalDuration ?? 0) + duration,
        totalPagesRead: (existingDaily?.totalPagesRead ?? 0) + pagesRead,
        booksRead: dailyBooksRead,
        sessions: dailySessions,
      },
    };

    // Update book stats
    const existingBook = data.bookStats[completed.bookHash];
    const newBookStats = {
      ...data.bookStats,
      [completed.bookHash]: {
        bookHash: completed.bookHash,
        bookTitle: completed.bookTitle,
        totalDuration: (existingBook?.totalDuration ?? 0) + duration,
        totalPagesRead: (existingBook?.totalPagesRead ?? 0) + pagesRead,
        sessionsCount: (existingBook?.sessionsCount ?? 0) + 1,
        lastReadAt: now,
        firstReadAt: existingBook?.firstReadAt ?? now,
        completed: existingBook?.completed ?? false,
      },
    };

    const newData: ReadingStatsData = {
      ...data,
      sessions: newSessions,
      dailyStats: newDaily,
      bookStats: newBookStats,
      updatedAt: now,
    };

    set({ data: newData, activeSession: null });
  },

  cancelSession: () => {
    set({ activeSession: null });
  },

  setData: (data) => set({ data, isLoaded: true }),
  markLoaded: () => set({ isLoaded: true }),

  mergeData: (remoteData) => {
    const { data: local } = get();
    if (remoteData.updatedAt <= local.updatedAt) return;

    // Merge: remote wins for same version, union of sessions
    const merged: ReadingStatsData = {
      version: Math.max(local.version, remoteData.version),
      sessions: { ...local.sessions, ...remoteData.sessions },
      dailyStats: { ...local.dailyStats },
      bookStats: { ...local.bookStats },
      updatedAt: Math.max(local.updatedAt, remoteData.updatedAt),
    };

    // Merge daily stats
    for (const [date, remoteDaily] of Object.entries(remoteData.dailyStats)) {
      const localDaily = local.dailyStats[date];
      if (!localDaily) {
        merged.dailyStats[date] = remoteDaily;
      } else {
        merged.dailyStats[date] = {
          date,
          totalDuration: Math.max(localDaily.totalDuration, remoteDaily.totalDuration),
          totalPagesRead: Math.max(localDaily.totalPagesRead, remoteDaily.totalPagesRead),
          booksRead: [...new Set([...localDaily.booksRead, ...remoteDaily.booksRead])],
          sessions: [...new Set([...localDaily.sessions, ...remoteDaily.sessions])],
        };
      }
    }

    // Merge book stats
    for (const [hash, remoteBook] of Object.entries(remoteData.bookStats)) {
      const localBook = local.bookStats[hash];
      if (!localBook) {
        merged.bookStats[hash] = remoteBook;
      } else {
        merged.bookStats[hash] = {
          ...remoteBook,
          totalDuration: Math.max(localBook.totalDuration, remoteBook.totalDuration),
          totalPagesRead: Math.max(localBook.totalPagesRead, remoteBook.totalPagesRead),
          sessionsCount: Math.max(localBook.sessionsCount, remoteBook.sessionsCount),
          lastReadAt: Math.max(localBook.lastReadAt, remoteBook.lastReadAt),
          firstReadAt: Math.min(localBook.firstReadAt, remoteBook.firstReadAt),
        };
      }
    }

    set({ data: merged });
  },

  getDailyStats: (date) => get().data.dailyStats[date],

  getBookStats: (bookHash) => get().data.bookStats[bookHash],

  getWeeklyStats: (dateStr) => {
    const { data } = get();
    const refDate = dateStr ? new Date(dateStr) : new Date();
    const monday = getMonday(refDate);
    const mondayStr = getDateString(monday.getTime());

    let totalDuration = 0;
    let totalPagesRead = 0;
    let booksRead = new Set<string>();
    let daysWithReading = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const ds = getDateString(d.getTime());
      const daily = data.dailyStats[ds];
      if (daily) {
        totalDuration += daily.totalDuration;
        totalPagesRead += daily.totalPagesRead;
        daily.booksRead.forEach((b) => booksRead.add(b));
        daysWithReading++;
      }
    }

    return {
      weekStart: mondayStr,
      totalDuration,
      totalPagesRead,
      booksRead: booksRead.size,
      daysWithReading,
    };
  },

  getMonthlyStats: (monthStr) => {
    const { data } = get();
    const now = new Date();
    const month = monthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalDuration = 0;
    let totalPagesRead = 0;
    let booksRead = new Set<string>();
    let daysWithReading = 0;

    for (const [date, daily] of Object.entries(data.dailyStats)) {
      if (date.startsWith(month)) {
        totalDuration += daily.totalDuration;
        totalPagesRead += daily.totalPagesRead;
        daily.booksRead.forEach((b) => booksRead.add(b));
        daysWithReading++;
      }
    }

    return {
      month,
      totalDuration,
      totalPagesRead,
      booksRead: booksRead.size,
      daysWithReading,
    };
  },

  getTotalStats: () => {
    const { data } = get();
    let totalDuration = 0;
    let totalPagesRead = 0;
    const bookSet = new Set<string>();
    let totalSessions = Object.keys(data.sessions).length;

    for (const daily of Object.values(data.dailyStats)) {
      totalDuration += daily.totalDuration;
      totalPagesRead += daily.totalPagesRead;
      daily.booksRead.forEach((b) => bookSet.add(b));
    }

    // Calculate reading streak
    let streak = 0;
    const today = getDateString(Date.now());
    const checkDate = new Date();
    // Check if read today first
    if (data.dailyStats[today]) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const ds = getDateString(checkDate.getTime());
        if (data.dailyStats[ds]) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      // Check if read yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterday = getDateString(checkDate.getTime());
      if (data.dailyStats[yesterday]) {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
        while (true) {
          const ds = getDateString(checkDate.getTime());
          if (data.dailyStats[ds]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return {
      totalDuration,
      totalPagesRead,
      totalBooksRead: bookSet.size,
      totalSessions,
      streak,
    };
  },

  getRecentDailyStats: (days) => {
    const { data } = get();
    const result: DailyReadingStats[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = getDateString(d.getTime());
      const stats = data.dailyStats[ds];
      result.push(
        stats || {
          date: ds,
          totalDuration: 0,
          totalPagesRead: 0,
          booksRead: [],
          sessions: [],
        },
      );
    }
    return result;
  },

  getAllBookStats: () => {
    return Object.values(get().data.bookStats).sort((a, b) => b.totalDuration - a.totalDuration);
  },
}));
