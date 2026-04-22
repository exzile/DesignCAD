import * as THREE from 'three';
import type { Feature, FeatureGroup, FormCage, FormElementType, FormSelection, InterferenceResult, JointOriginRecord, Parameter, Sketch, SketchConstraint, SketchDimension, SketchEntity, SketchPlane, Tool, ViewMode, ConstructionPlane, ConstructionAxis, ConstructionPoint, ContactSetEntry } from '../../types/cad';
import type { InsertComponentParams } from '../../components/dialogs/assembly/InsertComponentDialog';
import type { DirectEditParams } from '../../components/dialogs/solid/DirectEditDialog';
import type { TextureExtrudeParams } from '../../components/dialogs/solid/TextureExtrudeDialog';
import type { ExtrudeDirection, ExtrudeOperation } from './types';

export interface CADState {
  // Tool state
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;

  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Workspace mode
  workspaceMode: 'design' | 'prepare' | 'printer';
  setWorkspaceMode: (mode: 'design' | 'prepare' | 'printer') => void;

  // Sketch state
  activeSketch: Sketch | null;
  sketches: Sketch[];
  sketchPlaneSelecting: boolean;  // true when user is picking a plane
  setSketchPlaneSelecting: (selecting: boolean) => void;
  startSketch: (plane: SketchPlane) => void;
  startSketchOnFace: (normal: THREE.Vector3, origin: THREE.Vector3) => void;
  editSketch: (id: string) => void;
  finishSketch: () => void;
  cancelSketch: () => void;
  addSketchEntity: (entity: SketchEntity) => void;
  replaceSketchEntities: (entities: SketchEntity[]) => void;
  /** D57: toggle a single entity's linetype (line ↔ construction-line ↔ centerline) */
  cycleEntityLinetype: (entityId: string) => void;
  /** S6: remove the 'linked' flag on a projected entity so it becomes an independent editable entity */
  breakProjectionLink: (entityId: string) => void;
  copySketch: (id: string) => void;
  deleteSketch: (id: string) => void;
  renameSketch: (id: string, name: string) => void;
  /** D60: Redefine the plane of an existing sketch */
  redefineSketchPlane: (id: string, plane: SketchPlane, normal: THREE.Vector3, origin: THREE.Vector3) => void;
  /** D50: Auto-detect and apply geometric constraints (horizontal/vertical/coincident/parallel/equal) */
  autoConstrainSketch: () => void;
  /** D27: Run the Newton-Raphson constraint solver on the active sketch. */
  solveSketch: () => void;
  /** CORR-7: when true, constraint solver is not called automatically on entity/constraint changes */
  sketchComputeDeferred: boolean;
  setSketchComputeDeferred: (v: boolean) => void;
  // D52: Constraint application state — accumulates clicked entity IDs before applying
  constraintSelection: string[];
  setConstraintSelection: (ids: string[]) => void;
  addToConstraintSelection: (id: string) => void;
  clearConstraintSelection: () => void;
  /** SK-A9: offset distance for the 'constrain-offset' tool */
  constraintOffsetValue: number;
  setConstraintOffsetValue: (v: number) => void;
  /** SK-A1: surface constraint pending surface pick */
  constraintSurfacePlane: { nu: number; nv: number; d: number } | null;
  setConstraintSurfacePlane: (plane: { nu: number; nv: number; d: number } | null) => void;
  /** D52: Add a single constraint to the active sketch (deduplicates by type+entityIds). */
  addSketchConstraint: (constraint: SketchConstraint) => void;

  // Feature timeline
  features: Feature[];
  addFeature: (feature: Feature) => void;
  addPrimitive: (kind: 'box' | 'cylinder' | 'sphere' | 'torus' | 'coil', params: Record<string, number>) => void;
  /** D194: Insert a fastener from the fastener library as a solid body feature. */
  insertFastener: (params: {
    type: string; size: string;
    diameter: number; headDiameter: number; headHeight: number; length: number;
    x: number; y: number; z: number;
  }) => void;
  /** D195: import selected items from a derived source file */
  deriveFromDesign: (itemIds: string[], sourceFileName: string) => void;
  /** D119: Clone a feature's geometry as a new mesh-body primitive. */
  tessellateFeature: (featureId: string) => void;
  removeFeature: (id: string) => void;
  renameFeature: (id: string, name: string) => void;
  toggleFeatureVisibility: (id: string) => void;
  toggleFeatureSuppressed: (id: string) => void;
  /** D186: Feature currently being edited via a dialog (pre-fills dialog values). */
  editingFeatureId: string | null;
  setEditingFeatureId: (id: string | null) => void;
  /** D186: Update params on an existing feature in-place. */
  updateFeatureParams: (id: string, params: Feature['params']) => void;
  /** D189: Move a feature to a new position in the timeline. */
  reorderFeature: (id: string, newIndex: number) => void;
  /** D190: Rollback index — features at index >= this are skipped when rendering. */
  rollbackIndex: number;
  setRollbackIndex: (index: number) => void;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;

  // MM3 — Base Feature container
  baseFeatureActive: boolean;
  openBaseFeature: (name: string) => void;
  finishBaseFeature: () => void;

  // MM4 — Timeline feature groups
  featureGroups: FeatureGroup[];
  createFeatureGroup: (name: string, featureIds: string[]) => void;
  renameFeatureGroup: (groupId: string, name: string) => void;
  deleteFeatureGroup: (groupId: string) => void;
  toggleFeatureGroup: (groupId: string) => void;
  /** CTX-12: Move a feature into an existing group (or pass null to ungroup) */
  moveFeatureToGroup: (featureId: string, groupId: string | null) => void;
  /** CORR-17: Nest a group inside another group (or pass null to move to top level) */
  nestGroupInGroup: (childGroupId: string, parentGroupId: string | null) => void;

  // Selection
  selectedEntityIds: string[];
  setSelectedEntityIds: (ids: string[]) => void;
  toggleEntitySelection: (id: string) => void;

  // D204 — Window Selection
  windowSelecting: boolean;
  windowSelectStart: { x: number; y: number } | null;
  windowSelectEnd: { x: number; y: number } | null;
  setWindowSelectStart: (p: { x: number; y: number }) => void;
  setWindowSelectEnd: (p: { x: number; y: number }) => void;
  clearWindowSelect: () => void;

  // D205 — Lasso Selection
  lassoSelecting: boolean;
  lassoPoints: { x: number; y: number }[];
  setLassoSelecting: (v: boolean) => void;
  setLassoPoints: (pts: { x: number; y: number }[]) => void;
  clearLasso: () => void;

  // ── Form (T-Spline / subdivision) state ─────────────────────────────
  formBodies: FormCage[];
  activeFormBodyId: string | null;
  formSelection: FormSelection | null;
  addFormBody: (cage: FormCage) => void;
  removeFormBody: (id: string) => void;
  setActiveFormBody: (id: string | null) => void;
  setFormSelection: (sel: FormSelection | null) => void;
  /** D167: Remove selected vertices/edges/faces from the active cage. */
  deleteFormElements: (type: FormElementType, ids: string[]) => void;
  /** D152: Move one or more vertices in a cage by updating their positions. */
  updateFormVertices: (bodyId: string, updates: { id: string; position: [number, number, number] }[]) => void;
  /** D155: Set the subdivision level (1–5) of a form body. */
  setFormBodySubdivisionLevel: (id: string, level: number) => void;
  /** D160: Set crease value on all vertices of a form body (0 = uncrease, 1 = crease). */
  setFormBodyCrease: (id: string, crease: number) => void;
  /** D166: Frozen vertices — dragging is blocked for these vertex ids. */
  frozenFormVertices: string[];
  toggleFrozenFormVertex: (id: string) => void;

  // Grid & snap
  gridSize: number;
  setGridSize: (size: number) => void;
  /** S7: Per-sketch grid spacing override (null = use global gridSize). */
  sketchGridSize: number | null;
  setSketchGridSize: (size: number | null) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  // NAV-24: per-type object snap toggles (master toggle + six types)
  objectSnapEnabled: boolean;
  setObjectSnapEnabled: (v: boolean) => void;
  snapToEndpoint: boolean;
  setSnapToEndpoint: (v: boolean) => void;
  snapToMidpoint: boolean;
  setSnapToMidpoint: (v: boolean) => void;
  snapToCenter: boolean;
  setSnapToCenter: (v: boolean) => void;
  snapToIntersection: boolean;
  setSnapToIntersection: (v: boolean) => void;
  snapToPerpendicular: boolean;
  setSnapToPerpendicular: (v: boolean) => void;
  snapToTangent: boolean;
  setSnapToTangent: (v: boolean) => void;

  // Sketch tool options
  sketchPolygonSides: number;
  setSketchPolygonSides: (sides: number) => void;
  sketchFilletRadius: number;
  setSketchFilletRadius: (r: number) => void;
  sketchSlotWidth: number;
  setSketchSlotWidth: (w: number) => void;
  // Sketch pattern state (D22/D23)
  sketchRectPatternCountX: number;
  sketchRectPatternCountY: number;
  sketchRectPatternSpacingX: number;
  sketchRectPatternSpacingY: number;
  setSketchRectPattern: (params: { countX?: number; countY?: number; spacingX?: number; spacingY?: number }) => void;
  commitSketchRectPattern: () => void;
  sketchCircPatternCount: number;
  sketchCircPatternRadius: number;
  sketchCircPatternAngle: number; // total sweep angle in degrees
  setSketchCircPattern: (params: { count?: number; radius?: number; angle?: number }) => void;
  commitSketchCircPattern: () => void;
  // SK-A2: Sketch Pattern on Path
  sketchPathPatternCount: number;
  sketchPathPatternPathEntityId: string;
  sketchPathPatternAlignment: 'tangent' | 'fixed';
  setSketchPathPattern: (params: { count?: number; pathEntityId?: string; alignment?: 'tangent' | 'fixed' }) => void;
  commitSketchPathPattern: () => void;
  // Sketch transform state (D24/D25/D26)
  sketchMoveDx: number;
  sketchMoveDy: number;
  sketchMoveCopy: boolean;
  setSketchMove: (params: { dx?: number; dy?: number; copy?: boolean }) => void;
  commitSketchMove: () => void;
  sketchScaleFactor: number;
  setSketchScaleFactor: (f: number) => void;
  commitSketchScale: () => void;
  sketchRotateAngle: number; // degrees
  setSketchRotateAngle: (a: number) => void;
  commitSketchRotate: () => void;
  // Sketch offset (D20)
  sketchOffsetDistance: number;
  setSketchOffsetDistance: (d: number) => void;
  // Sketch mirror (D21)
  sketchMirrorAxis: 'horizontal' | 'vertical' | 'diagonal';
  setSketchMirrorAxis: (axis: 'horizontal' | 'vertical' | 'diagonal') => void;
  commitSketchMirror: () => void;
  // Conic curve rho (D11)
  conicRho: number;
  setConicRho: (r: number) => void;
  // Tangent circles (D40, D41)
  tangentCircleRadius: number;
  setTangentCircleRadius: (r: number) => void;
  // Blend curve continuity (D44)
  blendCurveMode: 'g1' | 'g2';
  setBlendCurveMode: (mode: 'g1' | 'g2') => void;
  // Sketch chamfer (D47)
  sketchChamferDist1: number;
  setSketchChamferDist1: (d: number) => void;
  sketchChamferDist2: number;
  setSketchChamferDist2: (d: number) => void;
  sketchChamferAngle: number;
  setSketchChamferAngle: (a: number) => void;
  // Show Profile toggle (D55)
  showSketchProfile: boolean;
  setShowSketchProfile: (show: boolean) => void;
  // Slice toggle (D54)
  sliceEnabled: boolean;
  setSliceEnabled: (enabled: boolean) => void;
  // D58: 3D Sketch mode — shows planar manipulator gizmo
  sketch3DMode: boolean;
  setSketch3DMode: (v: boolean) => void;
  toggleSketch3DMode: () => void;
  // S7: active draw plane override for 3D sketch multi-plane support
  sketch3DActivePlane: { normal: [number, number, number]; origin: [number, number, number] } | null;
  setSketch3DActivePlane: (plane: { normal: [number, number, number]; origin: [number, number, number] } | null) => void;
  // Section Analysis (D38)
  sectionEnabled: boolean;
  sectionAxis: 'x' | 'y' | 'z';
  sectionOffset: number;
  sectionFlip: boolean;
  setSectionEnabled: (enabled: boolean) => void;
  setSectionAxis: (axis: 'x' | 'y' | 'z') => void;
  setSectionOffset: (offset: number) => void;
  setSectionFlip: (flip: boolean) => void;
  // D182 – Component color overlay
  showComponentColors: boolean;
  setShowComponentColors: (v: boolean) => void;

  // D185 – Canvas reference images
  canvasReferences: Array<{ id: string; dataUrl: string; plane: string; offsetX: number; offsetY: number; scale: number; opacity: number }>;
  addCanvasReference: (ref: { id: string; dataUrl: string; plane: string; offsetX: number; offsetY: number; scale: number; opacity: number }) => void;
  removeCanvasReference: (id: string) => void;

  // Visibility toggles (D56)
  showSketchPoints: boolean;
  setShowSketchPoints: (v: boolean) => void;
  showSketchDimensions: boolean;
  setShowSketchDimensions: (v: boolean) => void;
  showSketchConstraints: boolean;
  setShowSketchConstraints: (v: boolean) => void;
  showProjectedGeometries: boolean;
  setShowProjectedGeometries: (v: boolean) => void;
  /** SK-A7: toggle construction geometry visibility in the active sketch */
  showConstructionGeometries: boolean;
  setShowConstructionGeometries: (v: boolean) => void;
  gridVisible: boolean;
  setGridVisible: (visible: boolean) => void;
  gridLocked: boolean;
  setGridLocked: (locked: boolean) => void;
  incrementalMove: boolean;
  setIncrementalMove: (enabled: boolean) => void;
  moveIncrement: number;
  setMoveIncrement: (value: number) => void;
  rotateIncrement: number;
  setRotateIncrement: (value: number) => void;

  // Visual style
  visualStyle: 'shaded' | 'shadedEdges' | 'wireframe' | 'hiddenLines';
  setVisualStyle: (style: 'shaded' | 'shadedEdges' | 'wireframe' | 'hiddenLines') => void;
  showEnvironment: boolean;
  setShowEnvironment: (show: boolean) => void;
  showShadows: boolean;
  setShowShadows: (show: boolean) => void;
  showReflections: boolean;
  setShowReflections: (show: boolean) => void;
  showGroundPlane: boolean;
  setShowGroundPlane: (show: boolean) => void;
  // NAV-25: ground plane Y offset
  groundPlaneOffset: number;
  setGroundPlaneOffset: (v: number) => void;
  // NAV-26: shadow softness (ContactShadows blur)
  shadowSoftness: number;
  setShadowSoftness: (v: number) => void;
  // NAV-21: Ambient Occlusion (SSAO via @react-three/postprocessing)
  ambientOcclusionEnabled: boolean;
  setAmbientOcclusionEnabled: (enabled: boolean) => void;
  environmentPreset: string;
  setEnvironmentPreset: (preset: string) => void;

  // NAV-23: Object Visibility per entity type
  entityVisSketchBodies: boolean;   // non-active sketch outlines
  entityVisConstruction: boolean;    // construction planes/axes/points
  entityVisOrigins: boolean;         // world axes (X/Y/Z)
  entityVisJoints: boolean;          // joint gizmos
  setEntityVisSketchBodies: (v: boolean) => void;
  setEntityVisConstruction: (v: boolean) => void;
  setEntityVisOrigins: (v: boolean) => void;
  setEntityVisJoints: (v: boolean) => void;

  // NAV-20: Camera projection
  cameraProjection: 'perspective' | 'orthographic';
  setCameraProjection: (p: 'perspective' | 'orthographic') => void;

  // Camera target orientation (for ViewCube animated transitions)
  cameraTargetQuaternion: THREE.Quaternion | null;
  setCameraTargetQuaternion: (q: THREE.Quaternion | null) => void;
  // Orbit pivot to lerp toward during the next animation (e.g. sketch origin
  // when entering sketch mode). Captured by CameraController on animation start.
  cameraTargetOrbit: THREE.Vector3 | null;
  setCameraTargetOrbit: (v: THREE.Vector3 | null) => void;

  // Extrude tool (Fusion 360-style interactive extrude)
  extrudeSelectedSketchId: string | null;
  extrudeSelectedSketchIds: string[];
  setExtrudeSelectedSketchId: (id: string | null) => void;
  setExtrudeSelectedSketchIds: (ids: string[]) => void;
  extrudeDistance: number;
  setExtrudeDistance: (distance: number) => void;
  /** CORR-2: second side distance used when direction === 'two-sides' */
  extrudeDistance2: number;
  setExtrudeDistance2: (distance: number) => void;
  extrudeDirection: ExtrudeDirection;
  setExtrudeDirection: (d: ExtrudeDirection) => void;
  extrudeOperation: ExtrudeOperation;
  setExtrudeOperation: (o: ExtrudeOperation) => void;
  startExtrudeTool: () => void;
  startExtrudeFromFace: (boundary: THREE.Vector3[], normal: THREE.Vector3, centroid: THREE.Vector3) => void;
  /** EX-13: load an existing extrude feature into the panel for editing. */
  loadExtrudeForEdit: (featureId: string) => void;
  cancelExtrudeTool: () => void;
  commitExtrude: () => void;
  // Thin extrude (D66)
  extrudeThinEnabled: boolean;
  setExtrudeThinEnabled: (v: boolean) => void;
  extrudeThinThickness: number;
  setExtrudeThinThickness: (t: number) => void;
  extrudeThinSide: 'side1' | 'side2' | 'center';
  setExtrudeThinSide: (s: 'side1' | 'side2' | 'center') => void;
  // EX-7: independent wall location per side for two-sided thin extrude
  extrudeThinSide2: 'side1' | 'side2' | 'center';
  setExtrudeThinSide2: (s: 'side1' | 'side2' | 'center') => void;
  // EX-8: independent thickness per side for two-sided thin extrude
  extrudeThinThickness2: number;
  setExtrudeThinThickness2: (t: number) => void;
  // Extrude start options (D67 / CORR-8)
  extrudeStartType: 'profile' | 'offset' | 'entity';
  setExtrudeStartType: (t: 'profile' | 'offset' | 'entity') => void;
  extrudeStartOffset: number;
  setExtrudeStartOffset: (v: number) => void;
  // CORR-8: EntityStartDefinition — face/plane ID to start from
  extrudeStartEntityId: string | null;
  setExtrudeStartEntityId: (id: string | null) => void;
  /** EX-4: face normal + centroid for From-Entity start (picked via viewport) */
  extrudeStartFaceNormal: [number, number, number] | null;
  extrudeStartFaceCentroid: [number, number, number] | null;
  setExtrudeStartFace: (normal: [number, number, number], centroid: [number, number, number]) => void;
  clearExtrudeStartFace: () => void;
  // Extrude extent types (D68) — EX-3: added 'to-object'
  extrudeExtentType: 'distance' | 'all' | 'to-object';
  setExtrudeExtentType: (t: 'distance' | 'all' | 'to-object') => void;
  // EX-10: independent extent type for side 2 when direction=two-sides
  extrudeExtentType2: 'distance' | 'all' | 'to-object';
  setExtrudeExtentType2: (t: 'distance' | 'all' | 'to-object') => void;
  /** EX-3: face data for To-Object terminus (picked via viewport) */
  extrudeToEntityFaceId: string | null;
  extrudeToEntityFaceNormal: [number, number, number] | null;
  extrudeToEntityFaceCentroid: [number, number, number] | null;
  setExtrudeToEntityFace: (id: string, normal: [number, number, number], centroid: [number, number, number]) => void;
  clearExtrudeToEntityFace: () => void;
  /** EX-12: directionHint — flip the "to-object" direction when the face is behind the profile */
  extrudeToObjectFlipDirection: boolean;
  setExtrudeToObjectFlipDirection: (v: boolean) => void;
  /** EX-11: add a planar face as an additional profile while a sketch is already selected */
  addFaceToExtrude: (boundary: THREE.Vector3[], normal: THREE.Vector3, centroid: THREE.Vector3) => void;
  // Extrude taper angle (D69)
  extrudeTaperAngle: number;
  setExtrudeTaperAngle: (a: number) => void;
  // EX-6: independent taper angle for side 2
  extrudeTaperAngle2: number;
  setExtrudeTaperAngle2: (a: number) => void;
  // Symmetric full-length toggle (EX-5)
  extrudeSymmetricFullLength: boolean;
  setExtrudeSymmetricFullLength: (v: boolean) => void;
  // Extrude body kind (D102)
  extrudeBodyKind: 'solid' | 'surface';
  setExtrudeBodyKind: (k: 'solid' | 'surface') => void;
  // EX-9 / CORR-14: participant bodies (empty = apply to all)
  extrudeParticipantBodyIds: string[];
  setExtrudeParticipantBodyIds: (ids: string[]) => void;
  // SDK-12: confined faces (bounding faces that restrict extude extent)
  extrudeConfinedFaceIds: string[];
  setExtrudeConfinedFaceIds: (ids: string[]) => void;
  // EX-15: creationOccurrence — the ComponentOccurrence context the profile lives in (CORR-4 prerequisite now satisfied)
  extrudeCreationOccurrence: string | null;
  setExtrudeCreationOccurrence: (id: string | null) => void;
  // EX-16: targetBaseFeature — direct-modeling context: place this extrude inside a base feature container
  extrudeTargetBaseFeature: string | null;
  setExtrudeTargetBaseFeature: (id: string | null) => void;

  // Revolve tool
  revolveSelectedSketchId: string | null;
  setRevolveSelectedSketchId: (id: string | null) => void;
  revolveAxis: 'X' | 'Y' | 'Z' | 'centerline';
  setRevolveAxis: (a: 'X' | 'Y' | 'Z' | 'centerline') => void;
  revolveAngle: number;
  setRevolveAngle: (angle: number) => void;
  // Revolve direction modes (D70)
  revolveDirection: 'one-side' | 'symmetric' | 'two-sides';
  setRevolveDirection: (d: 'one-side' | 'symmetric' | 'two-sides') => void;
  revolveAngle2: number;
  setRevolveAngle2: (a: number) => void;
  // Revolve body kind (D103)
  revolveBodyKind: 'solid' | 'surface';
  setRevolveBodyKind: (k: 'solid' | 'surface') => void;
  // CORR-10: project axis onto profile plane before revolving
  revolveIsProjectAxis: boolean;
  setRevolveIsProjectAxis: (v: boolean) => void;
  revolveProfileMode: 'sketch' | 'face';
  setRevolveProfileMode: (m: 'sketch' | 'face') => void;
  revolveFaceBoundary: number[] | null;
  revolveFaceNormal: [number, number, number] | null;
  startRevolveFromFace: (boundary: THREE.Vector3[], normal: THREE.Vector3) => void;
  startRevolveTool: () => void;
  cancelRevolveTool: () => void;
  commitRevolve: () => void;

  // Sweep tool (D30)
  sweepProfileSketchId: string | null;
  setSweepProfileSketchId: (id: string | null) => void;
  sweepPathSketchId: string | null;
  setSweepPathSketchId: (id: string | null) => void;
  // D104 surface sweep
  sweepBodyKind: 'solid' | 'surface';
  setSweepBodyKind: (k: 'solid' | 'surface') => void;
  // D71 sweep upgrades
  sweepOrientation: 'perpendicular' | 'parallel' | 'default';
  sweepProfileScaling: 'none' | 'scale-to-path' | 'scale-to-rail';  // SDK-4
  sweepTwistAngle: number;
  sweepTaperAngle: number;
  sweepGuideRailId: string | null;
  sweepOperation: 'new-body' | 'join' | 'cut';
  sweepDistance: 'entire' | 'distance';
  // SDK-5: path parametric start/end (0–1 fraction of path length)
  sweepDistanceOne: number;
  sweepDistanceTwo: number;
  setSweepDistanceOne: (v: number) => void;
  setSweepDistanceTwo: (v: number) => void;
  setSweepOrientation: (v: 'perpendicular' | 'parallel' | 'default') => void;
  setSweepProfileScaling: (v: 'none' | 'scale-to-path' | 'scale-to-rail') => void;  // SDK-4
  setSweepTwistAngle: (v: number) => void;
  setSweepTaperAngle: (v: number) => void;
  setSweepGuideRailId: (v: string | null) => void;
  setSweepOperation: (v: 'new-body' | 'join' | 'cut') => void;
  setSweepDistance: (v: 'entire' | 'distance') => void;
  startSweepTool: () => void;
  cancelSweepTool: () => void;
  commitSweep: () => void;

  // Loft tool (D31 / D105)
  loftProfileSketchIds: string[];
  setLoftProfileSketchIds: (ids: string[]) => void;
  loftBodyKind: 'solid' | 'surface';
  setLoftBodyKind: (k: 'solid' | 'surface') => void;
  // D72 loft upgrades
  loftClosed: boolean;
  loftTangentEdgesMerged: boolean;  // SDK-8
  loftStartCondition: 'free' | 'tangent' | 'curvature';
  loftEndCondition: 'free' | 'tangent' | 'curvature';
  loftRailSketchId: string | null;
  setLoftClosed: (v: boolean) => void;
  setLoftTangentEdgesMerged: (v: boolean) => void;  // SDK-8
  setLoftStartCondition: (v: 'free' | 'tangent' | 'curvature') => void;
  setLoftEndCondition: (v: 'free' | 'tangent' | 'curvature') => void;
  setLoftRailSketchId: (v: string | null) => void;
  startLoftTool: () => void;
  cancelLoftTool: () => void;
  commitLoft: () => void;

  // Patch tool (D106)
  patchSelectedSketchId: string | null;
  setPatchSelectedSketchId: (id: string | null) => void;
  startPatchTool: () => void;
  cancelPatchTool: () => void;
  commitPatch: () => void;

  // Ruled Surface tool (D107)
  ruledSketchAId: string | null;
  setRuledSketchAId: (id: string | null) => void;
  ruledSketchBId: string | null;
  setRuledSketchBId: (id: string | null) => void;
  startRuledSurfaceTool: () => void;
  cancelRuledSurfaceTool: () => void;
  commitRuledSurface: () => void;

  // Rib tool (D73)
  ribSelectedSketchId: string | null;
  setRibSelectedSketchId: (id: string | null) => void;
  ribThickness: number;
  setRibThickness: (t: number) => void;
  ribHeight: number;
  setRibHeight: (h: number) => void;
  ribDirection: 'normal' | 'flip' | 'symmetric';
  setRibDirection: (d: 'normal' | 'flip' | 'symmetric') => void;
  startRibTool: () => void;
  cancelRibTool: () => void;
  commitRib: () => void;

  // Export dialog
  showExportDialog: boolean;
  setShowExportDialog: (show: boolean) => void;

  // D125 Mesh Reduce
  reduceMesh: (featureId: string, reductionPercent: number) => void;
  // D115 Reverse Normals
  reverseNormals: (featureId: string) => void;

  // UTL1 — Show All / Hide
  showAllFeatures: () => void;
  hideFeature: (id: string) => void;

  // MSH8 — Reverse Normal (commit)
  commitReverseNormal: (featureId: string) => void;

  // MSH7 — Mesh Combine (commit)
  commitMeshCombine: (featureIds: string[]) => void;

  // MSH11 — Mesh Transform (commit)
  commitMeshTransform: (featureId: string, params: { tx: number; ty: number; tz: number; rx: number; ry: number; rz: number; scale: number }) => void;

  // SLD13 — Scale (commit)
  commitScale: (featureId: string, sx: number, sy: number, sz: number) => void;

  // SLD12 — Combine / Boolean (commit)
  commitCombine: (targetFeatureId: string, toolFeatureId: string, operation: 'join' | 'cut' | 'intersect', keepTool: boolean) => void;

  // SLD17 — Mirror feature (commit)
  commitMirrorFeature: (featureId: string, plane: 'XY' | 'XZ' | 'YZ') => void;

  // D6 Fillet edge selection
  filletEdgeIds: string[];
  addFilletEdge: (id: string) => void;
  removeFilletEdge: (id: string) => void;
  clearFilletEdges: () => void;

  // D7 Chamfer edge selection
  chamferEdgeIds: string[];
  addChamferEdge: (id: string) => void;
  removeChamferEdge: (id: string) => void;
  clearChamferEdges: () => void;

  // Active feature dialog
  activeDialog: string | null;
  setActiveDialog: (dialog: string | null) => void;
  dialogPayload: string | null;
  setDialogPayload: (payload: string | null) => void;

  // Measure
  measurePoints: { x: number; y: number; z: number }[];
  setMeasurePoints: (pts: { x: number; y: number; z: number }[]) => void;
  clearMeasure: () => void;

  // Status
  statusMessage: string;
  setStatusMessage: (message: string) => void;

  // Units
  units: 'mm' | 'cm' | 'in';
  setUnits: (units: 'mm' | 'cm' | 'in') => void;
  // D39/D206 Selection Filter — multi-toggle object
  selectionFilter: {
    bodies: boolean;
    faces: boolean;
    edges: boolean;
    vertices: boolean;
    sketches: boolean;
    construction: boolean;
  };
  setSelectionFilter: (f: Partial<CADState['selectionFilter']>) => void;

  // D207 — Sketch Grid / Snap settings
  sketchGridEnabled: boolean;
  sketchSnapEnabled: boolean;
  setSketchGridEnabled: (v: boolean) => void;
  setSketchSnapEnabled: (v: boolean) => void;

  // Camera
  cameraHomeCounter: number;
  triggerCameraHome: () => void;
  cameraNavMode: 'orbit' | 'pan' | 'zoom' | 'zoom-window' | 'look-at' | null;
  setCameraNavMode: (mode: 'orbit' | 'pan' | 'zoom' | 'zoom-window' | 'look-at' | null) => void;
  // NAV-19: multi-viewport layout
  viewportLayout: '1' | '2h' | '2v' | '4';
  setViewportLayout: (layout: '1' | '2h' | '2v' | '4') => void;
  zoomToFitCounter: number;
  triggerZoomToFit: () => void;
  // NAV-5: Zoom Window
  zoomWindowTrigger: { x1: number; y1: number; x2: number; y2: number; vpW: number; vpH: number } | null;
  triggerZoomWindow: (rect: { x1: number; y1: number; x2: number; y2: number; vpW: number; vpH: number }) => void;
  clearZoomWindow: () => void;

  // Parameters
  parameters: Parameter[];
  addParameter: (name: string, expression: string, description?: string, group?: string) => void;
  updateParameter: (id: string, updates: Partial<Pick<Parameter, 'name' | 'expression' | 'description' | 'group'>>) => void;
  removeParameter: (id: string) => void;
  evaluateExpression: (expr: string) => number | null;

  // A5 — ground/unground a component (stub; components array populated in A1)
  groundComponent: (id: string, grounded: boolean) => void;

  // D12 — Sketch Text tool
  sketchTextContent: string;
  sketchTextHeight: number;
  sketchTextFont: string;
  /** SK-A6: bold / italic formatting flags */
  sketchTextBold: boolean;
  sketchTextItalic: boolean;
  setSketchTextContent: (v: string) => void;
  setSketchTextHeight: (v: number) => void;
  setSketchTextFont: (v: string) => void;
  setSketchTextBold: (v: boolean) => void;
  setSketchTextItalic: (v: boolean) => void;
  startSketchTextTool: () => void;
  commitSketchTextEntities: (segments: Array<{ x1: number; y1: number; z1: number; x2: number; y2: number; z2: number }>) => void;
  cancelSketchTextTool: () => void;

  // D28 — Dimension tool
  activeDimensionType: 'linear' | 'angular' | 'radial' | 'diameter' | 'arc-length' | 'aligned';
  dimensionOffset: number;
  /** SK-A3: when true, newly created dimensions are marked driven (reference) */
  dimensionDrivenMode: boolean;
  /** CORR-1: orientation for newly created linear/aligned dimensions */
  dimensionOrientation: 'horizontal' | 'vertical' | 'auto';
  /** SK-A8: tolerance mode and values for newly created dimensions */
  dimensionToleranceMode: 'none' | 'symmetric' | 'deviation';
  dimensionToleranceUpper: number;
  dimensionToleranceLower: number;
  pendingDimensionEntityIds: string[];
  setActiveDimensionType: (t: 'linear' | 'angular' | 'radial' | 'diameter' | 'arc-length' | 'aligned') => void;
  setDimensionOffset: (v: number) => void;
  setDimensionDrivenMode: (v: boolean) => void;
  setDimensionOrientation: (v: 'horizontal' | 'vertical' | 'auto') => void;
  setDimensionToleranceMode: (v: 'none' | 'symmetric' | 'deviation') => void;
  setDimensionToleranceUpper: (v: number) => void;
  setDimensionToleranceLower: (v: number) => void;
  startDimensionTool: () => void;
  cancelDimensionTool: () => void;
  addPendingDimensionEntity: (id: string) => void;
  addSketchDimension: (dim: SketchDimension) => void;
  removeDimension: (dimId: string) => void;

  // A9 — Component Pattern (linear/circular array of component instances)
  createComponentPattern: (
    sourceId: string,
    type: 'linear' | 'circular',
    params: { axis: 'X' | 'Y' | 'Z'; count: number; spacing: number; circularAxis: 'X' | 'Y' | 'Z'; circularCount: number }
  ) => void;

  // S10 — Spline post-commit handle editing
  editingSplineEntityId: string | null;
  hoveredSplinePointIndex: number | null;
  draggingSplinePointIndex: number | null;
  setEditingSplineEntityId: (id: string | null) => void;
  setHoveredSplinePointIndex: (i: number | null) => void;
  setDraggingSplinePointIndex: (i: number | null) => void;
  updateSplineControlPoint: (entityId: string, pointIndex: number, x: number, y: number, z: number) => void;

  // D45 — Project / Include live-link toggle
  projectLiveLink: boolean;
  setProjectLiveLink: (v: boolean) => void;
  cancelSketchProjectTool: () => void;

  // S3 — Intersection Curve
  startSketchIntersectTool: () => void;
  cancelSketchIntersectTool: () => void;

  // D46 — Project to Surface
  startSketchProjectSurfaceTool: () => void;
  cancelSketchProjectSurfaceTool: () => void;

  // ── CONSTRUCTION GEOMETRY (D175–D180) ──
  constructionPlanes: ConstructionPlane[];
  constructionAxes: ConstructionAxis[];
  constructionPoints: ConstructionPoint[];
  addConstructionPlane: (p: Omit<ConstructionPlane, 'id' | 'name'>) => void;
  addConstructionAxis: (a: Omit<ConstructionAxis, 'id' | 'name'>) => void;
  addConstructionPoint: (p: Omit<ConstructionPoint, 'id' | 'name'>) => void;
  cancelConstructTool: () => void;

  // ── D171 Replace Face ────────────────────────────────────────────────────
  replaceFaceSourceId: string | null;
  replaceFaceTargetId: string | null;
  openReplaceFaceDialog: () => void;
  setReplaceFaceSource: (id: string) => void;
  setReplaceFaceTarget: (id: string) => void;
  commitReplaceFace: () => void;

  // ── D192 Decal ───────────────────────────────────────────────────────────
  decalFaceId: string | null;
  decalFaceNormal: [number, number, number] | null;
  decalFaceCentroid: [number, number, number] | null;
  openDecalDialog: () => void;
  setDecalFace: (id: string, normal: [number, number, number], centroid: [number, number, number]) => void;
  closeDecalDialog: () => void;
  commitDecal: (params: import('../../components/dialogs/insert/DecalDialog').DecalParams) => void;

  // ── D193 Attached Canvas ─────────────────────────────────────────────────
  attachedCanvasId: string | null;
  openAttachedCanvasDialog: (canvasId?: string) => void;
  closeAttachedCanvasDialog: () => void;
  updateCanvas: (id: string, changes: Partial<{ dataUrl: string; plane: string; offsetX: number; offsetY: number; scale: number; opacity: number }>) => void;

  // ── D182 Lip/Groove edge picker ──────────────────────────────────────────
  lipGrooveEdgeId: string | null;
  setLipGrooveEdge: (id: string | null) => void;

  // ── D183 Snap-Fit face picker ────────────────────────────────────────────
  snapFitFaceId: string | null;
  setSnapFitFace: (id: string | null) => void;

  // ── D185 Split Face ──────────────────────────────────────────────────────
  splitFaceId: string | null;
  openSplitFaceDialog: () => void;
  setSplitFace: (id: string) => void;
  closeSplitFaceDialog: () => void;
  commitSplitFace: (params: import('../../components/dialogs/solid/SplitFaceDialog').SplitFaceParams) => void;

  // ── Hole face placement ──────────────────────────────────────────────────
  holeFaceId: string | null;
  holeFaceNormal: [number, number, number] | null;
  holeFaceCentroid: [number, number, number] | null;
  /** Live diameter shared between the dialog and the in-viewport floating chip. */
  holeDraftDiameter: number;
  /** Live depth shared between the dialog and the cylindrical preview. */
  holeDraftDepth: number;
  openHoleDialog: () => void;
  setHoleFace: (
    id: string,
    normal: [number, number, number],
    centroid: [number, number, number],
  ) => void;
  clearHoleFace: () => void;
  setHoleDraftDiameter: (d: number) => void;
  setHoleDraftDepth: (d: number) => void;
  closeHoleDialog: () => void;

  // ── SOL-I2: Shell face removal selection ────────────────────────────────
  shellRemoveFaceIds: string[];
  addShellRemoveFace: (id: string) => void;
  removeShellRemoveFace: (id: string) => void;
  clearShellRemoveFaces: () => void;

  // ── SOL-I7: Shell individual face thickness overrides ────────────────────
  shellFaceThicknesses: Record<string, number>;
  setShellFaceThickness: (faceId: string, thickness: number) => void;
  clearShellFaceThicknesses: () => void;

  // ── SOL-I3: Draft parting line face picker ───────────────────────────────
  draftPartingFaceId: string | null;
  draftPartingFaceNormal: [number, number, number] | null;
  draftPartingFaceCentroid: [number, number, number] | null;
  setDraftPartingFace: (
    id: string,
    normal: [number, number, number],
    centroid: [number, number, number],
  ) => void;
  clearDraftPartingFace: () => void;

  // ── SOL-I5: Remove Face face picker ─────────────────────────────────────
  removeFaceFaceId: string | null;
  removeFaceFaceNormal: [number, number, number] | null;
  removeFaceFaceCentroid: [number, number, number] | null;
  setRemoveFaceFace: (
    id: string,
    normal: [number, number, number],
    centroid: [number, number, number],
  ) => void;
  clearRemoveFaceFace: () => void;

  // ── CTX-8: Mesh export trigger ───────────────────────────────────────────
  exportBodyId: string | null;
  exportBodyFormat: 'stl' | 'glb' | null;
  triggerBodyExport: (bodyId: string, format: 'stl' | 'glb') => void;
  clearBodyExport: () => void;

  // ── D183 Bounding Solid ──────────────────────────────────────────────────
  openBoundingSolidDialog: () => void;
  closeBoundingSolidDialog: () => void;
  commitBoundingSolid: (params: import('../../components/dialogs/solid/BoundingSolidDialog').BoundingSolidParams) => void;

  // ── D123 Direct Edit ────────────────────────────────────────────────────
  directEditFaceId: string | null;
  openDirectEditDialog: () => void;
  setDirectEditFace: (id: string) => void;
  commitDirectEdit: (params: DirectEditParams) => void;

  // ── D137 Texture Extrude ────────────────────────────────────────────────
  textureExtrudeFaceId: string | null;
  openTextureExtrudeDialog: () => void;
  setTextureExtrudeFace: (id: string) => void;
  commitTextureExtrude: (params: TextureExtrudeParams) => void;

  // ── A11 — Joint Origins ────────────────────────────────────────────────
  jointOrigins: JointOriginRecord[];
  showJointOriginDialog: boolean;
  jointOriginPickedPoint: [number, number, number] | null;
  openJointOriginDialog(): void;
  closeJointOriginDialog(): void;
  setJointOriginPoint(p: [number, number, number]): void;
  commitJointOrigin(params: { name: string; componentId: string | null; alignmentType: 'default' | 'between-two-faces' | 'on-face' }): void;

  // ── D196 — Interference ─────────────────────────────────────────────────
  showInterferenceDialog: boolean;
  interferenceResults: InterferenceResult[];
  openInterferenceDialog(): void;
  closeInterferenceDialog(): void;
  computeInterference(): void;

  // ── A22 — Mirror Component ────────────────────────────────────────────────
  showMirrorComponentDialog: boolean;
  openMirrorComponentDialog(): void;
  closeMirrorComponentDialog(): void;

  // ── A23 — Duplicate With Joints ──────────────────────────────────────────
  showDuplicateWithJointsDialog: boolean;
  duplicateWithJointsTargetId: string | null;
  openDuplicateWithJointsDialog(componentId: string): void;
  closeDuplicateWithJointsDialog(): void;

  // ── A26 — Bill of Materials ───────────────────────────────────────────────
  showBOMDialog: boolean;
  openBOMDialog(): void;
  closeBOMDialog(): void;
  getBOMEntries(): import('../../components/dialogs/assembly/BOMDialog').BOMEntry[];

  // ── A12 — Contact Sets ────────────────────────────────────────────────────
  contactSets: ContactSetEntry[];
  showContactSetsDialog: boolean;
  openContactSetsDialog(): void;
  closeContactSetsDialog(): void;
  addContactSet(comp1Id: string, comp2Id: string): void;
  toggleContactSet(id: string): void;
  removeContactSet(id: string): void;
  /** A25: set enabled=true on every contact set */
  enableAllContactSets(): void;
  /** A25: set enabled=false on every contact set */
  disableAllContactSets(): void;

  // ── A13 — Insert Component ────────────────────────────────────────────────
  showInsertComponentDialog: boolean;
  openInsertComponentDialog(): void;
  closeInsertComponentDialog(): void;
  commitInsertComponent(params: InsertComponentParams): void;

// ── D197–D203 Surface & Body Analysis Overlays ──────────────────────────
  activeAnalysis: 'zebra' | 'draft' | 'curvature-map' | 'isocurve' | 'accessibility' | 'min-radius' | 'curvature-comb' | null;
  setActiveAnalysis: (a: 'zebra' | 'draft' | 'curvature-map' | 'isocurve' | 'accessibility' | 'min-radius' | 'curvature-comb' | null) => void;
  analysisParams: {
    direction: 'x' | 'y' | 'z';
    frequency: number;
    minAngle: number;
    uCount: number;
    vCount: number;
    minRadius: number;
    combScale: number;
  };
  setAnalysisParams: (p: Partial<CADState['analysisParams']>) => void;

  // ── SFC7 — Fill Surface ──────────────────────────────────────────────────
  showFillDialog: boolean;
  fillBoundaryEdgeIds: string[];
  /** Per-edge endpoint data captured at pick time so commitFill can assemble a real boundary loop. */
  fillBoundaryEdgeData: Array<{ id: string; a: [number, number, number]; b: [number, number, number] }>;
  openFillDialog(): void;
  addFillBoundaryEdge(id: string, a?: [number, number, number], b?: [number, number, number]): void;
  closeFillDialog(): void;
  commitFill(params: import('../../components/dialogs/surface/FillDialog').FillParams): void;

  // ── SFC8 — Offset Curve to Surface ──────────────────────────────────────
  showOffsetCurveDialog: boolean;
  openOffsetCurveDialog(): void;
  closeOffsetCurveDialog(): void;
  commitOffsetCurve(params: import('../../components/dialogs/surface/OffsetCurveDialog').OffsetCurveParams): void;

  // ── SFC16 — Surface Merge (face-picker) ──────────────────────────────────
  showSurfaceMergeDialog: boolean;
  surfaceMergeFace1Id: string | null;
  surfaceMergeFace2Id: string | null;
  openSurfaceMergeDialog(): void;
  setSurfaceMergeFace1(id: string): void;
  setSurfaceMergeFace2(id: string): void;
  closeSurfaceMergeDialog(): void;
  commitSurfaceMerge(params: import('../../components/dialogs/surface/SurfaceMergeDialog').SurfaceMergeParams): void;

  // ── SFC18 — Delete Face ──────────────────────────────────────────────────
  showDeleteFaceDialog: boolean;
  deleteFaceIds: string[];
  openDeleteFaceDialog(): void;
  addDeleteFace(id: string): void;
  clearDeleteFaces(): void;
  closeDeleteFaceDialog(): void;
  commitDeleteFace(params: import('../../components/dialogs/surface/DeleteFaceDialog').DeleteFaceParams): void;

  // ── SFC10 — Surface Trim ──────────────────────────────────────────────────
  commitSurfaceTrim(params: {
    sourceFeatureId: string;
    trimmerFeatureId: string;
    keepSide: 'inside' | 'outside';
  }): void;

  // ── SFC14 — Surface Split ─────────────────────────────────────────────────
  commitSurfaceSplit(params: {
    sourceFeatureId: string;
    splitterFeatureId: string;
  }): void;

  // ── SFC15 — Untrim ────────────────────────────────────────────────────────
  commitUntrim(params: {
    sourceFeatureId: string;
    expandFactor: number;
  }): void;

  // ── SFC9 — Offset Surface ────────────────────────────────────────────────
  commitOffsetSurface(params: {
    offsetDistance: number;
    direction: 'outward' | 'inward' | 'both';
    operation: 'new-body' | 'join';
  }): void;

  // ── SFC11 — Surface Extend ───────────────────────────────────────────────
  commitSurfaceExtend(params: {
    extendDistance: number;
    extensionType: 'natural' | 'linear' | 'curvature';
    merge: boolean;
  }): void;

  // ── SFC12 — Stitch ───────────────────────────────────────────────────────
  commitStitch(params: {
    sourceFeatureIds: string[];
    tolerance: number;
    closeOpenEdges: boolean;
    keepOriginal: boolean;
  }): void;

  // ── SFC13 — Unstitch ─────────────────────────────────────────────────────
  commitUnstitch(params: {
    sourceFeatureId: string;
    keepOriginal: boolean;
  }): void;

  // ── SFC17 — Thicken ──────────────────────────────────────────────────────
  commitThicken(params: {
    thickness: number;
    direction: 'inside' | 'outside' | 'symmetric';
    operation: 'new-body' | 'join' | 'cut';
  }): void;

  // ── SFC22 — Surface Primitives ───────────────────────────────────────────
  showSurfacePrimitivesDialog: boolean;
  openSurfacePrimitivesDialog(): void;
  closeSurfacePrimitivesDialog(): void;
  commitSurfacePrimitive(params: import('../../components/dialogs/surface/SurfacePrimitivesDialog').SurfacePrimitiveParams): void;

  // ── MM1 — Design history mode ───────────────────────────────────────────
  historyEnabled: boolean;
  toggleHistoryMode: () => void;

  // ── MM2 — Undo / Redo ────────────────────────────────────────────────────
  undoStack: string[];
  redoStack: string[];
  pushUndo(): void;
  undo(): void;
  redo(): void;

  // ── SLD7 — Linear Pattern ─────────────────────────────────────────────────
  commitLinearPattern(featureId: string, params: {
    dirX: number; dirY: number; dirZ: number;
    spacing: number; count: number;
    dir2X?: number; dir2Y?: number; dir2Z?: number;
    spacing2?: number; count2?: number;
  }): void;

  // ── SLD8 — Circular Pattern ───────────────────────────────────────────────
  commitCircularPattern(featureId: string, params: {
    axisX: number; axisY: number; axisZ: number;
    originX: number; originY: number; originZ: number;
    count: number; totalAngle: number;
  }): void;

  // ── MSH2 — Plane Cut ─────────────────────────────────────────────────────
  commitPlaneCut(featureId: string, planeNormal: THREE.Vector3, planeOffset: number, keepSide: 'positive' | 'negative'): void;

  // ── MSH3 — Make Closed Mesh ──────────────────────────────────────────────
  commitMakeClosedMesh(featureId: string): void;

  // ── MSH5 — Mesh Smooth ───────────────────────────────────────────────────
  commitMeshSmooth(featureId: string, iterations: number, factor: number): void;

  // ── MSH10 — Separate ─────────────────────────────────────────────────────
  commitMeshSeparate(featureId: string): void;

  // ── MSH13 — Mesh Section Sketch ──────────────────────────────────────────
  commitMeshSectionSketch(featureId: string, plane: THREE.Plane): void;

  // ── UTL2 — Save / Load ───────────────────────────────────────────────────
  newDocument(): void;
  saveToFile(): void;
  loadFromFile(json: string): void;

  // ── SLD1 — Rib (dialog-based) ────────────────────────────────────────────
  commitRibFromDialog(sketchId: string, thickness: number, height: number): void;

  // ── SLD2 — Web (dialog-based) ────────────────────────────────────────────
  commitWeb(sketchId: string, thickness: number, height: number): void;

  // ── SLD4 — Rest ──────────────────────────────────────────────────────────
  commitRest(params: { profileId: string; width: number; depth: number; thickness: number; normalX: number; normalY: number; normalZ: number; centerX: number; centerY: number; centerZ: number }): void;

  // ── SLD5 — Thread (cosmetic) ─────────────────────────────────────────────
  commitThread(featureId: string, radius: number, pitch: number, length: number): void;

  // ── SLD9 — Pattern on Path ───────────────────────────────────────────────
  commitPatternOnPath(featureId: string, sketchId: string, count: number): void;

  // ── MSH1 — Remesh ────────────────────────────────────────────────────────
  commitRemesh(featureId: string, mode: 'refine' | 'coarsen', iterations: number): void;

// ── SLD10 — Shell ────────────────────────────────────────────────────────
  commitShell(featureId: string, thickness: number, direction: 'inward' | 'outward' | 'symmetric'): void;

  // ── SLD11 — Draft ────────────────────────────────────────────────────────
  commitDraft(featureId: string, pullAxisDir: THREE.Vector3, draftAngle: number, fixedPlaneY: number): void;

  // ── SLD14 — Offset Face ──────────────────────────────────────────────────
  commitOffsetFace(featureId: string, distance: number): void;

  // ── SLD16 — Remove Face ──────────────────────────────────────────────────
  commitRemoveFace(featureId: string, faceNormal: THREE.Vector3, faceCentroid: THREE.Vector3): void;

  // ── SLD3 — Emboss ────────────────────────────────────────────────────────
  commitEmboss(sketchId: string, depth: number, style: 'emboss' | 'deboss'): void;

  // ── SLD6 — Boundary Fill ─────────────────────────────────────────────────
  commitBoundaryFill(toolFeatureIds: string[], operation: 'new-body' | 'join' | 'cut'): void;

  // ── SLD15 — Silhouette Split ─────────────────────────────────────────────
  commitSilhouetteSplit(featureId: string, planeNormal: THREE.Vector3, planeOffset: number): void;

  // ── MSH4 — Erase and Fill ────────────────────────────────────────────────
  commitEraseAndFill(featureId: string, faceNormal: THREE.Vector3, faceCentroid: THREE.Vector3): void;

  // ── MSH6 — Mesh Shell ────────────────────────────────────────────────────
  commitMeshShell(featureId: string, thickness: number, direction: 'inward' | 'outward' | 'symmetric'): void;

  // ── MSH9 — Mesh Align ────────────────────────────────────────────────────
  commitMeshAlign(sourceFeatureId: string, targetFeatureId: string): void;

  // ── MSH12 — Convert Mesh to BRep ─────────────────────────────────────────
  commitConvertMeshToBRep(featureId: string, mode: 'facet' | 'prismatic'): void;

}

// Plane normals consistent with the visual selector (Three.js Y-up):
//   XY = horizontal ground plane  → normal points UP   = (0, 1, 0)
//   XZ = vertical front plane     → normal points FWD  = (0, 0, 1)
//   YZ = vertical side plane      → normal points RIGHT = (1, 0, 0)
