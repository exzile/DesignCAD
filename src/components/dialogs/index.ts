// Barrel export — import dialogs from here instead of FeatureDialogs directly.

// solid
export { ShellDialog } from './solid/ShellDialog';
export { CombineDialog } from './solid/CombineDialog';
export { HoleDialog } from './solid/HoleDialog';
export { ThreadDialog } from './solid/ThreadDialog';
export { DraftDialog } from './solid/DraftDialog';
export { ScaleDialog } from './solid/ScaleDialog';
export { WebDialog } from './solid/WebDialog';
export { EmbossDialog } from './solid/EmbossDialog';
export { RestDialog } from './solid/RestDialog';
export { BoundaryFillDialog } from './solid/BoundaryFillDialog';
export { BaseFeatureDialog } from './solid/BaseFeatureDialog';
export { RemoveFaceDialog } from './solid/RemoveFaceDialog';
export { SilhouetteSplitDialog } from './solid/SilhouetteSplitDialog';

// pattern
export { LinearPatternDialog } from './pattern/LinearPatternDialog';
export { CircularPatternDialog } from './pattern/CircularPatternDialog';
export { MirrorDialog } from './pattern/MirrorDialog';
export { PatternOnPathDialog } from './pattern/PatternOnPathDialog';

// surface
export { ThickenDialog } from './surface/ThickenDialog';
export { OffsetSurfaceDialog } from './surface/OffsetSurfaceDialog';
export { SurfaceTrimDialog } from './surface/SurfaceTrimDialog';
export { SurfaceExtendDialog } from './surface/SurfaceExtendDialog';
export { StitchDialog } from './surface/StitchDialog';
export { UnstitchDialog } from './surface/UnstitchDialog';
export { SurfaceSplitDialog } from './surface/SurfaceSplitDialog';

// mesh
export { MeshReduceDialog, ReverseNormalDialog, TessellateDialog } from './mesh/MeshDialogs';

// sketch
export { RenameSketchDialog } from './sketch/RenameSketchDialog';
export { RedefineSketchPlaneDialog } from './sketch/RedefineSketchPlaneDialog';

// construction
export { ConstructionPlaneDialog } from './construction/ConstructionPlaneDialog';

// primitives
export { PrimitivesDialog } from './primitives/PrimitivesDialog';

// assembly
export { JointDialog } from './assembly/JointDialog';
export { default as AsBuiltJointDialog } from './assembly/AsBuiltJointDialog';

// additional solid dialogs
export { OffsetFaceDialog } from './solid/OffsetFaceDialog';
export { AlignDialog } from './solid/AlignDialog';

// additional construction dialogs
export { AxisPerpToFaceDialog } from './construction/AxisPerpToFaceDialog';
