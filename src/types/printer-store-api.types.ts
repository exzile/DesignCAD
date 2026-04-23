import type { PrinterStore } from '../store/printerStore';

export type PrinterStoreSet = (
  partial:
    | Partial<PrinterStore>
    | ((state: PrinterStore) => Partial<PrinterStore>)
) => void;

export type PrinterStoreGet = () => PrinterStore;

export type PrinterStoreApi = {
  get: PrinterStoreGet;
  set: PrinterStoreSet;
};
