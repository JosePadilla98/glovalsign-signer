import { useEffect, useRef, useState } from 'react'; // useRef kept for scriptRef
import { Alert } from '../components/Alert.jsx';
import { useDevSigningLog } from '../components/DevSigningLog.jsx';
import { AutofirmaInstallModal } from '../components/AutofirmaInstallModal.jsx';
import { ManualUploadStep } from './ManualUploadStep.jsx';
import {
  isAutoScriptLoaded,
  initAutoFirma,
  signPdfWithAutoFirma,
  base64ToUint8Array,
  getSignModeInfo,
} from '../utils/autofirma.js';
import { submitSignedDocument } from '../api/signing.js';

const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const servletBaseUrl = import.meta.env.PUBLIC_SERVLET_BASE_URL?.replace(/\/$/, '') || undefined;
const mobileReady = !isMobile || !!servletBaseUrl;

// ── Signing progress indicator ──────────────────────────────────────────────

const SIGNING_STEPS = [
  { key: 'loading_script', label: 'Cargando AutoFirma' },
  { key: 'signing',        label: 'Esperando confirmación en AutoFirma…' },
  { key: 'uploading',      label: 'Enviando documento firmado' },
];
const STEP_INDEX = { loading_script: 0, signing: 1, uploading: 2 };

function SigningProgressIndicator({ status }) {
  const currentIdx = STEP_INDEX[status] ?? -1;
  if (currentIdx < 0) return null;
  return (
    <div className="signing-progress" role="status" aria-live="polite">
      {SIGNING_STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div
            key={step.key}
            className={`signing-progress__step${
              isActive ? ' signing-progress__step--active'
              : isDone  ? ' signing-progress__step--done'
              : ''
            }`}
          >
            <span className="signing-progress__icon">
              {isDone
                ? <span className="signing-progress__check">✓</span>
                : isActive
                ? <span className="signing-progress__spinner" />
                : <span className="signing-progress__dot" />}
            </span>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Step 2 — AutoFirma-based signing.
 *
 * Loads autoscript.js, fetches the PDF from the backend,
 * sends it to the AutoFirma native app, and uploads the signed result.
 *
 * @param {object} props
 * @param {string} props.token
 * @param {object} props.solicitud  Signing request metadata from the backend
 * @param {React.MutableRefObject<string|null>} props.prefetchedPdfRef  Pre-fetched PDF base64 (set by SigningFlow during step 1)
 * @param {(bytes: Uint8Array) => void} props.onSuccess
 */
export function AutofirmaSigningStep({ token, solicitud, prefetchedPdfRef, onSuccess }) {
  // 'idle' | 'loading_script' | 'signing' | 'uploading' | 'error'
  const [status, setStatus] = useState('idle');
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const scriptRef = useRef(null);
  const { log, DevSigningLog } = useDevSigningLog();

  // ── Load autoscript.js dynamically on mount ─────────────────────────────

  useEffect(() => {
    if (isAutoScriptLoaded()) {
      log('autoscript.js ya estaba cargado');
      setScriptReady(true);
      return;
    }

    setStatus('loading_script');
    log('cargando autoscript.js…');

    const script = document.createElement('script');
    script.src = '/vendor/autoscript.js';
    script.async = true;
    scriptRef.current = script;

    script.onload = () => {
      log('autoscript.js cargado ✓');
      setScriptReady(true);
      setStatus('idle');
    };

    script.onerror = () => {
      log('autoscript.js ERROR al cargar');
      setError(
        'No se pudo cargar AutoScript (/vendor/autoscript.js). ' +
        'Contacta con el administrador.',
      );
      setStatus('error');
    };

    document.head.appendChild(script);

    return () => {
      if (!isAutoScriptLoaded() && scriptRef.current) {
        document.head.removeChild(scriptRef.current);
      }
    };
  }, []);

  // ── Sign handler ────────────────────────────────────────────────────────

  async function handleSign() {
    setError('');
    log('--- inicio firma ---');
    log(`modo dispositivo: ${isMobile ? 'MÓVIL' : 'ESCRITORIO'}`, isMobile ? `servlet: ${servletBaseUrl ?? 'no configurado'}` : 'WebSocket local');
    const signMode = getSignModeInfo();
    log(`modo firma: ${signMode.mode}`, signMode.detail);

    // 1. Init AutoFirma
    log('initAutoFirma…');
    try {
      initAutoFirma(servletBaseUrl);
      log('initAutoFirma ✓');
    } catch (err) {
      log('initAutoFirma ERROR', err.message);
      setError(err.message);
      setStatus('error');
      return;
    }

    // 2. Get pre-fetched PDF bytes (captured by PdfViewer during step 1 — no extra download needed)
    setStatus('signing');
    const base64Pdf = prefetchedPdfRef.current;
    if (!base64Pdf) {
      log('PDF no disponible — bytes aún null');
      setError('El documento aún no está listo. Espera un momento y vuelve a intentarlo.');
      setStatus('error');
      return;
    }
    log('PDF bytes listos ✓', `${(base64Pdf.length * 0.75 / 1024).toFixed(0)} KB aprox.`);

    // 3. Sign with AutoFirma native app
    log('AutoScript.sign() — enviando a AutoFirma…');
    let signedBase64;
    try {
      signedBase64 = await signPdfWithAutoFirma(base64Pdf);
      log('AutoScript.sign() completado ✓', `resultado: ${(signedBase64.length * 0.75 / 1024).toFixed(0)} KB`);
    } catch (err) {
      log('AutoScript.sign() ERROR', err.message);
      setError(err.message);
      setStatus('error');
      return;
    }

    // 4. Upload signed PDF to the backend
    setStatus('uploading');
    log('subiendo PDF firmado al backend…');
    const signedBytes = base64ToUint8Array(signedBase64);
    try {
      const result = await submitSignedDocument(token, signedBytes, 'autofirma');
      if (!result.ok) {
        log('subida ERROR', result.error);
        throw new Error(result.error || 'Error al enviar el documento firmado al servidor.');
      }
      log('subida completada ✓');
    } catch (err) {
      setError(err.message);
      setStatus('error');
      return;
    }

    log('=== firma completada ===');
    onSuccess(signedBytes, 'autofirma');
  }

  // ── Derived flags ───────────────────────────────────────────────────────

  const isBusy = status === 'loading_script' || status === 'signing' || status === 'uploading';
  const isBlocked = isMobile && !servletBaseUrl;

  const buttonLabel =
    status === 'loading_script'
      ? 'Cargando AutoScript…'
      : status === 'signing'
      ? 'Esperando firma en AutoFirma…'
      : status === 'uploading'
      ? 'Enviando documento firmado…'
      : 'Firmar con AutoFirma';

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {showInstallModal && (
        <AutofirmaInstallModal
          onClose={() => setShowInstallModal(false)}
        />
      )}

      <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Al pulsar el botón se abrirá la aplicación <strong>AutoFirma</strong> instalada en tu
        dispositivo. Selecciona tu certificado dentro de AutoFirma para completar la firma.
      </p>

      {isBusy && <SigningProgressIndicator status={status} />}

      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert type="error" message={error} />
        </div>
      )}

      <div className="divider" />

      <button
        type="button"
        className={`btn btn--primary btn--lg btn--full${isBusy ? ' btn--loading' : ''}`}
        onClick={handleSign}
        disabled={isBusy || isBlocked || !scriptReady}
      >
        {isBusy && <span className="btn__spinner" aria-hidden="true" />}
        {buttonLabel}
      </button>

      <div style={{ textAlign: 'center', marginTop: '0.875rem' }}>
        <button
          type="button"
          onClick={() => setShowInstallModal(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-muted)', textDecoration: 'underline' }}
        >
          ¿Cómo instalar AutoFirma?
        </button>
      </div>

      <DevSigningLog />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SigningStep — wrapper with tab support
//
// Props:
//   signing_methods: { autofirma: boolean, manual_upload: boolean }
//   (from solicitud.signing_methods returned by the backend)
// ─────────────────────────────────────────────────────────────────────────────

const TAB_STYLES = {
  tabBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1.75rem',
    padding: '0.25rem',
    background: '#f1f5f9',
    borderRadius: '10px',
  },
  tab: (active) => ({
    flex: '1',
    maxWidth: '220px',
    padding: '0.6rem 1rem',
    background: active ? '#ffffff' : 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: active ? 'var(--color-primary, #2563eb)' : 'var(--color-text-muted, #64748b)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    fontSize: '0.875rem',
    textAlign: 'center',
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
    transition: 'all 0.18s',
  }),
};

/**
 * Top-level signing step component with optional tab selection.
 *
 * When only one method is enabled it renders that method directly (no tabs).
 * When both are enabled, shows a tab bar.
 *
 * @param {object} props
 * @param {string} props.token
 * @param {object} props.solicitud
 * @param {React.MutableRefObject<string|null>} props.prefetchedPdfRef
 * @param {(bytes: Uint8Array) => void} props.onSuccess
 */
export function SigningStep({ token, solicitud, prefetchedPdfRef, onSuccess }) {
  const methods = solicitud?.signing_methods ?? { autofirma: true, manual_upload: false };
  const hasAutofirma = methods.autofirma;
  const hasManual = methods.manual_upload;

  // Default active tab: autofirma first if available, else manual_upload
  const defaultTab = hasAutofirma ? 'autofirma' : 'manual_upload';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const showTabs = hasAutofirma && hasManual;

  // Edge case: no method enabled
  if (!hasAutofirma && !hasManual) {
    return (
      <Alert
        type="error"
        message="No hay métodos de firma habilitados. Contacta con el administrador."
      />
    );
  }

  return (
    <div>
      {showTabs && (
        <div style={TAB_STYLES.tabBar}>
          <button
            type="button"
            style={TAB_STYLES.tab(activeTab === 'autofirma')}
            onClick={() => setActiveTab('autofirma')}
          >
            Firmar con AutoFirma
          </button>
          <button
            type="button"
            style={TAB_STYLES.tab(activeTab === 'manual_upload')}
            onClick={() => setActiveTab('manual_upload')}
          >
            Subir PDF firmado
          </button>
        </div>
      )}

      {(!showTabs ? hasAutofirma : activeTab === 'autofirma') && (
        <AutofirmaSigningStep
          token={token}
          solicitud={solicitud}
          prefetchedPdfRef={prefetchedPdfRef}
          onSuccess={onSuccess}
        />
      )}

      {(!showTabs ? hasManual : activeTab === 'manual_upload') && (
        <ManualUploadStep
          token={token}
          fileName={solicitud?.datos_documento?.nombre_documento ?? 'documento.pdf'}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

