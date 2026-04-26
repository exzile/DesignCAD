// Print Issues Panel — aggregates quality flags detected from a slice
// result and shows them in a compact, scrollable HTML panel anchored
// over the 3D viewport. Beyond Cura/Orca: those tools surface only a
// subset (mostly long bridges) and require digging through layer-by-
// layer scrubbing to find them. We compute everything once per slice
// and present it as a unified to-do list.

import { Html } from '@react-three/drei';
import { useSlicerStore } from '../../../../store/slicerStore';
import type { PrintIssue, SliceStats } from './sliceStats';
import { formatDuration } from './sliceStats';

interface PrintIssuesPanelProps {
  issues: PrintIssue[];
  currentLayerIndex: number;
  stats: SliceStats;
}

const ISSUE_COLORS: Record<PrintIssue['severity'], string> = {
  warning: '#cc6600',
  info:    '#5588cc',
};

const ISSUE_ICONS: Record<PrintIssue['kind'], string> = {
  'long-bridge':              '⌒',
  'steep-overhang':           '◣',
  'thin-wall':                '│',
  'slow-layer':               '◷',
  'fast-layer':               '◴',
  'small-first-layer-contact':'■',
  'high-travel-ratio':        '↝',
};

export function PrintIssuesPanel({
  issues, currentLayerIndex, stats,
}: PrintIssuesPanelProps) {
  const setPreviewLayer = useSlicerStore((s) => s.setPreviewLayer);

  // Group issues by kind so we only show the kind once with a count
  // when there are many of the same type (e.g. 30 slow layers).
  type Group = { kind: PrintIssue['kind']; severity: PrintIssue['severity']; total: number; samples: PrintIssue[] };
  const groupMap = new Map<string, Group>();
  for (const issue of issues) {
    const key = `${issue.kind}:${issue.severity}`;
    let g = groupMap.get(key);
    if (!g) {
      g = { kind: issue.kind, severity: issue.severity, total: 0, samples: [] };
      groupMap.set(key, g);
    }
    g.total++;
    if (g.samples.length < 5) g.samples.push(issue);
  }
  const groups = [...groupMap.values()].sort((a, b) => {
    // warnings first, then by count
    if (a.severity !== b.severity) return a.severity === 'warning' ? -1 : 1;
    return b.total - a.total;
  });

  // Per-feature breakdown for the bottom of the panel — gives users
  // the "where's my filament going?" answer at a glance.
  const featureBreakdown = Object.entries(stats.byFeature)
    .map(([k, v]) => ({ kind: k, ...v }))
    .filter((f) => f.filamentMm > 0)
    .sort((a, b) => b.filamentMm - a.filamentMm);

  return (
    <Html
      position={[0, 0, 0]}
      transform={false}
      calculatePosition={() => [16, 380]}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <div style={{
          background: 'rgba(14, 16, 26, 0.92)',
          border: '1px solid rgba(120, 130, 200, 0.35)',
          borderRadius: 6,
          padding: '8px 10px',
          color: '#dde',
          fontSize: 11,
          width: 240,
          maxHeight: 360,
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.55)',
          userSelect: 'none',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#fff', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
            Print issues ({issues.length})
          </div>
          {groups.map((g) => (
            <div key={`${g.kind}:${g.severity}`} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 16, height: 16, lineHeight: '16px',
                  textAlign: 'center', borderRadius: 3,
                  background: ISSUE_COLORS[g.severity], color: '#fff',
                  fontWeight: 600,
                }}>
                  {ISSUE_ICONS[g.kind]}
                </span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {g.kind.replace(/-/g, ' ')}
                </span>
                {g.total > 1 && (
                  <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
                    ×{g.total}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                {g.samples[0].message}
              </div>
              <div style={{ fontSize: 10, marginTop: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {g.samples.map((s) => (
                  <button
                    key={`${s.kind}-${s.layerIndex}`}
                    onClick={() => setPreviewLayer(s.layerIndex)}
                    title={`Jump to layer ${s.layerIndex}`}
                    style={{
                      background: s.layerIndex === currentLayerIndex ? '#ffaa44' : 'rgba(255,255,255,0.08)',
                      color: s.layerIndex === currentLayerIndex ? '#000' : '#dde',
                      border: 'none', borderRadius: 3, padding: '1px 5px',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
                    }}
                  >
                    L{s.layerIndex}
                  </button>
                ))}
                {g.total > g.samples.length && (
                  <span style={{ opacity: 0.5, alignSelf: 'center' }}>
                    +{g.total - g.samples.length} more
                  </span>
                )}
              </div>
            </div>
          ))}
          {featureBreakdown.length > 0 && (
            <div style={{ marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#fff', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
                Per-feature breakdown
              </div>
              {featureBreakdown.map((f) => (
                <div key={f.kind} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 6, alignItems: 'center', fontSize: 10, padding: '1px 0' }}>
                  <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{f.kind.replace(/-/g, ' ')}</span>
                  <FeatureBar
                    fraction={f.filamentMm / Math.max(1e-3, stats.totalFilamentMm)}
                    color={ISSUE_COLORS.info}
                  />
                  <span style={{ opacity: 0.85 }}>
                    {((f.filamentMm / Math.max(1e-3, stats.totalFilamentMm)) * 100).toFixed(0)}%
                    {' · '}
                    {formatDuration(f.timeSec)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Html>
  );
}

function FeatureBar({ fraction, color }: { fraction: number; color: string }) {
  const w = Math.max(0, Math.min(1, fraction)) * 80;
  return (
    <div style={{ position: 'relative', height: 6, width: 80, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, background: color, borderRadius: 2 }} />
    </div>
  );
}
