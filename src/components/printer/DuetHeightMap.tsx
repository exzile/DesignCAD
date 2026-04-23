import { useState, useEffect, useMemo, useCallback } from 'react';
import './DuetHeightMap.css';
import { RefreshCw, Crosshair, Loader2, BarChart3, Grid3x3, Download, Save, ToggleLeft, ToggleRight, FolderOpen, GitCompareArrows, X } from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';
import { ColorScaleLegend, Heatmap2D, Scene3D, StatsPanel } from './heightMap/visualization';
import { computeDiffMap, computeStats, exportHeightMapCSV } from './heightMap/utils';

export default function DuetHeightMap() {
  const heightMap = usePrinterStore((s) => s.heightMap);
  const loadHeightMap = usePrinterStore((s) => s.loadHeightMap);
  const probeGrid = usePrinterStore((s) => s.probeGrid);
  const sendGCode = usePrinterStore((s) => s.sendGCode);
  const service = usePrinterStore((s) => s.service);
  const connected = usePrinterStore((s) => s.connected);
  const compensationType = usePrinterStore((s) => s.model.move?.compensation?.type);

  const [loading, setLoading] = useState(false);
  const [probing, setProbing] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [csvFiles, setCsvFiles] = useState<string[]>([]);
  const [selectedCsv, setSelectedCsv] = useState('0:/sys/heightmap.csv');
  const [loadingCsvList, setLoadingCsvList] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareCsv, setCompareCsv] = useState('');
  const [compareMap, setCompareMap] = useState<typeof heightMap | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const refreshCsvList = useCallback(async () => {
    if (!service) return;
    setLoadingCsvList(true);
    try {
      const entries = await service.listFiles('0:/sys');
      setCsvFiles(entries.filter((entry) => entry.type === 'f' && entry.name.toLowerCase().endsWith('.csv')).map((entry) => entry.name).sort());
    } catch {
      setCsvFiles([]);
    } finally {
      setLoadingCsvList(false);
    }
  }, [service]);

  useEffect(() => {
    if (connected) void refreshCsvList();
  }, [connected, refreshCsvList]);

  const isCompensationEnabled = !!compensationType && compensationType !== 'none';
  const diffMap = useMemo(() => (compareMode && heightMap && compareMap ? computeDiffMap(heightMap, compareMap) : null), [compareMap, compareMode, heightMap]);
  const displayMap = diffMap ?? heightMap;
  const stats = useMemo(() => (displayMap ? computeStats(displayMap) : null), [displayMap]);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    try { await loadHeightMap(selectedCsv); } finally { setLoading(false); }
  }, [loadHeightMap, selectedCsv]);

  const handleProbe = useCallback(async () => {
    if (!confirm('Run bed mesh probing (G29)? Make sure the bed is clear and the nozzle is clean.')) return;
    setProbing(true);
    try { await probeGrid(); } finally { setProbing(false); }
  }, [probeGrid]);

  const handleSaveAs = useCallback(async () => {
    const filename = prompt('Save height map as (filename without path/extension):', 'heightmap_backup');
    if (!filename) return;
    await sendGCode(`M374 P"0:/sys/${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv"`);
    void refreshCsvList();
  }, [refreshCsvList, sendGCode]);

  const handleLoadCompare = useCallback(async (path: string) => {
    if (!service || !path) return;
    setCompareCsv(path);
    setLoadingCompare(true);
    try {
      setCompareMap(await service.getHeightMap(path));
      setCompareMode(true);
    } catch {
      setCompareMap(null);
      setCompareMode(false);
    } finally {
      setLoadingCompare(false);
    }
  }, [service]);

  return (
    <div className="duet-heightmap">
      <div className="heightmap-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <FolderOpen size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <select value={selectedCsv} onChange={(e) => setSelectedCsv(e.target.value)} disabled={loadingCsvList || csvFiles.length === 0} style={{ fontSize: 12, padding: '3px 6px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', maxWidth: 180 }} title="Select a CSV height map file from 0:/sys/">
            {csvFiles.length === 0 && <option value="0:/sys/heightmap.csv">heightmap.csv</option>}
            {csvFiles.map((file) => <option key={file} value={`0:/sys/${file}`}>{file}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => void refreshCsvList()} disabled={loadingCsvList} title="Refresh CSV file list" style={{ padding: '3px 5px', minWidth: 0 }}>
            {loadingCsvList ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
          </button>
        </div>
        <button className="btn btn-sm" onClick={handleLoad} disabled={loading || probing} title="Load selected height map from printer">{loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}<span>Load Height Map</span></button>
        <button className="btn btn-sm" onClick={handleProbe} disabled={loading || probing} title="Probe bed mesh (G29)">{probing ? <Loader2 size={14} className="spin" /> : <Crosshair size={14} />}<span>Probe Bed</span></button>
        <button className="btn btn-sm" onClick={() => heightMap && exportHeightMapCSV(heightMap)} disabled={!heightMap} title="Export height map as CSV file"><Download size={14} /><span>Export CSV</span></button>
        <button className="btn btn-sm" onClick={() => void handleSaveAs()} disabled={!heightMap || !connected} title="Save height map to a custom filename on the printer"><Save size={14} /><span>Save As</span></button>
        <button className="btn btn-sm" onClick={() => sendGCode(isCompensationEnabled ? 'G29 S2' : 'G29 S1')} title={isCompensationEnabled ? 'Disable bed compensation (G29 S2)' : 'Enable bed compensation (G29 S1)'}>
          {isCompensationEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          <span>{isCompensationEnabled ? 'Disable Comp' : 'Enable Comp'}</span>
        </button>
        {!compareMode ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <GitCompareArrows size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <select value="" onChange={(e) => { if (e.target.value) void handleLoadCompare(e.target.value); }} disabled={!heightMap || loadingCompare || csvFiles.length === 0} style={{ fontSize: 12, padding: '3px 6px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', maxWidth: 160 }} title="Compare with another height map">
              <option value="">Compare with...</option>
              {csvFiles.filter((file) => `0:/sys/${file}` !== selectedCsv).map((file) => <option key={file} value={`0:/sys/${file}`}>{file}</option>)}
            </select>
            {loadingCompare && <Loader2 size={12} className="spin" />}
          </div>
        ) : (
          <button className="btn btn-sm" onClick={() => { setCompareMode(false); setCompareMap(null); setCompareCsv(''); }} title="Exit compare mode" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
            <X size={14} />
            <span>Exit Compare</span>
          </button>
        )}
        <div className="heightmap-view-toggle">
          <button className={`toggle-btn ${viewMode === '3d' ? 'active' : ''}`} onClick={() => setViewMode('3d')} title="3D Surface View"><BarChart3 size={14} /><span>3D</span></button>
          <button className={`toggle-btn ${viewMode === '2d' ? 'active' : ''}`} onClick={() => setViewMode('2d')} title="2D Heatmap View"><Grid3x3 size={14} /><span>2D</span></button>
        </div>
      </div>

      {!heightMap ? (
        <div className="duet-heightmap-empty"><p>No height map data. Click "Load Height Map" or "Probe Bed" to get started.</p></div>
      ) : compareMode && !diffMap ? (
        <div className="duet-heightmap-empty"><p>{loadingCompare ? 'Loading comparison map...' : 'Grid dimensions do not match. Cannot compare these height maps.'}</p></div>
      ) : (
        <div className="heightmap-content">
          {compareMode && <div style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid rgba(59,130,246,0.2)', color: 'var(--accent)' }}>Showing difference: {compareCsv.split('/').pop()} minus {selectedCsv.split('/').pop()}&nbsp;(red = higher, blue = lower)</div>}
          <div className="heightmap-viz">{viewMode === '3d' ? <div className="heightmap-3d"><Scene3D heightMap={displayMap!} diverging={compareMode} /></div> : <Heatmap2D heightMap={displayMap!} diverging={compareMode} />}</div>
          {stats && <ColorScaleLegend min={stats.min} max={stats.max} diverging={compareMode} />}
          {stats && <StatsPanel stats={stats} />}
        </div>
      )}

      {probing && <div className="heightmap-probing-indicator"><Loader2 size={16} className="spin" /><span>Probing bed mesh... This may take a few minutes.</span></div>}
    </div>
  );
}
