import { Box, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './CameraPresets.css';

export type CameraPreset = 'iso' | 'top' | 'front' | 'right';

export const cameraPresetEvent = 'slicer:set-camera-preset';
export const cameraFitEvent = 'slicer:fit-camera';
export const cameraFocusObjectEvent = 'slicer:focus-object';

function fire(preset: CameraPreset) {
  window.dispatchEvent(new CustomEvent(cameraPresetEvent, { detail: preset }));
}

/**
 * Small camera-preset overlay placed in the top-right of the viewport.
 * Dispatches a window event that the SlicerWorkspaceScene listens to and
 * applies via OrbitControls. The event/listener pattern keeps the overlay
 * outside the R3F Canvas (it lives in regular DOM) without forcing a
 * shared zustand slot for what is purely transient UI state.
 */
export function CameraPresets() {
  return (
    <div className="slicer-camera-presets" role="toolbar" aria-label="Camera presets">
      <button type="button" title="Isometric (1)" onClick={() => fire('iso')}>
        <Box size={14} />
      </button>
      <button type="button" title="Top (2)" onClick={() => fire('top')}>
        <ChevronDown size={14} />
      </button>
      <button type="button" title="Front (3)" onClick={() => fire('front')}>
        <ChevronUp size={14} />
      </button>
      <button type="button" title="Right (4)" onClick={() => fire('right')}>
        <ChevronRight size={14} />
      </button>
      <button type="button" title="Left (5)" onClick={() => fire('right')} style={{ display: 'none' }}>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}
