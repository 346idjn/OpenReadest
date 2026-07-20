import { AppService } from '@/types/system';
import { ReadingStatsData } from '@/types/readingStats';
import { useReadingStatsStore } from '@/store/readingStatsStore';

const STATS_FILENAME = 'reading-stats.json';

export const loadReadingStats = async (appService: AppService): Promise<ReadingStatsData | null> => {
  try {
    const exists = await appService.exists(STATS_FILENAME, 'Data');
    if (!exists) return null;
    const text = (await appService.readFile(STATS_FILENAME, 'Data', 'text')) as string;
    const data = JSON.parse(text) as ReadingStatsData;
    if (data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
};

export const saveReadingStats = async (appService: AppService): Promise<void> => {
  try {
    const data = useReadingStatsStore.getState().data;
    await appService.writeFile(STATS_FILENAME, 'Data', JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save reading stats:', err);
  }
};
