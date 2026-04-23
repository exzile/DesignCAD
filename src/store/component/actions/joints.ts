import type { Joint, MotionLink, RigidGroup } from '../../../types/cad';
import type { ComponentStore } from '../types';
import type { ComponentStoreApi } from '../storeApi';

export function createJointActions({ get, set }: ComponentStoreApi): Pick<
  ComponentStore,
  | 'addJoint'
  | 'removeJoint'
  | 'setJointValue'
  | 'toggleJointLock'
  | 'rigidGroups'
  | 'addRigidGroup'
  | 'removeRigidGroup'
  | 'motionLinks'
  | 'addMotionLink'
  | 'removeMotionLink'
> {
  return {
    addJoint: (joint: Omit<Joint, 'id'>) => {
      const { joints, components } = get();
      const id = crypto.randomUUID();
      const newJoint: Joint = { ...joint, id };
      const comp = components[joint.componentId1];

      set({
        joints: { ...joints, [id]: newJoint },
        components: comp
          ? {
              ...components,
              [joint.componentId1]: { ...comp, jointIds: [...comp.jointIds, id] },
            }
          : components,
      });

      return id;
    },

    removeJoint: (id) => {
      const { joints } = get();
      const updated = { ...joints };
      delete updated[id];
      set({ joints: updated });
    },

    setJointValue: (id, rotation, translation) => {
      const { joints } = get();
      const joint = joints[id];
      if (!joint) return;
      set({
        joints: {
          ...joints,
          [id]: {
            ...joint,
            rotationValue: rotation ?? joint.rotationValue,
            translationValue: translation ?? joint.translationValue,
          },
        },
      });
    },

    toggleJointLock: (id) => {
      const { joints } = get();
      const joint = joints[id];
      if (!joint) return;
      set({ joints: { ...joints, [id]: { ...joint, locked: !joint.locked } } });
    },

    rigidGroups: [],
    addRigidGroup: (componentIds, name) => {
      const { rigidGroups } = get();
      const id = crypto.randomUUID();
      const group: RigidGroup = {
        id,
        name: name ?? `Rigid Group ${rigidGroups.length + 1}`,
        componentIds,
      };
      set({ rigidGroups: [...rigidGroups, group] });
    },
    removeRigidGroup: (id) => {
      const { rigidGroups } = get();
      set({ rigidGroups: rigidGroups.filter((group) => group.id !== id) });
    },

    motionLinks: [],
    addMotionLink: (link: Omit<MotionLink, 'id'>) => {
      const { motionLinks } = get();
      set({ motionLinks: [...motionLinks, { ...link, id: crypto.randomUUID() }] });
    },
    removeMotionLink: (id) => {
      const { motionLinks } = get();
      set({ motionLinks: motionLinks.filter((link) => link.id !== id) });
    },
  };
}
