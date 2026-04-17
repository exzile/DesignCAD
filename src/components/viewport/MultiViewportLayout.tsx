import React from 'react';
import { useCADStore } from '../../store/cadStore';

const VIEWS = [
  { label: 'Top',         color: '#1a7fe0', position: 'top-left'     },
  { label: 'Front',       color: '#1aa04a', position: 'top-right'    },
  { label: 'Right',       color: '#d06020', position: 'bottom-left'  },
  { label: 'Perspective', color: '#555',    position: 'bottom-right' },
] as const;

export default function MultiViewportLayout() {
  const layout = useCADStore((s) => s.viewportLayout);
  if (layout === '1') return null;

  const gridStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    gridTemplate: layout === '4'
      ? '1fr 1fr / 1fr 1fr'
      : layout === '2h'
      ? '1fr / 1fr 1fr'
      : '1fr 1fr / 1fr',
    pointerEvents: 'none',
    zIndex: 5,
  };

  const views = layout === '2h'
    ? [VIEWS[0], VIEWS[3]]
    : layout === '2v'
    ? [VIEWS[0], VIEWS[3]]
    : VIEWS;

  return (
    <div style={gridStyle}>
      {views.map((v) => (
        <div
          key={v.label}
          style={{ position: 'relative', borderRight: '1px solid #333', borderBottom: '1px solid #333' }}
        >
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              background: v.color,
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 3,
              letterSpacing: '0.05em',
              opacity: 0.9,
            }}
          >
            {v.label}
          </div>
        </div>
      ))}
    </div>
  );
}
