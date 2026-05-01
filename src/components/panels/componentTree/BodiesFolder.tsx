import { useState } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, FolderOpen } from 'lucide-react';
import { useComponentStore } from '../../../store/componentStore';
import { BodyNode } from './BodyNode';
import { isComponentVisible } from '../../viewport/scene/componentVisibility';

/**
 * Collapsible "Bodies" folder in the component tree — mirrors SketchesFolder.
 * Renders all bodies from all components in a single folder at the tree root.
 */
export function BodiesFolder({ componentId }: { componentId?: string }) {
  const bodies = useComponentStore((s) => s.bodies);
  const components = useComponentStore((s) => s.components);
  const component = useComponentStore((s) => (componentId ? s.components[componentId] : undefined));
  const toggleVis = useComponentStore((s) => s.toggleBodyVisibility);
  const [expanded, setExpanded] = useState(true);

  const bodyIds = componentId ? component?.bodyIds ?? [] : Object.keys(bodies);
  if (bodyIds.length === 0) return null;

  const componentVisible = isComponentVisible(components, componentId);
  const allVisible = componentVisible && bodyIds.every((id) => bodies[id]?.visible !== false);

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!componentVisible) return;
    // Toggle all bodies to the opposite of current "allVisible" state
    for (const id of bodyIds) {
      const body = bodies[id];
      if (body && body.visible === allVisible) {
        toggleVis(id);
      }
    }
  };

  return (
    <div className="sketches-tree-node">
      {/* Folder header */}
      <div className="browser-row" onClick={() => setExpanded(!expanded)}>
        <button
          className="browser-vis-btn"
          onClick={handleToggleAll}
          title={!componentVisible ? 'Hidden by Component' : allVisible ? 'Hide Bodies' : 'Show Bodies'}
        >
          {allVisible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <span className="browser-chevron">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="browser-item-icon origin-axis-icon">
          <FolderOpen size={13} />
        </span>
        <span className="browser-item-label">Bodies</span>
      </div>

      {/* Body rows */}
      {expanded && bodyIds.map((id) => (
        <BodyNode key={id} bodyId={id} inheritedVisible={componentVisible} />
      ))}
    </div>
  );
}
