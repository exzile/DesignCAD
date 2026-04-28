import { useState, type ReactNode } from 'react';
import { useSlicerStore } from '../../../../store/slicerStore';
import type { PlateObject } from '../../../../types/slicer';
import './SlicerViewportOverlays.css';
import { SlicerCostBreakdown } from './SlicerCostBreakdown';
import { SlicerPrintabilityPanel } from './SlicerPrintabilityPanel';
import { MirrorObjectPanel } from './objectControls/MirrorObjectPanel';
import { MoveObjectPanel } from './objectControls/MoveObjectPanel';
import { ObjectPanelHeader } from './objectControls/ObjectPanelHeader';
import { ObjectSettingsPanel } from './objectControls/ObjectSettingsPanel';
import { ObjectToolbar } from './objectControls/ObjectToolbar';
import { RotateObjectPanel } from './objectControls/RotateObjectPanel';
import { ScaleObjectPanel } from './objectControls/ScaleObjectPanel';
import type { TransformMode } from './objectControls/types';
import { SlicerGCodePreviewPanel } from './SlicerGCodePreviewPanel';

export function SlicerViewportOverlays() {
  const [uniformScale, setUniform] = useState(true);
  const [snapScale, setSnap] = useState(false);

  const selectedId = useSlicerStore((s) => s.selectedPlateObjectId);
  const plateObjects = useSlicerStore((s) => s.plateObjects);
  const updatePlateObject = useSlicerStore((s) => s.updatePlateObject);
  const mode = useSlicerStore((s) => s.transformMode) as TransformMode;
  const setMode = useSlicerStore((s) => s.setTransformMode);
  const previewMode = useSlicerStore((s) => s.previewMode);
  const gcodeOpen = useSlicerStore((s) => s.previewGCodeOpen);
  const sliceResult = useSlicerStore((s) => s.sliceResult);

  const obj = plateObjects.find((plateObject) => plateObject.id === selectedId) ?? null;
  const showObjectEditing = previewMode !== 'preview';
  const toolbar = showObjectEditing ? <ObjectToolbar mode={mode} onModeChange={setMode} /> : null;
  const gcodePanel = previewMode === 'preview' && gcodeOpen && sliceResult
    ? <SlicerGCodePreviewPanel />
    : null;

  if (!obj) {
    return (
      <>
        {toolbar}
        {gcodePanel}
        <SlicerPrintabilityPanel />
        <SlicerCostBreakdown />
      </>
    );
  }

  const locked = !!obj.locked;
  const onUpdate = (changes: Partial<PlateObject>) => {
    updatePlateObject(obj.id, changes);
  };
  const header = <ObjectPanelHeader obj={obj} locked={locked} onUpdate={onUpdate} />;
  const divider = <div className="slicer-overlay-divider" />;
  const panelProps = { obj, locked, onUpdate, header, divider };

  const panels: Record<TransformMode, ReactNode> = {
    move: <MoveObjectPanel {...panelProps} />,
    scale: (
      <ScaleObjectPanel
        {...panelProps}
        snapScale={snapScale}
        uniformScale={uniformScale}
        onSnapScaleChange={setSnap}
        onUniformScaleChange={setUniform}
      />
    ),
    rotate: <RotateObjectPanel {...panelProps} />,
    mirror: <MirrorObjectPanel {...panelProps} />,
    settings: <ObjectSettingsPanel {...panelProps} />,
  };

  return (
    <>
      {toolbar}
      {gcodePanel}
      {showObjectEditing && !gcodePanel && panels[mode]}
      <SlicerPrintabilityPanel />
      <SlicerCostBreakdown />
    </>
  );
}
