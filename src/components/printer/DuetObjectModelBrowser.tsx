import React, { useMemo, useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Search, Braces, X } from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';
import { colors as COLORS } from '../../utils/theme';

// ---------------------------------------------------------------------------
// Style helpers — match the other Duet sub-panels
// ---------------------------------------------------------------------------
const panelStyle: React.CSSProperties = {
  background: COLORS.panel,
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 8,
  padding: 16,
};

const inputStyle: React.CSSProperties = {
  background: COLORS.inputBg,
  border: `1px solid ${COLORS.inputBorder}`,
  borderRadius: 4,
  color: COLORS.text,
  padding: '6px 8px 6px 28px',
  fontSize: 12,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

// ---------------------------------------------------------------------------
// Tree rendering
// ---------------------------------------------------------------------------

type JsonValue = string | number | boolean | null | undefined | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[];

function isObject(v: JsonValue): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function typeLabel(v: JsonValue): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === 'object') return `Object(${Object.keys(v).length})`;
  return typeof v;
}

function valueColor(v: JsonValue): string {
  if (v === null || v === undefined) return COLORS.textDim;
  if (typeof v === 'string') return COLORS.success;
  if (typeof v === 'number') return COLORS.accent;
  if (typeof v === 'boolean') return COLORS.warning;
  return COLORS.text;
}

function formatPrimitive(v: JsonValue): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return `"${v}"`;
  return String(v);
}

interface NodeProps {
  path: string;
  nodeKey: string;
  value: JsonValue;
  depth: number;
  search: string;
  expandedByDefault: boolean;
}

function Node({ path, nodeKey, value, depth, search, expandedByDefault }: NodeProps) {
  const [open, setOpen] = useState(expandedByDefault || depth < 1);

  const isContainer = isObject(value) || Array.isArray(value);
  const matchesSearch = search.length > 0 && path.toLowerCase().includes(search.toLowerCase());

  if (!isContainer) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: depth * 14,
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: '20px',
          background: matchesSearch ? 'rgba(80,120,255,0.08)' : 'transparent',
        }}
      >
        <span style={{ width: 14 }} />
        <span style={{ color: COLORS.text }}>{nodeKey}</span>
        <span style={{ color: COLORS.textDim }}>:</span>
        <span style={{ color: valueColor(value), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {formatPrimitive(value)}
        </span>
      </div>
    );
  }

  const entries = isObject(value)
    ? Object.entries(value)
    : (value as JsonArray).map((v, i) => [String(i), v] as [string, JsonValue]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingLeft: depth * 14,
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: '20px',
          color: COLORS.text,
          background: matchesSearch ? 'rgba(80,120,255,0.08)' : 'transparent',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>{nodeKey}</span>
        <span style={{ color: COLORS.textDim, marginLeft: 6 }}>{typeLabel(value)}</span>
      </div>
      {open && entries.map(([k, v]) => (
        <Node
          key={k}
          path={path === '' ? k : `${path}.${k}`}
          nodeKey={k}
          value={v}
          depth={depth + 1}
          search={search}
          expandedByDefault={expandedByDefault}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search-aware filtering — prune branches that contain no matches
// ---------------------------------------------------------------------------
function filterTree(value: JsonValue, search: string, path = ''): JsonValue | undefined {
  if (search.length === 0) return value;

  const lowerSearch = search.toLowerCase();
  if (path.toLowerCase().includes(lowerSearch)) return value;

  if (isObject(value)) {
    const out: JsonObject = {};
    let anyMatch = false;
    for (const [k, v] of Object.entries(value)) {
      const sub = filterTree(v, search, path === '' ? k : `${path}.${k}`);
      if (sub !== undefined) {
        out[k] = sub;
        anyMatch = true;
      }
    }
    return anyMatch ? out : undefined;
  }

  if (Array.isArray(value)) {
    const out: JsonArray = [];
    let anyMatch = false;
    for (let i = 0; i < value.length; i++) {
      const sub = filterTree(value[i], search, `${path}.${i}`);
      if (sub !== undefined) {
        out.push(sub);
        anyMatch = true;
      }
    }
    return anyMatch ? out : undefined;
  }

  // Primitive — match on stringified value as well
  if (String(value).toLowerCase().includes(lowerSearch)) return value;
  return undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DuetObjectModelBrowser() {
  const model = usePrinterStore((s) => s.model);

  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => filterTree(model as JsonObject, search),
    [model, search],
  );

  const handleClear = useCallback(() => setSearch(''), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Braces size={14} color={COLORS.textDim} />
          <span style={{ fontSize: 11, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Object Model (read-only)
          </span>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: COLORS.textDim }}
          />
          <input
            style={inputStyle}
            type="text"
            placeholder="Search keys and values…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              style={{
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: COLORS.textDim, cursor: 'pointer',
                padding: 4, display: 'flex', alignItems: 'center',
              }}
              onClick={handleClear}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{
          maxHeight: 560,
          overflow: 'auto',
          background: COLORS.bg,
          borderRadius: 4,
          padding: '8px 4px',
          border: `1px solid ${COLORS.panelBorder}`,
        }}>
          {filtered === undefined || (isObject(filtered) && Object.keys(filtered).length === 0) ? (
            <div style={{ color: COLORS.textDim, fontSize: 12, textAlign: 'center', padding: 16 }}>
              No matches for "{search}".
            </div>
          ) : (
            <Node
              path=""
              nodeKey="model"
              value={filtered}
              depth={0}
              search={search}
              expandedByDefault={search.length > 0}
            />
          )}
        </div>
      </div>
    </div>
  );
}
