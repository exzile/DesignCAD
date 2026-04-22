import type { StoreApi } from 'zustand';
import type { CADState } from './state';

export type CADStoreSet = StoreApi<CADState>['setState'];
export type CADStoreGet = StoreApi<CADState>['getState'];

export interface CADSliceContext {
  set: CADStoreSet;
  get: CADStoreGet;
}
