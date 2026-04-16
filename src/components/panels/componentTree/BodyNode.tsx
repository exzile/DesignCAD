import { useState } from 'react';
import { Box, Eye, EyeOff } from 'lucide-react';
import { useComponentStore } from '../../../store/componentStore';
import { BodyContextMenu } from './BodyContextMenu';
import type { BodyCtxMenu } from './BodyContextMenu';
import { MaterialPicker } from './MaterialPicker';

export function BodyNode({ bodyId }: { bodyId: string }) {
  const body = useComponentStore((s) => s.bodies[bodyId]);
  const toggleVisibility = useComponentStore((s) => s.toggleBodyVisibility);
  const selectedBodyId = useComponentStore((s) => s.selectedBodyId);
  const setSelectedBodyId = useComponentStore((s) => s.setSelectedBodyId);
  const [showMaterial, setShowMaterial] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<BodyCtxMenu | null>(null);

  if (!body) return null;

  return (
    <div className="tree-leaf">
      <div
        className={`tree-item body-item ${selectedBodyId === bodyId ? 'selected' : ''}`}
        onClick={() => setSelectedBodyId(selectedBodyId === bodyId ? null : bodyId)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedBodyId(bodyId);
          setCtxMenu({ bodyId, x: e.clientX, y: e.clientY });
        }}
      >
        <Box size={12} className="tree-icon body-icon" />
        <span className="tree-name">{body.name}</span>
        {/* background is dynamic (per-body material color) — must stay inline */}
        <div
          className="body-color-dot"
          style={{ background: body.material.color }}
          title={body.material.name}
          onClick={(e) => { e.stopPropagation(); setShowMaterial(!showMaterial); }}
        />
        <button
          className="tree-action"
          onClick={(e) => { e.stopPropagation(); toggleVisibility(bodyId); }}
        >
          {body.visible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
      </div>
      {showMaterial && (
        <MaterialPicker bodyId={bodyId} onClose={() => setShowMaterial(false)} />
      )}
      {ctxMenu && (
        <BodyContextMenu
          menu={ctxMenu}
          bodyName={body.name}
          onClose={() => setCtxMenu(null)}
          onOpenMaterial={() => setShowMaterial(true)}
        />
      )}
    </div>
  );
}
