/**
 * DEV-ONLY floating console that shows timestamped signing steps.
 * Rendered as null in production builds (import.meta.env.DEV === false).
 *
 * Usage:
 *   const { log, DevSigningLog } = useDevSigningLog();
 *   log('step label');  // adds a timestamped entry
 *   <DevSigningLog />   // renders the overlay (no-op in prod)
 */

import { useState, useCallback, useRef } from 'react';

const IS_DEV = import.meta.env.DEV;
const LOG_ENABLED = IS_DEV && import.meta.env.PUBLIC_DEV_SIGNING_LOG === 'true';

/** Returns { log, DevSigningLog } — stable across renders. */
export function useDevSigningLog() {
  const [entries, setEntries] = useState([]);
  const t0Ref = useRef(null);

  const log = useCallback((label, extra = '') => {
    if (!LOG_ENABLED) return;
    const now = performance.now();
    if (t0Ref.current === null) t0Ref.current = now;
    const elapsed = ((now - t0Ref.current) / 1000).toFixed(2);
    const ts = new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    setEntries(prev => [...prev, { ts, elapsed, label, extra }]);
    // Also mirror to browser console for easy copy-paste
    console.debug(`[AutoFirma +${elapsed}s] ${label}`, extra || '');
  }, []);

  const reset = useCallback(() => {
    t0Ref.current = null;
    setEntries([]);
  }, []);

  function DevSigningLog() {
    if (!LOG_ENABLED || entries.length === 0) return null;

    return (
      <div style={{
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        zIndex: 9999,
        background: 'rgba(15,15,15,0.93)',
        color: '#d4f5a0',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.5',
        borderRadius: '8px',
        padding: '10px 12px',
        maxWidth: '360px',
        maxHeight: '55vh',
        overflowY: 'auto',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
          <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.05em' }}>🛠 DEV · AutoFirma log</span>
          <button
            onClick={reset}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}
          >✕</button>
        </div>
        {entries.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '1px' }}>
            <span style={{ color: '#888', flexShrink: 0 }}>+{e.elapsed}s</span>
            <span style={{ color: '#d4f5a0' }}>{e.label}</span>
            {e.extra && <span style={{ color: '#ff9f7f' }}>{String(e.extra)}</span>}
          </div>
        ))}
        {entries.length > 1 && (
          <div style={{ marginTop: '6px', borderTop: '1px solid #333', paddingTop: '4px', color: '#ffdd77' }}>
            Total: +{entries[entries.length - 1].elapsed}s desde el inicio
          </div>
        )}
      </div>
    );
  }

  return { log, reset, DevSigningLog };
}
