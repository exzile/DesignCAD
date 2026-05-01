import './ComponentTree.css';
import { ChevronDown, ChevronRight, FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { useComponentStore } from '../../store/componentStore';
import { ComponentNode } from './componentTree/ComponentNode';
import { OriginTree } from './componentTree/OriginTree';

function ComponentsFolder() {
  const rootComponent = useComponentStore((s) => s.components[s.rootComponentId]);
  const [expanded, setExpanded] = useState(true);
  const childIds = rootComponent?.childIds ?? [];

  return (
    <div className="sketches-tree-node">
      <div className="browser-row" onClick={() => setExpanded(!expanded)}>
        <span className="browser-vis-btn" />
        <span className="browser-chevron">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="browser-item-icon origin-axis-icon">
          <FolderOpen size={13} />
        </span>
        <span className="browser-item-label">Components</span>
      </div>

      {expanded && (
        <div className="tree-children">
          {childIds.map((componentId) => (
            <ComponentNode key={componentId} componentId={componentId} />
          ))}
          {childIds.length === 0 && (
            <div className="browser-row browser-row-child browser-empty-row">
              <span className="browser-vis-btn" />
              <span className="browser-chevron" />
              <span className="browser-item-icon" />
              <span className="browser-item-label">No components</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ComponentTree() {
  const rootComponentId = useComponentStore((s) => s.rootComponentId);
  const addComponent = useComponentStore((s) => s.addComponent);

  return (
    <div className="component-tree-panel">
      <div className="tree-panel-header">
        <h3>BROWSER</h3>
        <button
          className="icon-btn"
          title="New Component"
          onClick={() => addComponent(rootComponentId)}
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="tree-scroll">
        <OriginTree />
        <ComponentsFolder />
      </div>
    </div>
  );
}
