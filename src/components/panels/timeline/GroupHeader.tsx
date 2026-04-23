import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import type { FeatureGroup } from '../../../types/cad';

export function GroupHeader({ group, depth = 0 }: { group: FeatureGroup; depth?: number }) {
  const toggleFeatureGroup = useCADStore((s) => s.toggleFeatureGroup);
  const renameFeatureGroup = useCADStore((s) => s.renameFeatureGroup);
  const deleteFeatureGroup = useCADStore((s) => s.deleteFeatureGroup);
  const nestGroupInGroup = useCADStore((s) => s.nestGroupInGroup);
  const featureGroups = useCADStore((s) => s.featureGroups);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [nestMenuOpen, setNestMenuOpen] = useState(false);

  const commitRename = () => {
    if (editName.trim()) renameFeatureGroup(group.id, editName.trim());
    setEditing(false);
  };

  const nestCandidates = useMemo(
    () => featureGroups.filter((g) => g.id !== group.id && g.parentGroupId !== group.id),
    [featureGroups, group.id],
  );

  return (
    <div
      className="timeline-group-header"
      style={depth > 0 ? { paddingLeft: depth * 12 } : undefined}
      onClick={() => toggleFeatureGroup(group.id)}
    >
      <span className="timeline-group-header__accent">
        {group.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
      </span>
      <span className="timeline-group-header__accent">
        {group.collapsed ? <Folder size={13} /> : <FolderOpen size={13} />}
      </span>
      {editing ? (
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="timeline-group-header__input"
        />
      ) : (
        <span className="timeline-group-header__name">{group.name}</span>
      )}
      <button
        className="timeline-action-btn timeline-group-header__btn"
        onClick={(e) => {
          e.stopPropagation();
          setEditName(group.name);
          setEditing(true);
        }}
        title="Rename group"
      >
        <Pencil size={11} />
      </button>
      {nestCandidates.length > 0 && (
        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button
            className="timeline-action-btn timeline-group-header__btn"
            onClick={(e) => {
              e.stopPropagation();
              setNestMenuOpen((v) => !v);
            }}
            title="Nest in group"
          >
            <FolderOpen size={11} />
          </button>
          {nestMenuOpen && (
            <div className="timeline-context-menu" style={{ top: '100%', right: 0, left: 'auto', minWidth: 140 }}>
              {group.parentGroupId && (
                <button className="timeline-context-menu__btn" onClick={() => { nestGroupInGroup(group.id, null); setNestMenuOpen(false); }}>
                  <Folder size={12} /> Move to top level
                </button>
              )}
              {nestCandidates.map((g) => (
                <button key={g.id} className="timeline-context-menu__btn" onClick={() => { nestGroupInGroup(group.id, g.id); setNestMenuOpen(false); }}>
                  <FolderOpen size={12} /> Nest in "{g.name}"
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        className="timeline-action-btn danger timeline-group-header__btn"
        onClick={(e) => {
          e.stopPropagation();
          deleteFeatureGroup(group.id);
        }}
        title="Delete group"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
