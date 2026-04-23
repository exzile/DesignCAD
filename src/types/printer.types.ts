export interface PrintHistoryEntry {
  timestamp: string;
  file: string | null;
  kind: 'start' | 'finish' | 'cancel' | 'event';
  message: string;
  durationSec?: number;
}
