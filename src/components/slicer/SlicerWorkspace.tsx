import { useState, useCallback, useMemo, useRef } from 'react';
import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, TransformControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  Move, RotateCw, Maximize2, FlipHorizontal, SlidersHorizontal, RefreshCw,
  Lock, Unlock, ArrowDownToLine,
} from 'lucide-react';
import PluginsPage from './PluginsPage';
import { useSlicerStore } from '../../store/slicerStore';
import type {
  PlateObject,
  SliceResult,
} from '../../types/slicer';

// =============================================================================
// Theme — use shared CSS-var tokens so all workspaces follow the active theme
// =============================================================================
import { colors, sharedStyles } from '../../utils/theme';
import { normalizeRotationRadians, normalizeScale } from '../../utils/slicerTransforms';
import { SlicerBottomBar } from './SlicerBottomBar';
import { SlicerWorkspaceNavBar, type SlicerPage } from './SlicerWorkspaceNavBar';
import { SlicerProfileEditorModal } from './SlicerProfileEditorModal';
import { SlicerObjectsPanel } from './SlicerObjectsPanel';
import { SlicerSettingsPanel } from './SlicerSettingsPanel';

const btnBase     = sharedStyles.btnBase;
const inputStyle  = sharedStyles.input;

// =============================================================================
// 3D Scene: Build Plate Grid
// =============================================================================
function BuildPlateGrid({ sizeX, sizeY }: { sizeX: number; sizeY: number }) {
  const linesX: [number, number, number][][] = [];
  const linesY: [number, number, number][][] = [];

  for (let x = 0; x <= sizeX; x += 10) {
    linesX.push([[x, 0, 0], [x, sizeY, 0]]);
  }
  for (let y = 0; y <= sizeY; y += 10) {
    linesY.push([[0, y, 0], [sizeY > 0 ? sizeX : 0, y, 0]]);
  }

  return (
    <group>
      {linesX.map((pts, i) => (
        <Line key={`gx${i}`} points={pts} color="#2a2a4a" lineWidth={0.5} />
      ))}
      {linesY.map((pts, i) => (
        <Line key={`gy${i}`} points={pts} color="#2a2a4a" lineWidth={0.5} />
      ))}
      {/* Solid border */}
      <Line
        points={[[0,0,0],[sizeX,0,0],[sizeX,sizeY,0],[0,sizeY,0],[0,0,0]]}
        color="#4a4a6a"
        lineWidth={1.5}
      />
    </group>
  );
}

// =============================================================================
// 3D Scene: Build Volume Wireframe
// =============================================================================
function BuildVolumeWireframe({ x, y, z }: { x: number; y: number; z: number }) {
  const geo = useMemo(() => new THREE.BoxGeometry(x, y, z), [x, y, z]);
  return (
    <mesh position={[x / 2, y / 2, z / 2]}>
      <boxGeometry args={[x, y, z]} />
      <meshBasicMaterial color="#3344aa" transparent opacity={0.06} wireframe={false} />
      <lineSegments>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color="#3344aa" transparent opacity={0.25} />
      </lineSegments>
    </mesh>
  );
}

// =============================================================================
// 3D Scene: Axis Indicators
// =============================================================================
function AxisIndicators() {
  const len = 20;
  return (
    <group>
      <Line points={[[0,0,0],[len,0,0]]} color="red" lineWidth={2} />
      <Line points={[[0,0,0],[0,len,0]]} color="green" lineWidth={2} />
      <Line points={[[0,0,0],[0,0,len]]} color="#4488ff" lineWidth={2} />
      <Text position={[len + 3, 0, 0]} fontSize={4} color="red">X</Text>
      <Text position={[0, len + 3, 0]} fontSize={4} color="green">Y</Text>
      <Text position={[0, 0, len + 3]} fontSize={4} color="#4488ff">Z</Text>
    </group>
  );
}

// =============================================================================
// 3D Scene: Plate Object Mesh
// =============================================================================
function PlateObjectMesh({
  obj,
  isSelected,
  materialColor,
  onClick,
  transformMode,
  onTransformCommit,
}: {
  obj: PlateObject;
  isSelected: boolean;
  materialColor: string;
  onClick: () => void;
  transformMode: 'move' | 'scale' | 'rotate' | 'mirror' | 'settings';
  onTransformCommit: (id: string, pos: {x:number;y:number;z:number}, rot: {x:number;y:number;z:number}, scl: {x:number;y:number;z:number}) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  // Callback-ref wrapper so the gizmo can re-render once the mesh mounts.
  // Reading `meshRef.current` directly in render violates React's rules
  // (the ref is null on the first render and never triggers an update).
  const [meshInstance, setMeshInstance] = useState<THREE.Mesh | null>(null);
  const setMeshRef = useCallback((m: THREE.Mesh | null) => {
    meshRef.current = m;
    setMeshInstance(m);
  }, []);

  const pos = obj.position as { x: number; y: number; z?: number };
  const rot = normalizeRotationRadians((obj as { rotation?: unknown }).rotation);
  const scl = normalizeScale((obj as { scale?: unknown }).scale);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const geometry = obj.geometry as unknown;
  const hasGeometry =
    geometry instanceof THREE.BufferGeometry ||
    (!!geometry && typeof geometry === 'object' && (geometry as { isBufferGeometry?: boolean }).isBufferGeometry === true);

  // Three.js gizmo mode (TransformControls only supports translate/rotate/scale)
  const locked = !!obj.locked;
  const gizmoMode = transformMode === 'rotate' ? 'rotate' : transformMode === 'scale' ? 'scale' : 'translate';
  const showGizmo = isSelected && !locked && (transformMode === 'move' || transformMode === 'rotate' || transformMode === 'scale');

  // Sync the gizmo's result back to the store on drag end
  const handleDragEnd = useCallback(() => {
    const m = meshRef.current;
    if (!m) return;
    onTransformCommit(
      obj.id,
      { x: m.position.x, y: m.position.y, z: m.position.z },
      { x: m.rotation.x, y: m.rotation.y, z: m.rotation.z },
      { x: m.scale.x,    y: m.scale.y,    z: m.scale.z    },
    );
  }, [obj.id, onTransformCommit]);

  const boxArgs: [number, number, number] = [
    obj.boundingBox.max.x - obj.boundingBox.min.x || 10,
    obj.boundingBox.max.y - obj.boundingBox.min.y || 10,
    obj.boundingBox.max.z - obj.boundingBox.min.z || 10,
  ];

  return (
    <>
      <mesh
        ref={setMeshRef}
        position={[pos.x, pos.y, pos.z ?? 0]}
        rotation={[rot.x, rot.y, rot.z]}
        scale={[scl.x, scl.y, scl.z]}
        geometry={hasGeometry ? obj.geometry : undefined}
        onClick={handleClick}
      >
        {!hasGeometry && <boxGeometry args={boxArgs} />}
        <meshStandardMaterial
          color={materialColor}
          transparent={isSelected}
          opacity={isSelected ? 0.85 : 1}
        />
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[
              hasGeometry
                ? obj.geometry
                : new THREE.BoxGeometry(...boxArgs),
            ]} />
            <lineBasicMaterial color="#ffaa00" linewidth={2} />
          </lineSegments>
        )}
      </mesh>

      {/* Interactive transform gizmo — only for move/rotate/scale modes */}
      {showGizmo && meshInstance && (
        <TransformControls
          object={meshInstance}
          mode={gizmoMode}
          onMouseUp={handleDragEnd}
        />
      )}
    </>
  );
}

// =============================================================================
// 3D Scene: GCode Preview (layer lines)
// =============================================================================
function InlineGCodePreview({
  sliceResult,
  currentLayer,
  showTravel,
  colorMode,
}: {
  sliceResult: SliceResult;
  currentLayer: number;
  showTravel: boolean;
  colorMode: 'type' | 'speed' | 'flow';
}) {
  const moveTypeColors: Record<string, string> = {
    'wall-outer': '#ff8844',
    'wall-inner': '#ffbb66',
    'infill': '#44aaff',
    'top-bottom': '#44ff88',
    'support': '#ff44ff',
    'skirt': '#aaaaaa',
    'brim': '#aaaaaa',
    'raft': '#888888',
    'bridge': '#ff4444',
    'ironing': '#88ff88',
    'travel': '#666666',
  };

  const visibleLayers = sliceResult.layers.filter((l) => l.layerIndex <= currentLayer);

  return (
    <group>
      {visibleLayers.map((layer) => {
        const extrusions: [number, number, number][] = [];
        const travels: [number, number, number][] = [];

        const extColors: string[] = [];
        for (const move of layer.moves) {
          if (move.type === 'travel') {
            if (showTravel) {
              travels.push([move.from.x, move.from.y, layer.z]);
              travels.push([move.to.x, move.to.y, layer.z]);
            }
          } else {
            extrusions.push([move.from.x, move.from.y, layer.z]);
            extrusions.push([move.to.x, move.to.y, layer.z]);
            const c = colorMode === 'type'
              ? moveTypeColors[move.type] || '#ffffff'
              : colorMode === 'speed'
                ? `hsl(${Math.max(0, 240 - move.speed * 2)}, 80%, 55%)`
                : `hsl(${Math.max(0, 120 - move.extrusion * 100)}, 80%, 55%)`;
            extColors.push(c);
            extColors.push(c);
          }
        }

        return (
          <group key={layer.layerIndex}>
            {extrusions.length > 1 && (
              <Line points={extrusions} vertexColors={extColors.map(c => new THREE.Color(c))} lineWidth={1.2} />
            )}
            {travels.length > 1 && (
              <Line points={travels} color="#333355" lineWidth={0.3} />
            )}
          </group>
        );
      })}
    </group>
  );
}

// =============================================================================
// 3D Scene: Main Scene
// =============================================================================
function SlicerScene() {
  const printerProfile    = useSlicerStore((s) => s.getActivePrinterProfile());
  const materialProfile   = useSlicerStore((s) => s.getActiveMaterialProfile());
  const plateObjects      = useSlicerStore((s) => s.plateObjects);
  const selectedId        = useSlicerStore((s) => s.selectedPlateObjectId);
  const selectPlateObject = useSlicerStore((s) => s.selectPlateObject);
  const updatePlateObject = useSlicerStore((s) => s.updatePlateObject);
  const transformMode     = useSlicerStore((s) => s.transformMode);
  const previewMode       = useSlicerStore((s) => s.previewMode);
  const sliceResult       = useSlicerStore((s) => s.sliceResult);
  const previewLayer      = useSlicerStore((s) => s.previewLayer);
  const previewShowTravel = useSlicerStore((s) => s.previewShowTravel);
  const previewColorMode  = useSlicerStore((s) => s.previewColorMode);

  const bv = printerProfile?.buildVolume ?? { x: 220, y: 220, z: 250 };

  const handleMiss = useCallback(() => {
    selectPlateObject(null);
  }, [selectPlateObject]);

  // Called by PlateObjectMesh when the user finishes dragging a gizmo handle
  const handleTransformCommit = useCallback((
    id: string,
    pos: { x: number; y: number; z: number },
    rot: { x: number; y: number; z: number },
    scl: { x: number; y: number; z: number },
  ) => {
    updatePlateObject(id, { position: pos, rotation: rot, scale: scl });
  }, [updatePlateObject]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[bv.x, bv.y, bv.z * 1.5]} intensity={0.8} />
      <directionalLight position={[-bv.x / 2, -bv.y / 2, bv.z]} intensity={0.3} />

      <BuildPlateGrid sizeX={bv.x} sizeY={bv.y} />
      <BuildVolumeWireframe x={bv.x} y={bv.y} z={bv.z} />
      <AxisIndicators />

      {previewMode === 'model' && plateObjects.map((obj) => (
        <PlateObjectMesh
          key={obj.id}
          obj={obj}
          isSelected={obj.id === selectedId}
          materialColor={materialProfile?.color ?? '#4fc3f7'}
          onClick={() => selectPlateObject(obj.id)}
          transformMode={transformMode}
          onTransformCommit={handleTransformCommit}
        />
      ))}

      {previewMode === 'preview' && sliceResult && (
        <InlineGCodePreview
          sliceResult={sliceResult}
          currentLayer={previewLayer}
          showTravel={previewShowTravel}
          colorMode={previewColorMode}
        />
      )}

      {/* Click on empty space to deselect */}
      <mesh position={[bv.x / 2, bv.y / 2, -0.1]} onClick={handleMiss} visible={false}>
        <planeGeometry args={[bv.x * 2, bv.y * 2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* makeDefault lets TransformControls auto-disable OrbitControls while dragging */}
      <OrbitControls
        makeDefault
        target={[bv.x / 2, bv.y / 2, 0]}
        minDistance={50}
        maxDistance={bv.x * 4}
        enableDamping
      />
    </>
  );
}

// =============================================================================
// Viewport Overlays — left toolbar + mode-specific properties panel (Cura-style)
// =============================================================================
type TransformMode = 'move' | 'scale' | 'rotate' | 'mirror' | 'settings';

function ViewportOverlays() {
  const [uniformScale, setUniform] = useState(true);
  const [snapScale, setSnap]       = useState(false);

  const selectedId        = useSlicerStore((s) => s.selectedPlateObjectId);
  const plateObjects      = useSlicerStore((s) => s.plateObjects);
  const updatePlateObject = useSlicerStore((s) => s.updatePlateObject);
  const mode              = useSlicerStore((s) => s.transformMode) as TransformMode;
  const setMode           = useSlicerStore((s) => s.setTransformMode);

  const obj = plateObjects.find((o) => o.id === selectedId) ?? null;

  const upd = (changes: Record<string, unknown>) => {
    if (!obj) return;
    updatePlateObject(obj.id, changes as Partial<PlateObject>);
  };

  // ── shared styles ────────────────────────────────────────────────────────────
  const panelBox: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    left: 52,          // right of the toolbar
    zIndex: 20,
    background: colors.elevated,
    border: `1px solid ${colors.panelBorder}`,
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
    padding: '10px 12px',
    minWidth: 220,
    userSelect: 'none',
  };

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 };

  const axisColor = ['#e05555', '#44bb66', '#4488ff'];

  const numIn = (
    val: string,
    onChange: (v: string) => void,
    disabled = false,
    width = 72,
  ) => (
    <input
      type="number"
      disabled={disabled}
      style={{ ...inputStyle, width, padding: '3px 6px', fontSize: 12, textAlign: 'right' }}
      value={val}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  const checkRow = (label: React.ReactNode, checked: boolean, onClick: () => void) => (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 5, fontSize: 12, color: colors.text }}
      onClick={(e) => { e.preventDefault(); onClick(); }}
    >
      <input type="checkbox" checked={checked} onChange={onClick} style={{ accentColor: colors.accent, cursor: 'pointer' }} />
      {label}
    </label>
  );

  const divider = <div style={{ borderTop: `1px solid ${colors.panelBorder}`, margin: '8px 0' }} />;

  // ── Left toolbar ─────────────────────────────────────────────────────────────
  const toolbarItems: { id: TransformMode; icon: React.ReactNode; title: string }[] = [
    { id: 'move',     icon: <Move size={18} />,             title: 'Move'              },
    { id: 'scale',    icon: <Maximize2 size={18} />,        title: 'Scale'             },
    { id: 'rotate',   icon: <RotateCw size={18} />,         title: 'Rotate'            },
    { id: 'mirror',   icon: <FlipHorizontal size={18} />,   title: 'Mirror'            },
    { id: 'settings', icon: <SlidersHorizontal size={18} />,title: 'Per-object Settings'},
  ];

  const toolbar = (
    <div style={{
      position: 'absolute', top: 12, left: 8, zIndex: 20,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      {toolbarItems.map(({ id, icon, title }) => (
        <button
          key={id}
          title={title}
          onClick={() => setMode(id)}
          style={{
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: mode === id ? colors.accent : colors.elevated,
            border: `1px solid ${mode === id ? colors.accent : colors.panelBorder}`,
            borderRadius: 6,
            color: mode === id ? '#fff' : colors.text,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            transition: 'background 0.15s',
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );

  // ── No object selected ───────────────────────────────────────────────────────
  if (!obj) return toolbar;

  const pos    = obj.position as { x: number; y: number; z: number };
  const rot = normalizeRotationRadians((obj as { rotation?: unknown }).rotation);
  const scl = normalizeScale((obj as { scale?: unknown }).scale);
  const locked = !!obj.locked;

  const bboxSize = {
    x: Math.abs(obj.boundingBox.max.x - obj.boundingBox.min.x),
    y: Math.abs(obj.boundingBox.max.y - obj.boundingBox.min.y),
    z: Math.abs(obj.boundingBox.max.z - obj.boundingBox.min.z),
  };

  // ── Object name header shared across panels ──────────────────────────────────
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
        {obj.name}
      </div>
      <button
        title={locked ? 'Unlock model' : 'Lock model'}
        onClick={() => upd({ locked: !locked })}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: locked ? colors.accent : colors.textDim, display: 'flex' }}
      >
        {locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>
    </div>
  );

  // ── MOVE panel ───────────────────────────────────────────────────────────────
  const movePanel = (
    <div style={panelBox}>
      {header}
      {(['x', 'y', 'z'] as const).map((ax, i) => (
        <div key={ax} style={rowStyle}>
          <span style={{ fontSize: 12, fontWeight: 700, color: axisColor[i], width: 14, flexShrink: 0 }}>{ax.toUpperCase()}</span>
          {numIn(pos[ax].toFixed(1), (v) => { if (!locked) upd({ position: { ...pos, [ax]: parseFloat(v) || 0 } }); }, locked)}
          <span style={{ fontSize: 11, color: colors.textDim }}>mm</span>
        </div>
      ))}
      {divider}
      {checkRow('Lock Model', locked, () => upd({ locked: !locked }))}
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: locked ? 'not-allowed' : 'pointer', marginTop: 5, fontSize: 12, color: colors.text }}
        onClick={() => {
          if (locked) return;
          const minZ = isFinite(obj.boundingBox.min.z) ? obj.boundingBox.min.z * (scl.z) : 0;
          upd({ position: { ...pos, z: -minZ } });
        }}
      >
        <ArrowDownToLine size={13} color={locked ? colors.textDim : colors.accent} />
        Drop Down <span style={{ color: colors.accent, fontWeight: 600, marginLeft: 3 }}>Model</span>
      </label>
      <button
        style={{ ...btnBase, marginTop: 8, width: '100%', justifyContent: 'center', fontSize: 11 }}
        disabled={locked}
        title="Center the object on the build plate"
        onClick={() => {
          const bv  = useSlicerStore.getState().getActivePrinterProfile()?.buildVolume ?? { x: 220, y: 220, z: 250 };
          const b   = obj.boundingBox;
          const w   = (b.max.x - b.min.x) * scl.x;
          const d   = (b.max.y - b.min.y) * scl.y;
          const minZ = b.min.z * scl.z;
          upd({ position: {
            x: bv.x / 2 - b.min.x * scl.x - w / 2,
            y: bv.y / 2 - b.min.y * scl.y - d / 2,
            z: isFinite(minZ) ? -minZ : pos.z,
          }});
        }}
      >
        Center on Plate
      </button>
    </div>
  );

  // ── Lay Flat algorithm (rotation-aware) ─────────────────────────────────────
  // Considers the object's current rotation. Transforms each face's local normal
  // into world space, then finds the face that is already CLOSEST to flat
  // (needs the smallest correction). Applies only the minimal additional rotation
  // needed, rather than overwriting the entire rotation from scratch.
  const layFlat = () => {
    if (locked) return;
    const geom: THREE.BufferGeometry | null = obj.geometry ?? null;

    if (!geom?.attributes?.position) {
      upd({ rotation: { x: 0, y: 0, z: 0 } });
      return;
    }

    const posAttr   = geom.attributes.position;
    const indexAttr = geom.index;
    const triCount  = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

    // Current rotation as quaternion — used to bring local normals into world space
    const currentQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rot.x, rot.y, rot.z, 'XYZ'),
    );

    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    const vc = new THREE.Vector3();
    const e1 = new THREE.Vector3();
    const e2 = new THREE.Vector3();
    const cross = new THREE.Vector3();
    const down = new THREE.Vector3(0, 0, -1);

    // Bucket by quantized WORLD-SPACE normal so coplanar faces in the current
    // orientation group together (not in raw local space)
    const buckets = new Map<string, { worldNormal: THREE.Vector3; area: number }>();

    for (let i = 0; i < triCount; i++) {
      const i0 = indexAttr ? indexAttr.getX(i * 3)     : i * 3;
      const i1 = indexAttr ? indexAttr.getX(i * 3 + 1) : i * 3 + 1;
      const i2 = indexAttr ? indexAttr.getX(i * 3 + 2) : i * 3 + 2;

      va.fromBufferAttribute(posAttr, i0);
      vb.fromBufferAttribute(posAttr, i1);
      vc.fromBufferAttribute(posAttr, i2);

      e1.subVectors(vb, va);
      e2.subVectors(vc, va);
      cross.crossVectors(e1, e2);

      const area = cross.length() / 2;
      if (area < 1e-6) continue;

      // Rotate local normal into world space
      const worldNorm = cross.clone().normalize().applyQuaternion(currentQuat);

      // Bucket by quantized world normal (2 dp → ~1° grouping tolerance)
      const key = `${worldNorm.x.toFixed(2)},${worldNorm.y.toFixed(2)},${worldNorm.z.toFixed(2)}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.area += area;
      } else {
        buckets.set(key, { worldNormal: worldNorm, area });
      }
    }

    // Scoring: find the face that is CLOSEST to facing down AND has significant area.
    // Score = dot(worldNormal, -Z) × area  — maximise to pick the face needing least rotation.
    let bestWorldNormal = new THREE.Vector3(0, 0, -1);
    let bestScore = -Infinity;
    for (const { worldNormal, area } of buckets.values()) {
      const dotDown = worldNormal.dot(down); // +1 = already perfectly facing down
      const score   = dotDown * area;
      if (score > bestScore) {
        bestScore = score;
        bestWorldNormal = worldNormal.clone();
      }
    }

    // Minimal additional quaternion to bring that world normal exactly to -Z
    const correctionQuat = new THREE.Quaternion().setFromUnitVectors(bestWorldNormal, down);

    // Final rotation = correction applied ON TOP of the current rotation
    const finalQuat  = new THREE.Quaternion().multiplyQuaternions(correctionQuat, currentQuat);
    const finalEuler = new THREE.Euler().setFromQuaternion(finalQuat, 'XYZ');

    // Drop to bed: find lowest Z corner under the final rotation + current scale
    const tmpBox = new THREE.Box3().setFromBufferAttribute(posAttr as THREE.BufferAttribute);
    const rotMat = new THREE.Matrix4().makeRotationFromQuaternion(finalQuat);
    const cornerOffsets: [number, number, number][] = [
      [tmpBox.min.x, tmpBox.min.y, tmpBox.min.z], [tmpBox.max.x, tmpBox.min.y, tmpBox.min.z],
      [tmpBox.min.x, tmpBox.max.y, tmpBox.min.z], [tmpBox.max.x, tmpBox.max.y, tmpBox.min.z],
      [tmpBox.min.x, tmpBox.min.y, tmpBox.max.z], [tmpBox.max.x, tmpBox.min.y, tmpBox.max.z],
      [tmpBox.min.x, tmpBox.max.y, tmpBox.max.z], [tmpBox.max.x, tmpBox.max.y, tmpBox.max.z],
    ];
    let newMinZ = Infinity;
    for (const [cx, cy, cz] of cornerOffsets) {
      // Scale is applied before rotation in Three.js SRT order
      const scaled = new THREE.Vector3(cx * scl.x, cy * scl.y, cz * scl.z);
      scaled.applyMatrix4(rotMat);
      if (scaled.z < newMinZ) newMinZ = scaled.z;
    }

    upd({
      rotation: { x: finalEuler.x, y: finalEuler.y, z: finalEuler.z },
      position: { ...pos, z: isFinite(newMinZ) ? -newMinZ : pos.z },
    });
  };

  // ── SCALE panel ──────────────────────────────────────────────────────────────
  const setScale = (axis: 'x' | 'y' | 'z', raw: string, fromMm: boolean) => {
    if (locked) return;
    const parsed = parseFloat(raw);
    if (!isFinite(parsed) || parsed <= 0) return;
    const baseMm  = bboxSize[axis] || 1;
    const newFactor = fromMm ? parsed / baseMm : parsed / 100;
    const snapped   = snapScale ? Math.round(newFactor * 20) / 20 : newFactor; // snap to 5%

    if (uniformScale) {
      const ratio = snapped / (scl[axis] || 1);
      upd({ scale: { x: scl.x * ratio, y: scl.y * ratio, z: scl.z * ratio } });
    } else {
      upd({ scale: { ...scl, [axis]: snapped } });
    }
  };

  const scalePanel = (
    <div style={panelBox}>
      {header}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: colors.textDim, width: 14 }} />
        <span style={{ fontSize: 10, color: colors.textDim, flex: 1, textAlign: 'center' }}>Size (mm)</span>
        <span style={{ fontSize: 10, color: colors.textDim, flex: 1, textAlign: 'center' }}>Scale (%)</span>
      </div>
      {(['x', 'y', 'z'] as const).map((ax, i) => {
        const sizeMm  = (bboxSize[ax] * scl[ax]).toFixed(1);
        const pct     = (scl[ax] * 100).toFixed(1);
        return (
          <div key={ax} style={rowStyle}>
            <span style={{ fontSize: 12, fontWeight: 700, color: axisColor[i], width: 14, flexShrink: 0 }}>{ax.toUpperCase()}</span>
            {numIn(sizeMm, (v) => setScale(ax, v, true),  locked, 72)}
            <span style={{ fontSize: 11, color: colors.textDim, width: 16 }}>mm</span>
            {numIn(pct,    (v) => setScale(ax, v, false), locked, 56)}
            <span style={{ fontSize: 11, color: colors.textDim }}>%</span>
          </div>
        );
      })}
      {divider}
      {checkRow('Snap Scaling',    snapScale,   () => setSnap(!snapScale))}
      {checkRow('Uniform Scaling', uniformScale, () => setUniform(!uniformScale))}
      <button
        style={{ ...btnBase, marginTop: 8, width: '100%', justifyContent: 'center', fontSize: 11 }}
        disabled={locked}
        onClick={() => upd({ scale: { x: 1, y: 1, z: 1 } })}
      >
        <RefreshCw size={11} /> Reset Scale
      </button>
    </div>
  );

  // ── ROTATE panel ─────────────────────────────────────────────────────────────
  const rotatePanel = (
    <div style={panelBox}>
      {header}
      {(['x', 'y', 'z'] as const).map((ax, i) => (
        <div key={ax} style={rowStyle}>
          <span style={{ fontSize: 12, fontWeight: 700, color: axisColor[i], width: 14, flexShrink: 0 }}>{ax.toUpperCase()}</span>
          {numIn(
            ((rot[ax] * 180) / Math.PI % 360).toFixed(1),
            (v) => { if (!locked) upd({ rotation: { ...rot, [ax]: (parseFloat(v) || 0) * Math.PI / 180 } }); },
            locked,
          )}
          <span style={{ fontSize: 11, color: colors.textDim }}>°</span>
        </div>
      ))}
      {divider}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['x', 'y', 'z'] as const).map((ax, i) => (
          <button
            key={ax}
            disabled={locked}
            style={{ ...btnBase, flex: 1, justifyContent: 'center', fontSize: 11 }}
            title={`Rotate 90° around ${ax.toUpperCase()}`}
            onClick={() => {
              const cur = rot[ax];
              upd({ rotation: { ...rot, [ax]: cur + Math.PI / 2 } });
            }}
          >
            <span style={{ color: axisColor[i], fontWeight: 700 }}>{ax.toUpperCase()}</span> +90°
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          style={{ ...btnBase, flex: 1, justifyContent: 'center', fontSize: 11 }}
          disabled={locked}
          onClick={layFlat}
          title="Rotate so the largest flat face rests on the build plate"
        >
          <ArrowDownToLine size={11} /> Lay Flat
        </button>
        <button
          style={{ ...btnBase, flex: 1, justifyContent: 'center', fontSize: 11 }}
          disabled={locked}
          onClick={() => upd({ rotation: { x: 0, y: 0, z: 0 } })}
        >
          <RefreshCw size={11} /> Reset
        </button>
      </div>
    </div>
  );

  // ── MIRROR panel ─────────────────────────────────────────────────────────────
  const mirrorPanel = (
    <div style={panelBox}>
      {header}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['x', 'y', 'z'] as const).map((ax, i) => {
          const key = `mirror${ax.toUpperCase()}` as 'mirrorX' | 'mirrorY' | 'mirrorZ';
          const active = !!(obj as { mirrorX?: boolean; mirrorY?: boolean; mirrorZ?: boolean })[key];
          return (
            <button
              key={ax}
              disabled={locked}
              style={{
                ...btnBase, flex: 1, justifyContent: 'center',
                background: active ? colors.accentDim : colors.elevated,
                border: `1px solid ${active ? colors.accent : colors.panelBorder}`,
              }}
              onClick={() => upd({ [key]: !active })}
            >
              <FlipHorizontal size={13} />
              <span style={{ color: axisColor[i], fontWeight: 700, marginLeft: 2 }}>{ax.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
      {divider}
      <div style={{ fontSize: 11, color: colors.textDim, textAlign: 'center' }}>
        Click an axis to toggle mirroring
      </div>
    </div>
  );

  // ── PER-OBJECT SETTINGS panel ────────────────────────────────────────────────
  const settingsPanel = (
    <div style={panelBox}>
      {header}
      <div style={{ fontSize: 11, color: colors.textDim, marginBottom: 8 }}>
        Override global print settings for this object only.
      </div>
      {([
        ['infillDensity',    'Infill Density',  '%', 0, 100],
        ['wallCount',        'Wall Count',      '',  1, 20 ],
        ['layerHeight',      'Layer Height',    'mm',0.05,1],
      ] as [string, string, string, number, number][]).map(([key, label, unit, min, max]) => {
        const perObj = (obj as { perObjectSettings?: Record<string, number | undefined> }).perObjectSettings ?? {};
        const val = perObj[key] ?? '';
        return (
          <div key={key} style={rowStyle}>
            <span style={{ fontSize: 12, color: colors.text, flex: 1 }}>{label}</span>
            <input
              type="number" min={min} max={max}
              placeholder="(global)"
              disabled={locked}
              style={{ ...inputStyle, width: 64, padding: '3px 6px', fontSize: 12, textAlign: 'right' }}
              value={val}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                const next = { ...perObj };
                if (v === undefined) delete next[key]; else next[key] = v;
                upd({ perObjectSettings: next });
              }}
            />
            {unit && <span style={{ fontSize: 11, color: colors.textDim, width: 18 }}>{unit}</span>}
          </div>
        );
      })}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  const panels: Record<TransformMode, React.ReactNode> = {
    move:     movePanel,
    scale:    scalePanel,
    rotate:   rotatePanel,
    mirror:   mirrorPanel,
    settings: settingsPanel,
  };

  return (
    <>
      {toolbar}
      {panels[mode]}
    </>
  );
}

// =============================================================================
// Left Panel: Objects List
// =============================================================================
function ObjectsPanel() {
  return <SlicerObjectsPanel />;
}

// =============================================================================
// Right Panel: Settings
// =============================================================================
function SettingsPanel({ onEditProfile }: { onEditProfile: (type: 'printer' | 'material' | 'print') => void }) {
  return <SlicerSettingsPanel onEditProfile={onEditProfile} />;
}

// =============================================================================
// Profile Editor Modal
// =============================================================================
function ProfileEditorModal({
  type,
  onClose,
}: {
  type: 'printer' | 'material' | 'print';
  onClose: () => void;
}) {
  return <SlicerProfileEditorModal type={type} onClose={onClose} />;
}

// =============================================================================
// Main Export: SlicerWorkspace
// ============================================================================= 
export default function SlicerWorkspace() {
  const [editingProfile, setEditingProfile] = useState<'printer' | 'material' | 'print' | null>(null);
  const [currentPage, setCurrentPage] = useState<SlicerPage>('prepare');

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bg,
      color: colors.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Workspace navigation tabs */}
      <SlicerWorkspaceNavBar currentPage={currentPage} onChangePage={setCurrentPage} />

      {/* Plugins page */}
      {currentPage === 'plugins' && <PluginsPage />}

      {/* Prepare page: left panel + 3D view + right panel (hidden when plugins active) */}
      <div style={{ flex: 1, display: currentPage === 'prepare' ? 'flex' : 'none', overflow: 'hidden' }}>
        {/* Left Panel - Objects */}
        <ObjectsPanel />

        {/* Center - 3D Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            camera={{ position: [300, -200, 250], fov: 45, near: 1, far: 10000, up: [0, 0, 1] }}
            style={{ background: colors.bg }}
          >
            <SlicerScene />
          </Canvas>
          {/* Viewport toolbar + mode-specific properties overlay */}
          <ViewportOverlays />
        </div>

        {/* Right Panel - Settings */}
        <SettingsPanel onEditProfile={(type) => setEditingProfile(type)} />
      </div>

      {/* Bottom Bar — only shown on Prepare page */}
      {currentPage === 'prepare' && <SlicerBottomBar />}

      {/* Profile Editor Modal */}
      {editingProfile && (
        <ProfileEditorModal type={editingProfile} onClose={() => setEditingProfile(null)} />
      )}
    </div>
  );
}
