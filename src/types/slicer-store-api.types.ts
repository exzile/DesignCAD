import type { SlicerStore } from '../store/slicerStore';

export type SlicerStoreSet = (
  partial:
    | Partial<SlicerStore>
    | ((state: SlicerStore) => Partial<SlicerStore>)
) => void;

export type SlicerStoreGet = () => SlicerStore;

export type SlicerStoreApi = {
  get: SlicerStoreGet;
  set: SlicerStoreSet;
};
