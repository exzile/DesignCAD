import { useComponentStore } from '../../store/componentStore';

export default function FinishEditInPlaceBar() {
  const activeComponentId = useComponentStore((s) => s.activeComponentId);
  const setActiveComponentId = useComponentStore((s) => s.setActiveComponentId);
  const rootComponentId = useComponentStore((s) => s.rootComponentId);
  const components = useComponentStore((s) => s.components);

  // Only show when a non-root component is active
  if (!activeComponentId || activeComponentId === rootComponentId) return null;

  const comp = components[activeComponentId];

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
      background: '#b45309', color: '#fff', padding: '6px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 13, fontWeight: 500,
    }}>
      <span>Editing in context: <strong>{comp?.name ?? activeComponentId}</strong></span>
      <button
        onClick={() => setActiveComponentId(null)}
        style={{ background: '#92400e', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}
      >
        ✓ Finish Edit In Place
      </button>
    </div>
  );
}
