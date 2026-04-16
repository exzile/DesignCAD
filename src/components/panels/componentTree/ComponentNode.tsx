import { useState } from 'react';
import {
  ChevronRight, ChevronDown, Eye, EyeOff, Box, Layers,
  Plus, Trash2, Copy, Anchor, MoreHorizontal,
} from 'lucide-react';
import { useComponentStore } from '../../../store/componentStore';
import { useCADStore } from '../../../store/cadStore';
import { BodyNode } from './BodyNode';
import { ConstructionNode } from './ConstructionNode';
import { JointNode } from './JointNode';

export function ComponentNode({ componentId, depth = 0 }: { componentId: string; depth?: number }) {
  const component = useComponentStore((s) => s.components[componentId]);
  const expandedIds = useComponentStore((s) => s.expandedIds);
  const toggleExpanded = useComponentStore((s) => s.toggleExpanded);
  const toggleVisibility = useComponentStore((s) => s.toggleComponentVisibility);
  const activeComponentId = useComponentStore((s) => s.activeComponentId);
  const setActiveComponentId = useComponentStore((s) => s.setActiveComponentId);
  const addComponent = useComponentStore((s) => s.addComponent);
  const removeComponent = useComponentStore((s) => s.removeComponent);
  const duplicateComponent = useComponentStore((s) => s.duplicateComponent);
  const addBody = useComponentStore((s) => s.addBody);
  const setComponentGrounded = useComponentStore((s) => s.setComponentGrounded);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);
  const historyEnabled = useCADStore((s) => s.historyEnabled);
  const toggleHistoryMode = useCADStore((s) => s.toggleHistoryMode);

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const renameComponent = useComponentStore((s) => s.renameComponent);

  if (!component) return null;

  const isExpanded = expandedIds.has(componentId);
  const isActive = activeComponentId === componentId;
  const isRoot = component.parentId === null;
  const hasChildren = component.childIds.length > 0 ||
                      component.bodyIds.length > 0 ||
                      component.constructionIds.length > 0 ||
                      component.jointIds.length > 0;

  const handleRename = () => {
    if (newName.trim()) {
      renameComponent(componentId, newName.trim());
    }
    setRenaming(false);
  };

  return (
    /* --depth is a dynamic CSS custom property for indent — must stay inline */
    <div className="tree-node" style={{ '--depth': depth } as React.CSSProperties}>
      <div
        className={`tree-item component-item ${isActive ? 'active' : ''}`}
        onClick={() => setActiveComponentId(componentId)}
        onDoubleClick={() => {
          if (isRoot) {
            setRenaming(true);
            setNewName(component.name);
          } else {
            setActiveComponentId(componentId);
          }
        }}
      >
        <button
          className="tree-expand"
          onClick={(e) => { e.stopPropagation(); toggleExpanded(componentId); }}
        >
          {hasChildren ? (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : <span className="tree-expand-spacer" />}
        </button>

        {/* background is dynamic (per-component color) — must stay inline */}
        <div className="component-color-bar" style={{ background: component.color }} />

        {renaming ? (
          <input
            className="tree-rename-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-name">{component.name}</span>
        )}

        {component.grounded && <Anchor size={10} className="grounded-icon" />}

        <div className="tree-item-actions">
          <button
            className="tree-action"
            onClick={(e) => { e.stopPropagation(); toggleVisibility(componentId); }}
          >
            {component.visible ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <button
            className="tree-action"
            onClick={(e) => { e.stopPropagation(); setShowContextMenu(!showContextMenu); }}
          >
            <MoreHorizontal size={11} />
          </button>
        </div>
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div className="tree-context-menu" onMouseLeave={() => setShowContextMenu(false)}>
          <button onClick={() => { addComponent(componentId); setShowContextMenu(false); }}>
            <Plus size={12} /> New Component
          </button>
          <button onClick={() => { addBody(componentId); setShowContextMenu(false); }}>
            <Box size={12} /> New Body
          </button>
          <button onClick={() => {
            const next = !component.grounded;
            setComponentGrounded(componentId, next);
            setStatusMessage(`${component.name}: ${next ? 'Grounded' : 'Ungrounded'}`);
            setShowContextMenu(false);
          }}>
            <Anchor size={12} /> {component.grounded ? 'Unground' : 'Ground'}
          </button>
          {isRoot && (
            <button onClick={() => {
              toggleHistoryMode();
              setShowContextMenu(false);
            }}>
              {historyEnabled ? 'Do not capture design history' : 'Capture design history'}
            </button>
          )}
          {!isRoot && (
            <>
              <button onClick={() => { duplicateComponent(componentId); setShowContextMenu(false); }}>
                <Copy size={12} /> Duplicate
              </button>
              <button className="danger" onClick={() => { removeComponent(componentId); setShowContextMenu(false); }}>
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Children */}
      {isExpanded && (
        <div className="tree-children">
          {/* Origin planes/axes (always shown for active component) */}
          {isActive && (
            <div className="tree-origin-group">
              <div className="tree-item origin-item">
                <Layers size={11} className="origin-icon" />
                <span className="tree-name origin-name">Origin</span>
              </div>
            </div>
          )}

          {/* Construction geometry */}
          {component.constructionIds.map((id) => (
            <ConstructionNode key={id} id={id} />
          ))}

          {/* Bodies */}
          {component.bodyIds.map((id) => (
            <BodyNode key={id} bodyId={id} />
          ))}

          {/* Joints */}
          {component.jointIds.map((id) => (
            <JointNode key={id} id={id} />
          ))}

          {/* Child components */}
          {component.childIds.map((id) => (
            <ComponentNode key={id} componentId={id} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
