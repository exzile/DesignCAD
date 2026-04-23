import type { SavedPrinter } from './duet';

export interface LoadedPrinterState {
  printers: SavedPrinter[];
  activePrinterId: string;
}
