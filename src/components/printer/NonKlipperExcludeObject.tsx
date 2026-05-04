/**
 * NonKlipperExcludeObject — workaround UI for non-Klipper printers.
 *
 * Most firmware (Marlin, Duet, Repetier, etc.) do not support mid-print object exclusion.
 * This component explains the limitation and offers a pre-print workaround via the
 * DesignCAD Prepare workspace (where the user can delete bodies before slicing).
 */
import { Layers, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';
import './KlipperTabs.css';

const FIRMWARE_SUPPORT: Record<string, { supported: boolean; note: string }> = {
  duet: {
    supported: false,
    note: 'Duet RRF does not currently support mid-print object exclusion via G-code. The M486 command used by Marlin is not available on RepRapFirmware.',
  },
  marlin: {
    supported: true,
    note: 'Marlin 2.1+ supports M486 object cancellation. However, your slicer must emit M486 labels in the G-code (Prusaslicer and Cura 5.x do this with "Label objects" enabled).',
  },
  smoothie: { supported: false, note: 'Smoothieware does not support mid-print object cancellation.' },
  grbl: { supported: false, note: 'grbl is a CNC firmware and does not support FDM object exclusion.' },
  repetier: { supported: false, note: 'Repetier does not support mid-print object cancellation.' },
  other: { supported: false, note: 'Your firmware may not support mid-print object cancellation.' },
};

export default function NonKlipperExcludeObject() {
  const boardType = usePrinterStore((s) => s.config.boardType ?? 'other');
  const setActiveTab = usePrinterStore((s) => s.setActiveTab);
  const info = FIRMWARE_SUPPORT[boardType] ?? FIRMWARE_SUPPORT.other;

  return (
    <div className="klipper-tab">
      <div className="klipper-tab-bar">
        <Layers size={15} />
        <h3>Exclude Object</h3>
        <span className="klipper-badge info" style={{ marginLeft: 4, textTransform: 'capitalize' }}>{boardType}</span>
        <div className="spacer" />
      </div>

      <div className="klipper-tab-body">
        {/* Firmware capability card */}
        <div className="klipper-card" style={{ borderColor: info.supported ? '#22c55e' : '#f59e0b' }}>
          <div className="klipper-card-header">
            {info.supported
              ? <><span className="klipper-badge on" style={{ marginRight: 6 }}>Supported</span>Mid-print Exclusion</>
              : <><AlertCircle size={13} style={{ display: 'inline', marginRight: 6, color: '#f59e0b' }} />Limited Support</>}
          </div>
          <div className="klipper-card-body">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {info.note}
            </p>
          </div>
        </div>

        {info.supported && boardType === 'marlin' && (
          <div className="klipper-card">
            <div className="klipper-card-header">Using M486 on Marlin</div>
            <div className="klipper-card-body">
              <div className="klipper-step">
                <div className="klipper-step-num">1</div>
                <div className="klipper-step-body">
                  <div className="klipper-step-title">Enable "Label objects" in your slicer</div>
                  <div className="klipper-step-desc">
                    In PrusaSlicer: Print Settings → Output → Label objects.<br />
                    In Cura 5.x: Extensions → Post-Processing → Add Script → Label Objects.
                  </div>
                </div>
              </div>
              <div className="klipper-step">
                <div className="klipper-step-num">2</div>
                <div className="klipper-step-body">
                  <div className="klipper-step-title">During the print, send M486 via Console</div>
                  <div className="klipper-step-desc">
                    Navigate to the <strong>Console</strong> tab and send:
                    <br />
                    <code style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>M486 S&lt;object_id&gt;</code>
                    <br />
                    where object_id starts at 1 for the first object in the G-code.
                  </div>
                  <button className="klipper-btn" onClick={() => setActiveTab('console')} style={{ marginTop: 6 }}>
                    Open Console <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pre-print workaround */}
        <div className="klipper-card">
          <div className="klipper-card-header">
            <Info size={13} style={{ display: 'inline', marginRight: 4 }} />
            Pre-Print Workaround
          </div>
          <div className="klipper-card-body">
            <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6 }}>
              The most reliable way to exclude objects before printing is to remove them from your model
              in the <strong>Prepare</strong> workspace before slicing:
            </p>
            <div className="klipper-step">
              <div className="klipper-step-num">1</div>
              <div className="klipper-step-body">
                <div className="klipper-step-title">Open the Prepare workspace</div>
                <div className="klipper-step-desc">
                  Close this printer panel and switch to the Prepare tab in the main toolbar.
                  Your model bodies appear in the build plate viewport.
                </div>
              </div>
            </div>
            <div className="klipper-step">
              <div className="klipper-step-num">2</div>
              <div className="klipper-step-body">
                <div className="klipper-step-title">Delete or hide the bodies you want to skip</div>
                <div className="klipper-step-desc">
                  Select a body on the build plate and press Delete, or toggle its visibility in the body list.
                  Only visible bodies are included in the sliced G-code.
                </div>
              </div>
            </div>
            <div className="klipper-step">
              <div className="klipper-step-num">3</div>
              <div className="klipper-step-body">
                <div className="klipper-step-title">Re-slice and upload</div>
                <div className="klipper-step-desc">
                  Click Slice in the Prepare workspace, then upload the new G-code to your printer.
                  The excluded body will not appear in this print.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Klipper upgrade note */}
        <div className="klipper-card">
          <div className="klipper-card-header">Want full mid-print exclusion?</div>
          <div className="klipper-card-body">
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Klipper supports real-time object cancellation via <code>EXCLUDE_OBJECT NAME=...</code> even mid-layer.
              If you run Klipper, connect your printer and change the board type to <strong>Klipper</strong> in
              Settings to unlock this feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
