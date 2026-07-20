'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useReadingStatsStore } from '@/store/readingStatsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useEnv } from '@/context/EnvContext';
import { loadReadingStats } from '@/services/readingStatsService';
import { StatsPeriod } from '@/types/readingStats';

interface ReadingStatsWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`;
  }
  return `${minutes}分钟`;
};

const formatDurationShort = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
};

const formatDateShort = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatDateWeekday = (dateStr: string): string => {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} 周${weekdays[d.getDay()]}`;
};

const ReadingStatsWindow: React.FC<ReadingStatsWindowProps> = ({ isOpen, onClose }) => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const {
    data,
    isLoaded,
    setData,
    getRecentDailyStats,
    getWeeklyStats,
    getMonthlyStats,
    getTotalStats,
    getAllBookStats,
  } = useReadingStatsStore();

  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [chartDays, setChartDays] = useState(7);

  useEffect(() => {
    if (isOpen && !isLoaded && appService) {
      loadReadingStats(appService).then((loaded) => {
        if (loaded) setData(loaded);
        else useReadingStatsStore.getState().markLoaded();
      });
    }
  }, [isOpen, isLoaded, appService, setData]);

  useEffect(() => {
    setChartDays(period === 'week' ? 7 : period === 'month' ? 30 : period === 'year' ? 365 : 30);
  }, [period]);

  const totalStats = useMemo(() => getTotalStats(), [data]);
  const weeklyStats = useMemo(() => getWeeklyStats(), [data]);
  const monthlyStats = useMemo(() => getMonthlyStats(), [data]);
  const dailyStatsData = useMemo(() => getRecentDailyStats(chartDays), [data, chartDays]);
  const bookStats = useMemo(() => getAllBookStats().slice(0, 10), [data]);

  const maxDailyDuration = useMemo(
    () => Math.max(1, ...dailyStatsData.map((d) => d.totalDuration)),
    [dailyStatsData],
  );

  const maxBookDuration = useMemo(
    () => Math.max(1, ...bookStats.map((b) => b.totalDuration)),
    [bookStats],
  );

  if (!isOpen) return null;

  const periods: { key: StatsPeriod; label: string }[] = [
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
    { key: 'all', label: '全部' },
  ];

  const hasData = totalStats.totalSessions > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-base-100 rounded-2xl shadow-2xl w-[90vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
          <h2 className="text-xl font-bold">{_('Reading Statistics')}</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label={_('Close')}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-16 text-base-content/50">
              <svg className="w-20 h-20 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" />
              </svg>
              <p className="text-lg">{_('No reading data yet')}</p>
              <p className="text-sm mt-1">{_('Start reading to track your statistics')}</p>
            </div>
          ) : (
            <>
              {/* Total Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label={_('Total Reading Time')}
                  value={formatDuration(totalStats.totalDuration)}
                  icon="⏱"
                />
                <StatCard
                  label={_('Books Read')}
                  value={String(totalStats.totalBooksRead)}
                  icon="📚"
                />
                <StatCard
                  label={_('Pages Read')}
                  value={String(totalStats.totalPagesRead)}
                  icon="📄"
                />
                <StatCard
                  label={_('Reading Streak')}
                  value={`${totalStats.streak} ${_('days')}`}
                  icon="🔥"
                  highlight={totalStats.streak > 0}
                />
              </div>

              {/* Period selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-base-content/70">{_('Period')}:</span>
                <div className="join">
                  {periods.map((p) => (
                    <button
                      key={p.key}
                      className={`join-item btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPeriod(p.key)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Reading Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-base-content/70">
                  {_('Daily Reading Time')}
                </h3>
                <div className="bg-base-200 rounded-xl p-4">
                  <div className="flex items-end gap-1 h-32">
                    {dailyStatsData.map((day) => {
                      const heightPct = maxDailyDuration > 0 ? (day.totalDuration / maxDailyDuration) * 100 : 0;
                      const isToday = day.date === new Date().toISOString().slice(0, 10);
                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          <div className="tooltip tooltip-top" data-tip={`${formatDateShort(day.date)}: ${formatDurationShort(day.totalDuration)}`}>
                            <div
                              className={`w-full max-w-[32px] rounded-t transition-all duration-300 ${
                                isToday
                                  ? 'bg-primary'
                                  : day.totalDuration > 0
                                    ? 'bg-primary/60 hover:bg-primary/80'
                                    : 'bg-base-300'
                              }`}
                              style={{ height: `${Math.max(heightPct, 2)}%` }}
                            />
                          </div>
                          {chartDays <= 14 && (
                            <span className="text-[10px] text-base-content/50 mt-1 truncate w-full text-center">
                              {formatDateShort(day.date)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {chartDays > 14 && (
                    <div className="flex justify-between mt-1 text-[10px] text-base-content/40">
                      <span>{formatDateShort(dailyStatsData[0]?.date || '')}</span>
                      <span>{formatDateShort(dailyStatsData[dailyStatsData.length - 1]?.date || '')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Weekly & Monthly Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-base-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-2 text-base-content/70">{_('This Week')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{_('Reading Time')}</span>
                      <span className="text-sm font-semibold">{formatDuration(weeklyStats.totalDuration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">{_('Pages')}</span>
                      <span className="text-sm font-semibold">{weeklyStats.totalPagesRead}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">{_('Days Read')}</span>
                      <span className="text-sm font-semibold">{weeklyStats.daysWithReading}/7</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">{_('Books')}</span>
                      <span className="text-sm font-semibold">{weeklyStats.booksRead}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-base-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-2 text-base-content/70">{_('This Month')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{_('Reading Time')}</span>
                      <span className="text-sm font-semibold">{formatDuration(monthlyStats.totalDuration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">{_('Pages')}</span>
                      <span className="text-sm font-semibold">{monthlyStats.totalPagesRead}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">{_('Days Read')}</span>
                      <span className="text-sm font-semibold">{monthlyStats.daysWithReading}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">{_('Books')}</span>
                      <span className="text-sm font-semibold">{monthlyStats.booksRead}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Book Ranking */}
              {bookStats.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-base-content/70">
                    {_('Most Read Books')}
                  </h3>
                  <div className="space-y-2">
                    {bookStats.map((book, idx) => {
                      const barPct = maxBookDuration > 0 ? (book.totalDuration / maxBookDuration) * 100 : 0;
                      return (
                        <div key={book.bookHash} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-base-content/40 w-5 text-right">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm truncate max-w-[200px]" title={book.bookTitle}>
                                {book.bookTitle}
                              </span>
                              <span className="text-xs text-base-content/60 ml-2 shrink-0">
                                {formatDurationShort(book.totalDuration)}
                              </span>
                            </div>
                            <div className="w-full bg-base-300 rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2 transition-all duration-500"
                                style={{ width: `${Math.max(barPct, 2)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}> = ({ label, value, icon, highlight }) => (
  <div
    className={`bg-base-200 rounded-xl p-4 text-center ${
      highlight ? 'ring-2 ring-warning/50' : ''
    }`}
  >
    <div className="text-2xl mb-1">{icon}</div>
    <div className={`text-lg font-bold ${highlight ? 'text-warning' : ''}`}>{value}</div>
    <div className="text-xs text-base-content/50">{label}</div>
  </div>
);

export default ReadingStatsWindow;

// Global visibility control
let setReadingStatsVisible: ((visible: boolean) => void) | null = null;

export const ReadingStatsGlobalWindow: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setReadingStatsVisible = setIsVisible;
    return () => {
      setReadingStatsVisible = null;
    };
  }, []);

  return <ReadingStatsWindow isOpen={isVisible} onClose={() => setIsVisible(false)} />;
};

export const setReadingStatsWindowVisible = (visible: boolean) => {
  setReadingStatsVisible?.(visible);
};
