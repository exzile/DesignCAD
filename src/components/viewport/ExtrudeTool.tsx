import { useState, useEffect, useMemo } from 'react';
import { useCADStore } from '../../store/cadStore';
import { GeometryEngine } from '../../engine/GeometryEngine';
import type { Sketch } from '../../types/cad';
import SketchProfile from './extrude/SketchProfile';
import ExtrudePreview from './extrude/ExtrudePreview';
import ExtrudeGizmo from './extrude/ExtrudeGizmo';
import FaceHighlight from './extrude/FaceHighlight';
import { useFacePicker } from '../../hooks/useFacePicker';
import type { FacePickResult } from '../../hooks/useFacePicker';

function parseSelectionId(id: string): { sketchId: string; profileIndex: number | null } {
  const parts = id.split('::');
  if (parts.length === 2) {
    const parsed = Number(parts[1]);
    if (Number.isFinite(parsed)) return { sketchId: parts[0], profileIndex: parsed };
  }
  return { sketchId: id, profileIndex: null };
}

function buildSelectionId(sketchId: string, profileIndex: number): string {
  return `${sketchId}::${profileIndex}`;
}

export default function ExtrudeTool() {
  const activeTool = useCADStore((s) => s.activeTool);
  const sketches = useCADStore((s) => s.sketches);
  const selectedIds = useCADStore((s) => s.extrudeSelectedSketchIds);
  const setSelectedIds = useCADStore((s) => s.setExtrudeSelectedSketchIds);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);
  const startExtrudeFromFace = useCADStore((s) => s.startExtrudeFromFace);
  const distance = useCADStore((s) => s.extrudeDistance);
  const direction = useCADStore((s) => s.extrudeDirection);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [faceHit, setFaceHit] = useState<FacePickResult | null>(null);

  // Face picker is only active when the extrude tool is open and no sketch
  // profile has been selected yet. Meshes with a profileKey are excluded so
  // the hook never fires over sketch profiles (those are handled by SketchProfile).
  useFacePicker({
    enabled: activeTool === 'extrude' && selectedIds.length === 0,
    filter: (mesh) => !mesh.userData?.profileKey,
    onHover: setFaceHit,
    onClick: (result) => {
      startExtrudeFromFace(result.boundary, result.normal, result.centroid);
      setFaceHit(null);
    },
  });

  const extrudable = useMemo(() => sketches.filter((s) => s.entities.length > 0), [sketches]);

  const profileEntries = useMemo(() => {
    return extrudable.flatMap((sketch) => {
      const count = GeometryEngine.sketchToShapes(sketch).length;
      return Array.from({ length: count }, (_, profileIndex) => ({
        sketch,
        profileIndex,
        selectionId: buildSelectionId(sketch.id, profileIndex),
      })).filter(({ profileIndex }) => GeometryEngine.createProfileSketch(sketch, profileIndex) !== null);
    });
  }, [extrudable]);

  const getSketchForSelection = (selectionId: string): Sketch | null => {
    const { sketchId, profileIndex } = parseSelectionId(selectionId);
    const sketch = sketches.find((s) => s.id === sketchId);
    if (!sketch) return null;
    if (profileIndex === null) return sketch;
    return GeometryEngine.createProfileSketch(sketch, profileIndex);
  };

  const isSamePlane = (a: Sketch, b: Sketch) => {
    const aN = a.planeNormal.clone().normalize();
    const bN = b.planeNormal.clone().normalize();
    const dot = aN.dot(bN);
    if (Math.abs(Math.abs(dot) - 1) > 1e-3) return false;
    const aD = aN.dot(a.planeOrigin);
    const bD = dot >= 0 ? aN.dot(b.planeOrigin) : -aN.dot(b.planeOrigin);
    return Math.abs(aD - bD) <= 1e-2;
  };

  const toggleSelection = (selectionId: string) => {
    if (selectedIds.includes(selectionId)) {
      const next = selectedIds.filter((id) => id !== selectionId);
      setSelectedIds(next);
      setStatusMessage(next.length > 0
        ? `${next.length} profile${next.length > 1 ? 's' : ''} selected — drag arrow or set distance, then OK`
        : 'Click a profile or face to extrude');
      return;
    }

    const incoming = getSketchForSelection(selectionId);
    if (!incoming) return;
    if (selectedIds.length > 0) {
      const first = getSketchForSelection(selectedIds[0]);
      if (first && !isSamePlane(first, incoming)) {
        setStatusMessage('Additional profiles must be on the same plane');
        return;
      }
    }

    const next = [...selectedIds, selectionId];
    setSelectedIds(next);
    setStatusMessage(`${next.length} profile${next.length > 1 ? 's' : ''} selected — drag arrow or set distance, then OK`);
  };

  // Set hover status message whenever a face is being highlighted
  useEffect(() => {
    if (faceHit) setStatusMessage('Click face to press-pull — extrude along its normal');
  }, [faceHit, setStatusMessage]);

  if (activeTool !== 'extrude') return null;

  const selectedPreviewSketch = selectedIds.length > 0 ? getSketchForSelection(selectedIds[0]) : null;

  return (
    <group>
      {profileEntries.map(({ sketch, profileIndex, selectionId }) => (
        <SketchProfile
          key={selectionId}
          sketch={sketch}
          profileIndex={profileIndex}
          state={
            selectedIds.includes(selectionId) ? 'selected' :
            selectionId === hoveredId ? 'hover' : 'idle'
          }
          onSelect={() => toggleSelection(selectionId)}
          onHover={() => {
            setHoveredId(selectionId);
            if (selectedIds.length === 0) setStatusMessage(`Click to add ${sketch.name} profile ${profileIndex + 1}`);
          }}
          onUnhover={() => setHoveredId((prev) => (prev === selectionId ? null : prev))}
        />
      ))}
      {selectedIds.length === 0 && faceHit && <FaceHighlight boundary={faceHit.boundary} />}
      {selectedPreviewSketch && (
        <>
          <ExtrudePreview sketch={selectedPreviewSketch} distance={distance} direction={direction} />
          <ExtrudeGizmo sketch={selectedPreviewSketch} />
        </>
      )}
    </group>
  );
}
