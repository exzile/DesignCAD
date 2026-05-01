import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, FolderOpen, PenTool } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import { useComponentStore } from '../../../store/componentStore';
import { SketchContextMenu } from './SketchContextMenu';
import type { SketchCtxMenu } from './SketchContextMenu';
import type { Sketch } from '../../../types/cad';
import { isComponentVisible } from '../../viewport/scene/componentVisibility';

const focusSketchEvent = 'cad:focus-sketch';

function getSketchCenter(sketch: Sketch): [number, number, number] {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  const include = (x: number, y: number, z: number, radius = 0) => {
    minX = Math.min(minX, x - radius);
    minY = Math.min(minY, y - radius);
    minZ = Math.min(minZ, z - radius);
    maxX = Math.max(maxX, x + radius);
    maxY = Math.max(maxY, y + radius);
    maxZ = Math.max(maxZ, z + radius);
  };

  sketch.entities.forEach((entity) => {
    entity.points.forEach((point) => {
      const radius = entity.type === 'circle' || entity.type === 'arc' ? entity.radius ?? 0 : 0;
      include(point.x, point.y, point.z, radius);
    });
  });

  if (!Number.isFinite(minX)) {
    const origin = sketch.planeOrigin;
    return [origin.x, origin.y, origin.z];
  }

  return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
}

export function SketchesFolder({ componentId }: { componentId?: string }) {
  // Use `sketches` (completed) + `activeSketch` (currently editing) as source of truth.
  // Previously used features.filter('sketch') which is a secondary index and can lag.
  const activeSketch = useCADStore((s) => s.activeSketch);
  const sketches = useCADStore((s) => s.sketches);
  const features = useCADStore((s) => s.features);
  const editSketch = useCADStore((s) => s.editSketch); // must be before any early return
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);
  const toggleFeatureVisibility = useCADStore((s) => s.toggleFeatureVisibility);
  const components = useComponentStore((s) => s.components);
  const [expanded, setExpanded] = useState(true);
  const [sketchVis, setSketchVis] = useState<Record<string, boolean>>({});
  const [ctxMenu, setCtxMenu] = useState<SketchCtxMenu | null>(null);

  const visibleSketches = useMemo(
    () => sketches.filter((s) => (
      s.id !== activeSketch?.id &&
      !s.name.startsWith('Press Pull Profile') &&
      (!componentId || s.componentId === componentId)
    )),
    [activeSketch?.id, componentId, sketches],
  );
  const hasActiveSketch = !!activeSketch &&
    !activeSketch.name.startsWith('Press Pull Profile') &&
    (!componentId || activeSketch.componentId === componentId);
  const hasAny = visibleSketches.length > 0 || hasActiveSketch;
  if (!hasAny) return null;

  const sketchFeatureBySketchId = new Map(
    features
      .filter((feature) => feature.type === 'sketch' && feature.sketchId)
      .map((feature) => [feature.sketchId!, feature]),
  );

  const isVisible = (id: string) => {
    if (id === 'active') return sketchVis[id] !== false;
    return sketchFeatureBySketchId.get(id)?.visible !== false;
  };
  const componentVisible = isComponentVisible(components, componentId);
  const isEffectivelyVisible = (id: string) => componentVisible && isVisible(id);
  const toggleVis = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!componentVisible) return;
    const feature = id === 'active' ? null : sketchFeatureBySketchId.get(id);
    if (feature) {
      toggleFeatureVisibility(feature.id);
      return;
    }
    setSketchVis((prev) => ({ ...prev, [id]: !isVisible(id) }));
  };

  const allVisible = componentVisible &&
    visibleSketches.every((sk) => isVisible(sk.id)) &&
    (!hasActiveSketch || isVisible('active'));
  const toggleFolderVis = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!componentVisible) return;
    const next = !allVisible;
    const newVis: Record<string, boolean> = {};
    visibleSketches.forEach((sk) => {
      const feature = sketchFeatureBySketchId.get(sk.id);
      if (feature && feature.visible !== next) toggleFeatureVisibility(feature.id);
      else if (!feature) newVis[sk.id] = next;
    });
    if (hasActiveSketch) newVis['active'] = next;
    setSketchVis(newVis);
  };

  const openCtx = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ sketchId: id, sketchName: name, x: e.clientX, y: e.clientY });
  };

  const viewSketch = (sketch: Sketch) => {
    const normal = sketch.planeNormal.clone().normalize();
    window.dispatchEvent(new CustomEvent(focusSketchEvent, {
      detail: {
        center: getSketchCenter(sketch),
        normal: [normal.x, normal.y, normal.z],
      },
    }));
    setStatusMessage(`Viewing ${sketch.name}`);
  };

  return (
    <div className="sketches-tree-node">
      {/* Folder header row */}
      <div className="browser-row" onClick={() => setExpanded(!expanded)}>
        <button
          className="browser-vis-btn"
          onClick={toggleFolderVis}
          title={!componentVisible ? 'Hidden by Component' : allVisible ? 'Hide Sketches' : 'Show Sketches'}
        >
          {allVisible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <span className="browser-chevron">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="browser-item-icon origin-axis-icon">
          <FolderOpen size={13} />
        </span>
        <span className="browser-item-label">Sketches</span>
      </div>

      {/* Child rows */}
      {expanded && (
        <>
          {/* Completed sketches */}
          {visibleSketches.map((sk) => (
            <div
              key={sk.id}
              className="browser-row browser-row-child"
              onClick={() => viewSketch(sk)}
              onContextMenu={(e) => openCtx(e, sk.id, sk.name)}
              onDoubleClick={() => editSketch(sk.id)}
              title="Click to view, double-click to edit"
            >
              <button
                className="browser-vis-btn"
                onClick={(e) => toggleVis(sk.id, e)}
                title={!componentVisible ? 'Hidden by Component' : isVisible(sk.id) ? 'Hide' : 'Show'}
              >
                {isEffectivelyVisible(sk.id) ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
              <span className="browser-chevron" />
              {/* color and opacity are dynamic (visibility state) — must stay inline */}
              <span className="browser-item-icon"
                style={{ color: isEffectivelyVisible(sk.id) ? 'var(--accent)' : 'var(--text-dim)', opacity: isEffectivelyVisible(sk.id) ? 1 : 0.5 }}>
                <PenTool size={12} />
              </span>
              {/* opacity is dynamic (visibility state) — must stay inline */}
              <span className="browser-item-label" style={{ opacity: isEffectivelyVisible(sk.id) ? 1 : 0.5 }}>
                {sk.name}
              </span>
            </div>
          ))}

          {/* Currently editing sketch */}
          {hasActiveSketch && activeSketch && (
            <div
              className="browser-row browser-row-child browser-row-active-sketch"
              onClick={() => viewSketch(activeSketch)}
              onContextMenu={(e) => openCtx(e, 'active', activeSketch.name)}
              title="Click to view active sketch"
            >
              <button
                className="browser-vis-btn"
                onClick={(e) => toggleVis('active', e)}
                title={!componentVisible ? 'Hidden by Component' : isVisible('active') ? 'Hide' : 'Show'}
              >
                {isEffectivelyVisible('active') ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
              <span className="browser-chevron" />
              <span className="browser-item-icon ct-sketch-active-icon">
                <PenTool size={12} />
              </span>
              <span className="browser-item-label browser-sketch-active-label">
                {activeSketch.name}
              </span>
            </div>
          )}
        </>
      )}

      {ctxMenu && (
        <SketchContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />
      )}
    </div>
  );
}
