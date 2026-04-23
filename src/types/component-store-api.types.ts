import type { ComponentStore } from './component-store.types';

export type ComponentStoreSet = (
  partial:
    | Partial<ComponentStore>
    | ((state: ComponentStore) => Partial<ComponentStore>)
) => void;

export type ComponentStoreGet = () => ComponentStore;

export type ComponentStoreApi = {
  get: ComponentStoreGet;
  set: ComponentStoreSet;
};
