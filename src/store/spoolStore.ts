/**
 * SpoolStore — universal filament spool inventory.
 * Persisted in localStorage. Works across all printer firmware types.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Spool {
  id: string;
  brand: string;
  material: string;
  /** CSS hex color WITHOUT the leading # (e.g. "ff5500") */
  colorHex: string;
  colorName: string;
  /** Spool initial weight in grams (filament only, not spool itself) */
  initialWeightG: number;
  /** Amount already used in grams */
  usedWeightG: number;
  /** Filament diameter in mm (typically 1.75 or 2.85) */
  diameterMm: number;
  notes: string;
  /** epoch ms */
  addedAt: number;
}

interface SpoolStore {
  spools: Spool[];
  activeSpoolId: string | null;

  addSpool: (spool: Omit<Spool, 'id' | 'addedAt'>) => string;
  removeSpool: (id: string) => void;
  updateSpool: (id: string, patch: Partial<Omit<Spool, 'id' | 'addedAt'>>) => void;
  setActiveSpool: (id: string | null) => void;
  /** Record that `grams` of filament was used from the active spool */
  deductFilament: (grams: number) => void;
}

export const useSpoolStore = create<SpoolStore>()(
  persist(
    (set, get) => ({
      spools: [],
      activeSpoolId: null,

      addSpool: (spool) => {
        const id = `spool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({
          spools: [
            ...s.spools,
            { ...spool, id, addedAt: Date.now() },
          ],
        }));
        return id;
      },

      removeSpool: (id) =>
        set((s) => ({
          spools: s.spools.filter((sp) => sp.id !== id),
          activeSpoolId: s.activeSpoolId === id ? null : s.activeSpoolId,
        })),

      updateSpool: (id, patch) =>
        set((s) => ({
          spools: s.spools.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)),
        })),

      setActiveSpool: (id) => set({ activeSpoolId: id }),

      deductFilament: (grams) => {
        const { activeSpoolId, spools } = get();
        if (!activeSpoolId) return;
        set({
          spools: spools.map((sp) =>
            sp.id === activeSpoolId
              ? { ...sp, usedWeightG: Math.min(sp.usedWeightG + grams, sp.initialWeightG) }
              : sp,
          ),
        });
      },
    }),
    {
      name: 'dzign3d-spools',
      version: 1,
    },
  ),
);
