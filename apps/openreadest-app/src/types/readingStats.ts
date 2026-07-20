export interface ReadingSession {
  id: string;
  bookHash: string;
  bookTitle: string;
  startTime: number;
  endTime: number;
  duration: number; // seconds
  startPage: number;
  endPage: number;
  pagesRead: number;
}

export interface DailyReadingStats {
  date: string; // YYYY-MM-DD
  totalDuration: number; // seconds
  totalPagesRead: number;
  booksRead: string[]; // book hashes
  sessions: string[]; // session ids
}

export interface BookReadingStats {
  bookHash: string;
  bookTitle: string;
  totalDuration: number;
  totalPagesRead: number;
  sessionsCount: number;
  lastReadAt: number;
  firstReadAt: number;
  completed: boolean;
}

export interface ReadingStatsData {
  version: number;
  sessions: Record<string, ReadingSession>;
  dailyStats: Record<string, DailyReadingStats>; // date -> stats
  bookStats: Record<string, BookReadingStats>; // bookHash -> stats
  updatedAt: number;
}

export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD (Monday)
  totalDuration: number;
  totalPagesRead: number;
  booksRead: number;
  daysWithReading: number;
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalDuration: number;
  totalPagesRead: number;
  booksRead: number;
  daysWithReading: number;
}

export type StatsPeriod = 'week' | 'month' | 'year' | 'all';
