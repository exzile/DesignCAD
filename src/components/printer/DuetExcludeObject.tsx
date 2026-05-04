/**
 * DuetExcludeObject — RRF mid-print object exclusion via M486.
 *
 * RepRapFirmware 3.5+ supports M486 object cancellation. The store's
 * `cancelObject(index)` already emits `M486 P<index>`; the live object list
 * comes from the Duet object model at `model.job.build.objects`.
 *
 * Slicer must emit object labels (PrusaSlicer/SuperSlicer/OrcaSlicer with
 * "Label objects" enabled, Cura 5.x with the Label Objects post-processor).
 */
import { useState } from 'react';
import { Layers, WifiOff, AlertCircle, XCircle } from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';
import './KlipperTabs.css';

export default function DuetExcludeObject() {
  const connected = usePrinterStore((s) => s.connected);
  const model = usePrinterStore((s) => s.model);
  const cancelObject = usePrinterStore((s) => s.cancelObject);

  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!connected) {
    return (
      <div className="klipper-tab">
        <div className="klipper-disconnected">
          <WifiOff size={32} />
          <span>Connect to a Duet printer to manage object exclusion.</span>
        </div>
      </div>
    );
  }

  const objects = model.job?.build?.objects ?? [];
  const currentObject = model.job?.build?.currentObject ?? -1;
  const cancelledCount = objects.filter((o) => o.cancelled).length;
  const remainingCount = objects.length - cancelledCount;

  const handleCancel = async (index: number) => {
    setBusy(true);
    setError(null);
    try {
      await cancelObject(index);
      setConfirmIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send M486');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="klipper-tab">
      <div className="klipper-tab-bar">
        <Layers size={15} />
        <h3>Exclude Object</h3>
        <span className="klipper-badge info" style={{ marginLeft: 4 }}>Duet · M486</span>
        <div className="spacer" />
      </div>

      <div className="klipper-tab-body">
        {error && (
          <div className="klipper-card" style={{ borderColor: '#ef4444' }}>
            <div className="klipper-card-body" style={{ color: '#ef4444', fontSize: 12 }}>
              {error}
            </div>
          </div>
        )}

        {objects.length === 0 ? (
          <div className="klipper-card">
            <div className="klipper-card-header">
              <AlertCircle size={13} style={{ display: 'inline', marginRight: 6, color: '#f59e0b' }} />
              No labelled objects in this print
            </div>
            <div className="klipper-card-body">
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                M486 needs object labels in your G-code. Enable <strong>Label objects</strong>
                {' '}in PrusaSlicer / SuperSlicer / OrcaSlicer (Print Settings → Output) or run
                {' '}the <em>Label Objects</em> post-processing script in Cura 5.x, then re-slice
                {' '}and start a print. Labelled objects will appear here automatically.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Requires RepRapFirmware 3.5 or newer.
              </p>
            </div>
          </div>
        ) : (
          <div className="klipper-card">
            <div className="klipper-card-header">
              Objects on plate &nbsp;
              <span className="klipper-badge info">{remainingCount} remaining</span>
              {cancelledCount > 0 && (
                <span className="klipper-badge error" style={{ marginLeft: 4 }}>{cancelledCount} cancelled</span>
              )}
            </div>
            <div className="klipper-card-body">
              <div className="klipper-object-grid">
                {objects.map((obj, i) => {
                  const isCurrent = i === currentObject;
                  const isCancelled = obj.cancelled;
                  const name = obj.name || `Object ${i}`;
                  const confirming = confirmIndex === i;
                  return (
                    <button
                      key={i}
                      className={`klipper-object-btn${isCancelled ? ' excluded' : ''}${isCurrent ? ' current' : ''}`}
                      onClick={() => {
                        if (isCancelled || busy) return;
                        if (confirming) void handleCancel(i);
                        else setConfirmIndex(i);
                      }}
                      title={
                        isCancelled
                          ? 'Cancelled'
                          : confirming
                            ? `Click again to confirm M486 P${i}`
                            : `Click to cancel "${name}"`
                      }
                      disabled={isCancelled || busy}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, opacity: 0.6 }}>#{i}</span>
                        {name}
                      </span>
                      {isCurrent && !isCancelled && (
                        <span className="klipper-badge info" style={{ marginTop: 2 }}>Printing</span>
                      )}
                      {isCancelled && (
                        <span className="klipper-badge error" style={{ marginTop: 2 }}>Cancelled</span>
                      )}
                      {confirming && !isCancelled && (
                        <span className="klipper-badge warn" style={{ marginTop: 2 }}>
                          <XCircle size={10} style={{ marginRight: 2 }} /> Click to confirm
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                Click an object once to arm, again to send <code>M486 P&lt;n&gt;</code>. Cancellation cannot be undone mid-print.
                {confirmIndex !== null && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => setConfirmIndex(null)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--accent)',
                        cursor: 'pointer', padding: 0, fontSize: 11, textDecoration: 'underline',
                      }}
                    >
                      Clear armed selection
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
