import type { ConstructionGeometry } from '../../../types/cad';
import type { ComponentStore } from '../types';
import type { ComponentStoreApi } from '../storeApi';

export function createConstructionActions({ get, set }: ComponentStoreApi): Pick<
  ComponentStore,
  'addConstruction' | 'removeConstruction' | 'toggleConstructionVisibility'
> {
  return {
    addConstruction: (geometry: Omit<ConstructionGeometry, 'id'>) => {
      const { constructions, components } = get();
      const id = crypto.randomUUID();
      const construction: ConstructionGeometry = { ...geometry, id };
      const comp = components[geometry.componentId];

      set({
        constructions: { ...constructions, [id]: construction },
        components: comp
          ? {
              ...components,
              [geometry.componentId]: {
                ...comp,
                constructionIds: [...comp.constructionIds, id],
                constructionPlaneIds: geometry.type === 'plane'
                  ? [...(comp.constructionPlaneIds ?? []), id]
                  : (comp.constructionPlaneIds ?? []),
                constructionAxisIds: geometry.type === 'axis'
                  ? [...(comp.constructionAxisIds ?? []), id]
                  : (comp.constructionAxisIds ?? []),
                constructionPointIds: geometry.type === 'point'
                  ? [...(comp.constructionPointIds ?? []), id]
                  : (comp.constructionPointIds ?? []),
              },
            }
          : components,
      });

      return id;
    },

    removeConstruction: (id) => {
      const { constructions, components } = get();
      const construction = constructions[id];
      if (!construction) return;

      const updated = { ...constructions };
      delete updated[id];

      const comp = components[construction.componentId];
      set({
        constructions: updated,
        components: comp
          ? {
              ...components,
              [construction.componentId]: {
                ...comp,
                constructionIds: comp.constructionIds.filter((constructionId) => constructionId !== id),
                constructionPlaneIds: (comp.constructionPlaneIds ?? []).filter((constructionId) => constructionId !== id),
                constructionAxisIds: (comp.constructionAxisIds ?? []).filter((constructionId) => constructionId !== id),
                constructionPointIds: (comp.constructionPointIds ?? []).filter((constructionId) => constructionId !== id),
              },
            }
          : components,
      });
    },

    toggleConstructionVisibility: (id) => {
      const { constructions } = get();
      const construction = constructions[id];
      if (!construction) return;
      set({
        constructions: {
          ...constructions,
          [id]: { ...construction, visible: !construction.visible },
        },
      });
    },
  };
}
