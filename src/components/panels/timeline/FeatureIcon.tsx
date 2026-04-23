import {
  PenTool,
  ArrowUpFromLine,
  RotateCcw,
  Blend,
  FileBox,
  ChevronDown,
  Stamp,
  GitBranch,
  BoxSelect,
  Repeat,
  Grid,
} from 'lucide-react';
import type { Feature } from '../../../types/cad';

export function FeatureIcon({ type }: { type: Feature['type'] }) {
  switch (type) {
    case 'sketch': return <PenTool size={14} />;
    case 'extrude': return <ArrowUpFromLine size={14} />;
    case 'revolve': return <RotateCcw size={14} />;
    case 'fillet': return <Blend size={14} />;
    case 'chamfer': return <ChevronDown size={14} />;
    case 'emboss': return <Stamp size={14} />;
    case 'pipe': return <GitBranch size={14} />;
    case 'coil': return <RotateCcw size={14} />;
    case 'boundary-fill': return <BoxSelect size={14} />;
    case 'linear-pattern': return <Repeat size={14} />;
    case 'rectangular-pattern': return <Grid size={14} />;
    case 'circular-pattern': return <RotateCcw size={14} />;
    case 'base-feature': return <FileBox size={14} />;
    case 'import': return <FileBox size={14} />;
    default: return <FileBox size={14} />;
  }
}
