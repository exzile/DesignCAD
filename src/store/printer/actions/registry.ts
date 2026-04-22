import type { SavedPrinter } from '../../../types/duet';
import { DEFAULT_PREFS, type DuetPrefs } from '../../../utils/duetPrefs';
import type { PrinterStore } from '../../printerStore';
import { genPrinterId, getActivePrinter, savePrintersList } from '../persistence';
import type { PrinterStoreApi } from '../storeApi';

export function createRegistryActions(api: PrinterStoreApi): Pick<
  PrinterStore,
  | 'setConfig'
  | 'addPrinter'
  | 'removePrinter'
  | 'renamePrinter'
  | 'selectPrinter'
  | 'updatePrinterPrefs'
> {
  const { get, set } = api;

  return {
    setConfig: (partial) => {
      const { printers, activePrinterId } = get();
      const updated = printers.map((printer) =>
        printer.id === activePrinterId
          ? { ...printer, config: { ...printer.config, ...partial } }
          : printer,
      );
      const active = getActivePrinter(updated, activePrinterId);
      savePrintersList(updated, activePrinterId);
      set({ printers: updated, config: active.config });
    },

    addPrinter: (name) => {
      const printers = get().printers;
      const id = genPrinterId();
      const nextName = name && name.trim().length > 0 ? name.trim() : `Printer ${printers.length + 1}`;
      const fresh: SavedPrinter = {
        id,
        name: nextName,
        config: { hostname: '', password: '', mode: 'standalone' },
        prefs: { ...DEFAULT_PREFS },
      };
      const next = [...printers, fresh];
      savePrintersList(next, get().activePrinterId);
      set({ printers: next });
      return id;
    },

    removePrinter: (id) => {
      const state = get();
      if (state.printers.length <= 1) return;
      const next = state.printers.filter((printer) => printer.id !== id);
      let activePrinterId = state.activePrinterId;
      if (activePrinterId === id) {
        if (state.connected || state.service) {
          state.disconnect(true).catch(() => {});
        }
        activePrinterId = next[0].id;
      }
      const active = getActivePrinter(next, activePrinterId);
      savePrintersList(next, activePrinterId);
      set({ printers: next, activePrinterId, config: active.config });
    },

    renamePrinter: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const next = get().printers.map((printer) =>
        printer.id === id ? { ...printer, name: trimmed } : printer,
      );
      savePrintersList(next, get().activePrinterId);
      set({ printers: next });
    },

    selectPrinter: async (id) => {
      const state = get();
      if (id === state.activePrinterId) return;
      const target = state.printers.find((printer) => printer.id === id);
      if (!target) return;
      if (state.connected || state.service) {
        try {
          await state.disconnect(true);
        } catch {
          // Ignore disconnect errors during printer switch.
        }
      }
      savePrintersList(state.printers, id);
      set({ activePrinterId: id, config: target.config });
    },

    updatePrinterPrefs: (id, patch) => {
      const next = get().printers.map((printer) => {
        if (printer.id !== id) return printer;
        const prefs = (printer.prefs as DuetPrefs | undefined) ?? { ...DEFAULT_PREFS };
        return { ...printer, prefs: { ...prefs, ...patch } };
      });
      savePrintersList(next, get().activePrinterId);
      set({ printers: next });
    },
  };
}
