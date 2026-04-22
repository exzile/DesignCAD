import type { JointTrack } from '../../../types/cad';
import type { ComponentStore } from '../types';
import type { ComponentStoreApi } from '../storeApi';

let animationJointSnapshot: Record<string, { rotation?: number; translation?: number }> | null = null;

export const liveJointValues: Record<string, { rotationValue: number; translationValue?: number }> = {};

export function createAnimationState(api: ComponentStoreApi): Pick<
  ComponentStore,
  | 'animationTime'
  | 'animationDuration'
  | 'animationPlaying'
  | 'animationLoop'
  | 'animationTracks'
  | 'setAnimationTime'
  | 'setAnimationDuration'
  | 'setAnimationPlaying'
  | 'setAnimationLoop'
  | 'setJointTrack'
  | 'removeJointTrack'
  | 'tickAnimation'
> {
  const { get, set } = api;

  const clearLiveJointValues = (): void => {
    for (const id of Object.keys(liveJointValues)) delete liveJointValues[id];
  };

  return {
    animationTime: 0,
    animationDuration: 5,
    animationPlaying: false,
    animationLoop: true,
    animationTracks: [],

    setAnimationTime: (time) => set({ animationTime: time }),
    setAnimationDuration: (duration) => set({ animationDuration: duration }),
    setAnimationPlaying: (playing) => {
      const state = get();
      if (playing && !state.animationPlaying) {
        const snapshot: Record<string, { rotation?: number; translation?: number }> = {};
        for (const track of state.animationTracks) {
          const joint = state.joints[track.jointId];
          if (joint) {
            snapshot[track.jointId] = {
              rotation: joint.rotationValue,
              translation: joint.translationValue,
            };
          }
        }
        animationJointSnapshot = snapshot;
        set({ animationPlaying: true });
        return;
      }

      if (!playing && state.animationPlaying) {
        const snapshot = animationJointSnapshot;
        if (snapshot) {
          const restored = { ...state.joints };
          for (const id of Object.keys(snapshot)) {
            const joint = restored[id];
            const values = snapshot[id];
            if (joint && values) {
              restored[id] = {
                ...joint,
                rotationValue: values.rotation ?? joint.rotationValue,
                translationValue: values.translation ?? joint.translationValue,
              };
            }
          }
          clearLiveJointValues();
          set({ animationPlaying: false, animationTime: 0, joints: restored });
          animationJointSnapshot = null;
        } else {
          set({ animationPlaying: false });
        }
        return;
      }

      set({ animationPlaying: playing });
    },
    setAnimationLoop: (loop) => set({ animationLoop: loop }),

    setJointTrack: (jointId, track) => {
      const animationTracks = get().animationTracks;
      const existingIndex = animationTracks.findIndex((entry) => entry.jointId === jointId);
      const nextTrack: JointTrack = { ...track, jointId };
      if (existingIndex >= 0) {
        const updated = [...animationTracks];
        updated[existingIndex] = nextTrack;
        set({ animationTracks: updated });
      } else {
        set({ animationTracks: [...animationTracks, nextTrack] });
      }
    },

    removeJointTrack: (jointId) => {
      set({ animationTracks: get().animationTracks.filter((track) => track.jointId !== jointId) });
    },

    tickAnimation: (deltaSeconds) => {
      const { animationPlaying, animationDuration, animationLoop, animationTracks, joints } = get();
      if (!animationPlaying) return;

      let newTime = get().animationTime + deltaSeconds;
      let stillPlaying = true;
      if (newTime >= animationDuration) {
        if (animationLoop) newTime %= animationDuration;
        else {
          newTime = animationDuration;
          stillPlaying = false;
        }
      }

      const normalizedTime = animationDuration > 0 ? newTime / animationDuration : 0;
      for (const track of animationTracks) {
        let easedT = normalizedTime;
        switch (track.easing) {
          case 'ease-in':
            easedT = normalizedTime * normalizedTime;
            break;
          case 'ease-out':
            easedT = normalizedTime * (2 - normalizedTime);
            break;
          case 'ease-in-out':
            easedT = normalizedTime < 0.5
              ? 2 * normalizedTime * normalizedTime
              : -1 + (4 - 2 * normalizedTime) * normalizedTime;
            break;
        }
        liveJointValues[track.jointId] = {
          rotationValue: track.startValue + (track.endValue - track.startValue) * easedT,
        };
      }

      if (stillPlaying) {
        set({ animationTime: newTime, animationPlaying: true });
        return;
      }

      if (animationJointSnapshot) {
        const restored = { ...joints };
        for (const id of Object.keys(animationJointSnapshot)) {
          const joint = restored[id];
          const values = animationJointSnapshot[id];
          if (joint && values) {
            restored[id] = {
              ...joint,
              rotationValue: values.rotation ?? joint.rotationValue,
              translationValue: values.translation ?? joint.translationValue,
            };
          }
        }
        clearLiveJointValues();
        set({ joints: restored, animationTime: 0, animationPlaying: false });
        animationJointSnapshot = null;
      } else {
        clearLiveJointValues();
        set({ animationTime: 0, animationPlaying: false });
      }
    },
  };
}
