import { useComponentStore } from '../../../store/componentStore';
import type { MaterialAppearance } from '../../../types/cad';

export function MaterialPicker({
  bodyId,
  onClose,
}: {
  bodyId: string;
  onClose: () => void;
}) {
  const setBodyMaterial = useComponentStore((s) => s.setBodyMaterial);

  const materials: MaterialAppearance[] = [
    { id: 'aluminum', name: 'Aluminum', color: '#B0B8C0', metalness: 0.8, roughness: 0.3, opacity: 1, category: 'metal' },
    { id: 'steel', name: 'Steel', color: '#8090A0', metalness: 0.9, roughness: 0.35, opacity: 1, category: 'metal' },
    { id: 'stainless', name: 'Stainless Steel', color: '#C8CCD0', metalness: 0.85, roughness: 0.2, opacity: 1, category: 'metal' },
    { id: 'brass', name: 'Brass', color: '#C8A84A', metalness: 0.9, roughness: 0.25, opacity: 1, category: 'metal' },
    { id: 'copper', name: 'Copper', color: '#C87040', metalness: 0.9, roughness: 0.3, opacity: 1, category: 'metal' },
    { id: 'abs', name: 'ABS Plastic', color: '#E8E0D0', metalness: 0, roughness: 0.6, opacity: 1, category: 'plastic' },
    { id: 'pla', name: 'PLA', color: '#D0D8E0', metalness: 0, roughness: 0.5, opacity: 1, category: 'plastic' },
    { id: 'nylon', name: 'Nylon', color: '#F0EDE8', metalness: 0, roughness: 0.55, opacity: 1, category: 'plastic' },
    { id: 'oak', name: 'Oak Wood', color: '#A07840', metalness: 0, roughness: 0.8, opacity: 1, category: 'wood' },
    { id: 'rubber-black', name: 'Rubber', color: '#303030', metalness: 0, roughness: 0.9, opacity: 1, category: 'rubber' },
    { id: 'glass-clear', name: 'Glass', color: '#E8F0FF', metalness: 0.1, roughness: 0.05, opacity: 0.3, category: 'glass' },
    { id: 'carbon-fiber', name: 'Carbon Fiber', color: '#202020', metalness: 0.3, roughness: 0.5, opacity: 1, category: 'composite' },
  ];

  return (
    <div className="material-picker">
      <div className="material-picker-header">
        <span>Material</span>
        <button className="icon-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="material-grid">
        {materials.map((mat) => (
          <button
            key={mat.id}
            className="material-swatch"
            title={mat.name}
            onClick={() => { setBodyMaterial(bodyId, mat); onClose(); }}
          >
            {/* background is dynamic (per-material color) — must stay inline */}
            <div className="swatch-color" style={{ background: mat.color }} />
            <span className="swatch-label">{mat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
