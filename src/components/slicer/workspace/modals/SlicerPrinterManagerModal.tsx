import { useState } from 'react';
import { X, Printer, Plus, Trash2, ChevronRight, RefreshCw } from 'lucide-react';
import { useSlicerStore } from '../../../../store/slicerStore';
import { usePrinterStore } from '../../../../store/printerStore';
import type { PrinterProfile } from '../../../../types/slicer';
import { colors, sharedStyles } from '../../../../utils/theme';
import { parseDuetConfig } from '../../../../utils/duetConfigParser';
import { ExtruderTab, PrinterTab } from './slicerPrinterManager/tabs';

const TABS = ['Printer', 'Extruder 1'] as const;

export function SlicerPrinterManagerModal({ onClose }: { onClose: () => void }) {
  const printerProfiles = useSlicerStore((s) => s.printerProfiles);
  const activePrinterId = useSlicerStore((s) => s.activePrinterProfileId);
  const setActivePrinter = useSlicerStore((s) => s.setActivePrinterProfile);
  const deletePrinter = useSlicerStore((s) => s.deletePrinterProfile);
  const createPrinter = useSlicerStore((s) => s.createPrinterWithDefaults);
  const updatePrinter = useSlicerStore((s) => s.updatePrinterProfile);
  const updateMaterialProfile = useSlicerStore((s) => s.updateMaterialProfile);
  const updatePrintProfile = useSlicerStore((s) => s.updatePrintProfile);

  const duetPrinters = usePrinterStore((s) => s.printers);
  const printerService = usePrinterStore((s) => s.service);
  const printerConnected = usePrinterStore((s) => s.connected);
  const activeDuetId = usePrinterStore((s) => s.activePrinterId);

  const [selectedId, setSelectedId] = useState(activePrinterId);
  const [tab, setTab] = useState<typeof TABS[number]>('Printer');
  const [addingName, setAddingName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [selectedDuetId, setSelectedDuetId] = useState(activeDuetId);

  const selectedPrinter = printerProfiles.find((p) => p.id === selectedId) ?? printerProfiles[0];

  function upd(updates: Partial<PrinterProfile>) {
    if (selectedPrinter) updatePrinter(selectedPrinter.id, updates);
  }

  function handleCreate() {
    const name = addingName.trim();
    if (!name) return;
    createPrinter(name);
    const newId = useSlicerStore.getState().activePrinterProfileId;
    setSelectedId(newId);
    setAddingName('');
    setShowAdd(false);
    setSyncError(null);
  }

  async function readBoardFiles(service: NonNullable<typeof printerService>) {
    const readFile = async (path: string) => {
      try {
        return await (await service.downloadFile(path)).text();
      } catch {
        return '';
      }
    };

    return Promise.all([
      readFile('0:/sys/config.g'),
      readFile('0:/sys/start.g'),
      readFile('0:/sys/stop.g'),
      readFile('0:/sys/config-override.g'),
      readFile('0:/sys/tool0.g'),
      readFile('0:/sys/tpre0.g'),
      readFile('0:/sys/tfree0.g'),
    ]);
  }

  async function handleSyncFromDuet() {
    const name = addingName.trim();
    if (!name) return;
    const service = printerService ?? usePrinterStore.getState().service;
    if (!service) {
      setSyncError('No connected Duet printer');
      return;
    }

    setSyncing(true);
    setSyncError(null);
    try {
      const [configG, startG, stopG, overrideG, tool0G, tpre0G, tfree0G] = await readBoardFiles(service);
      const {
        profile,
        profileMachineSourcedFields,
        startGCode,
        endGCode,
        extruderStartGCode,
        extruderEndGCode,
        extruderPrestartGCode,
        materialPatch,
        printPatch,
      } = parseDuetConfig(configG, startG, stopG, overrideG, tool0G, tpre0G, tfree0G);

      const duetPrinterName = duetPrinters.find((p) => p.id === selectedDuetId)?.name ?? '';
      const finalName = name || duetPrinterName || 'Duet Printer';

      createPrinter(finalName);
      const newId = useSlicerStore.getState().activePrinterProfileId;
      const existingProfile = useSlicerStore.getState().printerProfiles.find((p) => p.id === newId);
      updatePrinter(newId, {
        ...profile,
        gcodeFlavorType: 'duet',
        startGCode: startGCode || (existingProfile?.startGCode ?? ''),
        endGCode: endGCode || (existingProfile?.endGCode ?? ''),
        ...(extruderStartGCode ? { extruderStartGCode } : {}),
        ...(extruderEndGCode ? { extruderEndGCode } : {}),
        ...(extruderPrestartGCode ? { extruderPrestartGCode } : {}),
        machineSourcedFields: profileMachineSourcedFields,
      });

      if (Object.keys(materialPatch.fields).length > 0) {
        const state = useSlicerStore.getState();
        const defaultMaterialId = state.printerLastMaterial[newId]
          ?? state.materialProfiles.find((m) => m.printerId === newId)?.id;
        if (defaultMaterialId) {
          updateMaterialProfile(defaultMaterialId, {
            ...materialPatch.fields,
            machineSourcedFields: materialPatch.machineSourcedFields,
          });
        }
      }

      if (Object.keys(printPatch.fields).length > 0) {
        const state = useSlicerStore.getState();
        const defaultPrintId = state.printerLastPrint[newId]
          ?? state.printProfiles.find((p) => p.printerId === newId)?.id;
        if (defaultPrintId) {
          updatePrintProfile(defaultPrintId, {
            ...printPatch.fields,
            machineSourcedFields: printPatch.machineSourcedFields,
          });
        }
      }

      setSelectedId(newId);
      setAddingName('');
      setShowAdd(false);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncSelected() {
    if (!selectedPrinter) return;
    const service = printerService ?? usePrinterStore.getState().service;
    if (!service) {
      setSyncError('No connected Duet printer');
      setSyncStatus(null);
      return;
    }

    setSyncing(true);
    setSyncError(null);
    setSyncStatus(null);
    try {
      const [configG, startG, stopG, overrideG, tool0G, tpre0G, tfree0G] = await readBoardFiles(service);
      if (!configG.trim()) {
        throw new Error('config.g is empty or missing on the board');
      }

      const {
        profile,
        profileMachineSourcedFields,
        startGCode,
        endGCode,
        extruderStartGCode,
        extruderEndGCode,
        extruderPrestartGCode,
        materialPatch,
        printPatch,
      } = parseDuetConfig(configG, startG, stopG, overrideG, tool0G, tpre0G, tfree0G);

      updatePrinter(selectedPrinter.id, {
        ...profile,
        gcodeFlavorType: 'duet',
        ...(startGCode ? { startGCode } : {}),
        ...(endGCode ? { endGCode } : {}),
        ...(extruderStartGCode ? { extruderStartGCode } : {}),
        ...(extruderEndGCode ? { extruderEndGCode } : {}),
        ...(extruderPrestartGCode ? { extruderPrestartGCode } : {}),
        machineSourcedFields: profileMachineSourcedFields,
      });

      const state = useSlicerStore.getState();

      if (Object.keys(materialPatch.fields).length > 0) {
        const materialId = state.printerLastMaterial[selectedPrinter.id]
          ?? state.materialProfiles.find((m) => m.printerId === selectedPrinter.id)?.id;
        if (materialId) {
          updateMaterialProfile(materialId, {
            ...materialPatch.fields,
            machineSourcedFields: materialPatch.machineSourcedFields,
          });
        }
      }

      if (Object.keys(printPatch.fields).length > 0) {
        const printId = state.printerLastPrint[selectedPrinter.id]
          ?? state.printProfiles.find((p) => p.printerId === selectedPrinter.id)?.id;
        if (printId) {
          updatePrintProfile(printId, {
            ...printPatch.fields,
            machineSourcedFields: printPatch.machineSourcedFields,
          });
        }
      }

      const printerFieldCount = Object.keys(profile).length;
      const materialFieldCount = Object.keys(materialPatch.fields).length;
      const printFieldCount = Object.keys(printPatch.fields).length;
      setSyncStatus(`Synced ${printerFieldCount} printer, ${materialFieldCount} material, ${printFieldCount} print fields from Duet`);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  function handleDelete(id: string) {
    if (printerProfiles.length <= 1) return;
    deletePrinter(id);
    const remaining = printerProfiles.filter((p) => p.id !== id);
    setSelectedId(remaining[0]?.id ?? '');
    setConfirmDelete(null);
  }

  function handleSelectRow(id: string) {
    setSelectedId(id);
    setActivePrinter(id);
    setConfirmDelete(null);
    setSyncError(null);
    setSyncStatus(null);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.panel,
          border: `1px solid ${colors.panelBorder}`,
          borderRadius: 10,
          width: 860,
          height: 640,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            flexShrink: 0,
            borderBottom: `1px solid ${colors.panelBorder}`,
            background: `linear-gradient(to bottom, color-mix(in srgb, ${colors.accent} 8%, ${colors.panelLight}), ${colors.panel})`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.text, fontSize: 14, fontWeight: 700 }}>
            <Printer size={16} color={colors.accent} />
            {selectedPrinter?.name ?? 'Manage Printers'}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: colors.textDim, cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.panelBorder}`, background: colors.panelLight, flexShrink: 0 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '9px 24px',
                fontSize: 13,
                fontWeight: tab === t ? 700 : 400,
                color: tab === t ? colors.accent : colors.textDim,
                background: tab === t ? colors.panel : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === t ? colors.accent : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              width: 195,
              flexShrink: 0,
              borderRight: `1px solid ${colors.panelBorder}`,
              display: 'flex',
              flexDirection: 'column',
              background: colors.panelLight,
            }}
          >
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {printerProfiles.map((printer) => {
                const isSel = printer.id === selectedId;
                const isConfirming = confirmDelete === printer.id;
                return (
                  <div
                    key={printer.id}
                    onClick={() => handleSelectRow(printer.id)}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${colors.panelBorder}`,
                      borderLeft: `3px solid ${isSel ? colors.accent : 'transparent'}`,
                      background: isSel ? `color-mix(in srgb, ${colors.accent} 10%, ${colors.panel})` : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: isSel ? 600 : 400, color: isSel ? colors.accent : colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {printer.name}
                        </div>
                        <div style={{ fontSize: 10, color: colors.textDim, marginTop: 1 }}>
                          {printer.buildVolume.x}x{printer.buildVolume.y}x{printer.buildVolume.z} mm
                        </div>
                      </div>
                      {isSel && <ChevronRight size={11} color={colors.accent} />}
                    </div>

                    {isConfirming ? (
                      <div style={{ display: 'flex', gap: 4, marginTop: 5 }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(printer.id)} style={{ ...sharedStyles.btnDanger, fontSize: 10, padding: '2px 7px' }}>Delete</button>
                        <button onClick={() => setConfirmDelete(null)} style={{ ...sharedStyles.btnBase, fontSize: 10, padding: '2px 7px' }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        disabled={printerProfiles.length <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(printer.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: colors.textDim,
                          cursor: printerProfiles.length <= 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          padding: '2px 0',
                          marginTop: 3,
                          opacity: printerProfiles.length <= 1 ? 0.3 : 1,
                          fontSize: 10,
                          alignItems: 'center',
                          gap: 3,
                        }}
                        onMouseEnter={(e) => {
                          if (printerProfiles.length > 1) (e.currentTarget as HTMLElement).style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = colors.textDim;
                        }}
                      >
                        <Trash2 size={10} /> Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {showAdd ? (
              <div style={{ padding: '8px 10px', borderTop: `1px solid ${colors.panelBorder}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  autoFocus
                  style={{ ...sharedStyles.input, width: '100%', boxSizing: 'border-box', fontSize: 12 }}
                  placeholder="Printer name..."
                  value={addingName}
                  onChange={(e) => {
                    setAddingName(e.target.value);
                    setSyncError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') {
                      setShowAdd(false);
                      setAddingName('');
                      setSyncError(null);
                    }
                  }}
                />

                {printerConnected && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10, color: colors.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Sync from Duet
                    </div>
                    {duetPrinters.length > 1 && (
                      <select
                        value={selectedDuetId}
                        onChange={(e) => setSelectedDuetId(e.target.value)}
                        style={{ ...sharedStyles.select, width: '100%', fontSize: 11 }}
                      >
                        {duetPrinters.map((dp) => (
                          <option key={dp.id} value={dp.id}>{dp.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={handleSyncFromDuet}
                      disabled={syncing || !addingName.trim()}
                      style={{
                        ...sharedStyles.btnBase,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        fontSize: 11,
                        width: '100%',
                        opacity: (syncing || !addingName.trim()) ? 0.5 : 1,
                        cursor: (syncing || !addingName.trim()) ? 'not-allowed' : 'pointer',
                        color: colors.accent,
                        borderColor: colors.accent,
                      }}
                    >
                      <RefreshCw size={11} className={syncing ? 'spin' : undefined} />
                      {syncing ? 'Reading config.g...' : 'Import from config.g'}
                    </button>
                    {syncError && <div style={{ fontSize: 10, color: '#ef4444' }}>{syncError}</div>}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={handleCreate} disabled={!addingName.trim()} style={{ ...sharedStyles.btnAccent, flex: 1, justifyContent: 'center', fontSize: 11, opacity: addingName.trim() ? 1 : 0.5 }}>Create</button>
                  <button onClick={() => { setShowAdd(false); setAddingName(''); setSyncError(null); }} style={{ ...sharedStyles.btnBase, fontSize: 11 }}>x</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 12px',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  borderTop: `1px solid ${colors.panelBorder}`,
                  color: colors.accent,
                  fontSize: 12,
                  fontWeight: 500,
                  width: '100%',
                }}
              >
                <Plus size={13} /> Add Printer
              </button>
            )}
          </div>

          {selectedPrinter ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {tab === 'Printer' && <PrinterTab p={selectedPrinter} upd={upd} />}
              {tab === 'Extruder 1' && <ExtruderTab p={selectedPrinter} upd={upd} />}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textDim, fontSize: 13 }}>
              Select a printer to edit
            </div>
          )}
        </div>

        <div
          style={{
            padding: '10px 18px',
            borderTop: `1px solid ${colors.panelBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            {printerConnected && selectedPrinter && (
              <button
                onClick={handleSyncSelected}
                disabled={syncing}
                title="Re-read config.g from the connected Duet and update this printer + its material and print profiles (acceleration, jerk, retraction, pressure advance)."
                style={{
                  ...sharedStyles.btnBase,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  opacity: syncing ? 0.6 : 1,
                  cursor: syncing ? 'wait' : 'pointer',
                  color: colors.accent,
                  borderColor: colors.accent,
                }}
              >
                <RefreshCw size={12} className={syncing ? 'spin' : undefined} />
                {syncing ? 'Syncing...' : 'Sync from Duet'}
              </button>
            )}
            {syncError && (
              <div style={{ fontSize: 11, color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {syncError}
              </div>
            )}
            {!syncError && syncStatus && (
              <div style={{ fontSize: 11, color: colors.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {syncStatus}
              </div>
            )}
          </div>
          <button style={sharedStyles.btnAccent} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
