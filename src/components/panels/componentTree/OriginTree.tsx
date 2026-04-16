import { useState } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, Axis3D, Crosshair, Minus, Square } from 'lucide-react';

export function OriginTree() {
  const [expanded, setExpanded] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({
    origin: true, X: true, Y: true, Z: true, XY: true, XZ: true, YZ: true,
  });

  const toggleVis = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const items = [
    { key: 'origin', label: 'O', icon: <Crosshair size={12} />, color: '#ff9800' },
    { key: 'X', label: 'X Axis', icon: <Minus size={12} />, color: '#e04040' },
    { key: 'Y', label: 'Y Axis', icon: <Minus size={12} />, color: '#40b040' },
    { key: 'Z', label: 'Z Axis', icon: <Minus size={12} />, color: '#4080e0' },
    { key: 'XY', label: 'XY Plane', icon: <Square size={12} />, color: '#4080e0' },
    { key: 'XZ', label: 'XZ Plane', icon: <Square size={12} />, color: '#40b040' },
    { key: 'YZ', label: 'YZ Plane', icon: <Square size={12} />, color: '#e04040' },
  ];

  const allVisible = Object.values(visibility).every(Boolean);

  return (
    <div className="origin-tree-node">
      {/* Folder header row */}
      <div className="browser-row" onClick={() => setExpanded(!expanded)}>
        <button
          className="browser-vis-btn"
          onClick={(e) => {
            e.stopPropagation();
            const next = !allVisible;
            setVisibility({ origin: next, X: next, Y: next, Z: next, XY: next, XZ: next, YZ: next });
          }}
          title={allVisible ? 'Hide Origin' : 'Show Origin'}
        >
          {allVisible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <span className="browser-chevron">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="browser-item-icon origin-axis-icon">
          <Axis3D size={13} />
        </span>
        <span className="browser-item-label">Origin</span>
      </div>

      {/* Child rows */}
      {expanded && items.map((item) => (
        <div key={item.key} className="browser-row browser-row-child">
          <button
            className="browser-vis-btn"
            onClick={(e) => toggleVis(item.key, e)}
            title={visibility[item.key] ? 'Hide' : 'Show'}
          >
            {visibility[item.key] ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <span className="browser-chevron" /> {/* spacer */}
          {/* color is dynamic (per-axis color), opacity is dynamic (visibility state) — must stay inline */}
          <span className="browser-item-icon" style={{ color: item.color, opacity: visibility[item.key] ? 1 : 0.4 }}>
            {item.icon}
          </span>
          {/* opacity is dynamic (visibility state) — must stay inline */}
          <span className="browser-item-label" style={{ opacity: visibility[item.key] ? 1 : 0.5 }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
