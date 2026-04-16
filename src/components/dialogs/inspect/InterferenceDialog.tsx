import { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import type { InterferenceResult } from '../../../types/cad';

interface Props {
  open: boolean;
  onClose: () => void;
  onRun: () => InterferenceResult[];
}

export function InterferenceDialog({ open, onClose, onRun }: Props) {
  const [results, setResults] = useState<InterferenceResult[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [createBodies, setCreateBodies] = useState(false);

  if (!open) return null;

  const handleCompute = () => {
    const r = onRun();
    setResults(r);
    setHasRun(true);
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-panel">
        <div className="dialog-header">
          <span className="dialog-title">Interference</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <p className="interference-description">
            Detects overlapping volumes between solid bodies using AABB pre-filter and mesh intersection.
          </p>
          {hasRun && results.length === 0 && (
            <div className="interference-empty">
              No solid body pairs found to test.
            </div>
          )}
          {hasRun && results.length > 0 && (
            <div className="interference-results">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="interference-result-row"
                >
                  {r.hasInterference
                    ? <XCircle size={14} color="#ef4444" />
                    : <CheckCircle size={14} color="#22c55e" />}
                  <span className="interference-result-bodies">
                    <strong>{r.bodyAName}</strong> ↔ <strong>{r.bodyBName}</strong>
                  </span>
                  {r.hasInterference && (
                    <span className="interference-result-count">
                      {r.intersectionCurveCount} curve{r.intersectionCurveCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="dialog-field interference-options-field">
            <label className="interference-disabled-label">
              <input
                type="checkbox"
                checked={createBodies}
                onChange={(e) => setCreateBodies(e.target.checked)}
                disabled
              />
              Create Interference Bodies (deferred)
            </label>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleCompute}>Compute</button>
        </div>
      </div>
    </div>
  );
}
