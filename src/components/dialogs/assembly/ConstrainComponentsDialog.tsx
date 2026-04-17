import { useState } from 'react';
import { X, Check, Plus, Trash2, Link2 } from 'lucide-react';
import '../common/ToolPanel.css';
import { useComponentStore } from '../../../store/componentStore';
import type { ComponentConstraintType } from '../../../types/cad';

const CONSTRAINT_LABELS: Record<ComponentConstraintType, string> = {
  mate: 'Mate (faces oppose)',
  flush: 'Flush (faces align)',
  angle: 'Angle',
  tangent: 'Tangent',
  insert: 'Insert (axis + face)',
};

export function ConstrainComponentsDialog({ onClose }: { onClose: () => void }) {
  const components = useComponentStore((s) => s.components);
  const componentConstraints = useComponentStore((s) => s.componentConstraints);
  const addComponentConstraint = useComponentStore((s) => s.addComponentConstraint);
  const removeComponentConstraint = useComponentStore((s) => s.removeComponentConstraint);
  const suppressComponentConstraint = useComponentStore((s) => s.suppressComponentConstraint);
  const solveAllComponentConstraints = useComponentStore((s) => s.solveAllComponentConstraints);

  const compList = Object.values(components).filter(c => c.parentId !== null); // non-root
  const [type, setType] = useState<ComponentConstraintType>('mate');
  const [compAId, setCompAId] = useState(compList[0]?.id ?? '');
  const [compBId, setCompBId] = useState(compList[1]?.id ?? compList[0]?.id ?? '');
  const [offset, setOffset] = useState(0);
  const [angle, setAngle] = useState(0);

  const handleAdd = () => {
    if (!compAId || !compBId || compAId === compBId) return;
    const compA = components[compAId];
    const compB = components[compBId];
    if (!compA || !compB) return;
    // Use a default face: the +Y face of each component as a placeholder
    const defaultNormal: [number, number, number] = [0, 1, 0];
    const posA: [number, number, number] = [0, 0, 0];
    const posB: [number, number, number] = [0, 0, 0];
    // Extract translation from component transforms
    const ta = compA.transform.elements;
    const tb = compB.transform.elements;
    posA[0] = ta[12]; posA[1] = ta[13]; posA[2] = ta[14];
    posB[0] = tb[12]; posB[1] = tb[13]; posB[2] = tb[14];
    addComponentConstraint({
      type,
      entityA: { componentId: compAId, faceId: `${compAId}_default`, normal: defaultNormal, centroid: posA },
      entityB: { componentId: compBId, faceId: `${compBId}_default`, normal: defaultNormal, centroid: posB },
      offset: type === 'mate' || type === 'flush' ? offset : undefined,
      angle: type === 'angle' ? angle : undefined,
      suppressed: false,
    });
    solveAllComponentConstraints();
  };

  return (
    <div className="tool-panel" style={{ width: 300, maxHeight: 520, display: 'flex', flexDirection: 'column' }}>
      <div className="tp-header">
        <div className="tp-header-icon"><Link2 size={12} /></div>
        <span className="tp-header-title">Constrain Components</span>
        <button className="tp-close" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="tp-body" style={{ overflowY: 'auto', flex: 1 }}>
        {/* Existing constraints */}
        {componentConstraints.length > 0 && (
          <div className="tp-section">
            <div className="tp-section-title">Active Constraints</div>
            {componentConstraints.map(c => (
              <div key={c.id} className="tp-row" style={{ justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ fontSize: 11, opacity: c.suppressed ? 0.5 : 1 }}>
                  {CONSTRAINT_LABELS[c.type]}: {components[c.entityA.componentId]?.name ?? '?'} ↔ {components[c.entityB.componentId]?.name ?? '?'}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    style={{ fontSize: 10, background: 'none', border: '1px solid #555', borderRadius: 3, color: '#aaa', cursor: 'pointer', padding: '1px 4px' }}
                    onClick={() => suppressComponentConstraint(c.id, !c.suppressed)}
                  >
                    {c.suppressed ? 'Enable' : 'Supp'}
                  </button>
                  <button
                    style={{ fontSize: 10, background: 'none', border: 'none', color: '#f66', cursor: 'pointer' }}
                    onClick={() => removeComponentConstraint(c.id)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Add new constraint */}
        <div className="tp-section">
          <div className="tp-section-title">Add Constraint</div>
          <div className="tp-row">
            <label className="tp-label">Type</label>
            <select className="tp-select" style={{ flex: 1 }} value={type} onChange={e => setType(e.target.value as ComponentConstraintType)}>
              {(Object.keys(CONSTRAINT_LABELS) as ComponentConstraintType[]).map(k => (
                <option key={k} value={k}>{CONSTRAINT_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="tp-row">
            <label className="tp-label">Component A</label>
            <select className="tp-select" style={{ flex: 1 }} value={compAId} onChange={e => setCompAId(e.target.value)}>
              {compList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="tp-row">
            <label className="tp-label">Component B</label>
            <select className="tp-select" style={{ flex: 1 }} value={compBId} onChange={e => setCompBId(e.target.value)}>
              {compList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {(type === 'mate' || type === 'flush') && (
            <div className="tp-row">
              <label className="tp-label">Offset (mm)</label>
              <input className="tp-input" type="number" step={0.1} value={offset} onChange={e => setOffset(parseFloat(e.target.value) || 0)} />
            </div>
          )}
          {type === 'angle' && (
            <div className="tp-row">
              <label className="tp-label">Angle (°)</label>
              <input className="tp-input" type="number" step={1} value={angle} onChange={e => setAngle(parseFloat(e.target.value) || 0)} />
            </div>
          )}
          <div className="tp-row" style={{ marginTop: 6 }}>
            <button
              className="tp-btn tp-btn-ok"
              style={{ flex: 1 }}
              onClick={handleAdd}
              disabled={!compAId || !compBId || compAId === compBId}
            >
              <Plus size={13} /> Add Constraint
            </button>
          </div>
        </div>
      </div>
      <div className="tp-actions">
        <button className="tp-btn tp-btn-cancel" onClick={onClose}><X size={13} /> Close</button>
        <button className="tp-btn tp-btn-ok" onClick={() => { solveAllComponentConstraints(); }}>
          <Check size={13} /> Solve All
        </button>
      </div>
    </div>
  );
}
