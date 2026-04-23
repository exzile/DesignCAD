import type React from 'react';
import { colors as COLORS } from '../../../utils/theme';

export const panelStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 440,
    maxWidth: '100vw',
    display: 'flex',
    flexDirection: 'column',
    background: COLORS.bg,
    borderLeft: `1px solid ${COLORS.panelBorder}`,
    zIndex: 1000,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: COLORS.text,
    fontSize: 13,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
    resize: 'horizontal',
    overflow: 'hidden',
    minWidth: 360,
  },
  fullscreen: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    background: COLORS.bg,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: COLORS.text,
    fontSize: 13,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    background: COLORS.bg,
  },
};
