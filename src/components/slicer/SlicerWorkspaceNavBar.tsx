import * as React from 'react';
import { Layers, Puzzle } from 'lucide-react';
import { colors } from '../../utils/theme';

export type SlicerPage = 'prepare' | 'plugins';

export function SlicerWorkspaceNavBar({
  currentPage,
  onChangePage,
}: {
  currentPage: SlicerPage;
  onChangePage: (page: SlicerPage) => void;
}) {
  const navStyle: React.CSSProperties = {
    background: colors.panel,
    borderBottom: `1px solid ${colors.panelBorder}`,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '0 12px',
    height: 36,
    flexShrink: 0,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? colors.active : 'transparent',
    color: active ? colors.text : colors.textDim,
    border: 'none',
    borderBottom: active ? `2px solid ${colors.accent}` : '2px solid transparent',
    borderRadius: 0,
    padding: '0 14px',
    height: '100%',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'color 0.12s, border-color 0.12s',
  });

  return (
    <div style={navStyle}>
      <button style={tabStyle(currentPage === 'prepare')} onClick={() => onChangePage('prepare')}>
        <Layers size={13} />
        Prepare
      </button>
      <button style={tabStyle(currentPage === 'plugins')} onClick={() => onChangePage('plugins')}>
        <Puzzle size={13} />
        Plugins
      </button>
    </div>
  );
}
