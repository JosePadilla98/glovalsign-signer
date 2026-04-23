import { useEffect, useRef, useState } from 'react'; // useRef kept for scriptRef
import { Alert } from '../components/Alert.jsx';
import { Spinner } from '../components/Spinner.jsx';
import {
  isAutoScriptLoaded,
  initAutoFirma,
  signPdfWithAutoFirma,
  base64ToUint8Array,
} from '../utils/autofirma.js';
import { submitSignedDocument } from '../api/signing.js';

const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const servletBaseUrl = import.meta.env.PUBLIC_SERVLET_BASE_URL?.replace(/\/$/, '') || undefined;
const mobileReady = !isMobile || !!servletBaseUrl;

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
  const scriptRef = useRef(null);
  // ── Load autoscript.js dynamically on mount ─────────────────────────────

  useEffect(() => {
    if (isAutoScriptLoaded()) {
      setScriptReady(true);
      return;
    }

    setStatus('loading_script');

    const script = document.createElement('script');
    script.src = '/vendor/autoscript.js';
    script.async = true;
    scriptRef.current = script;

    script.onload = () => {
      setScriptReady(true);
      setStatus('idle');
    };

    script.onerror = () => {
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

    // 1. Init AutoFirma
    try {
      initAutoFirma(servletBaseUrl);
    } catch (err) {
      setError(err.message);
      setStatus('error');
      return;
    }

    // 2. Get pre-fetched PDF bytes (captured by PdfViewer during step 1 — no extra download needed)
    setStatus('signing');
    const base64Pdf = prefetchedPdfRef.current;
    if (!base64Pdf) {
      setError('El documento aún no está listo. Espera un momento y vuelve a intentarlo.');
      setStatus('error');
      return;
    }

    // 3. Sign with AutoFirma native app
    let signedBase64;
    try {
      signedBase64 = await signPdfWithAutoFirma(base64Pdf);
    } catch (err) {
      setError(err.message);
      setStatus('error');
      return;
    }

    // 4. Upload signed PDF to the backend
    setStatus('uploading');
    const signedBytes = base64ToUint8Array(signedBase64);
    try {
      const result = await submitSignedDocument(token, signedBytes);
      if (!result.ok) {
        throw new Error(result.error || 'Error al enviar el documento firmado al servidor.');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
      return;
    }

    onSuccess(signedBytes);
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
      <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Al pulsar el botón se abrirá la aplicación <strong>AutoFirma</strong> instalada en tu
        dispositivo. Selecciona tu certificado dentro de AutoFirma para completar la firma.
      </p>

      {isMobile && isBlocked && (
        <Alert
          type="error"
          message="La firma desde dispositivos móviles requiere un servidor de servlets configurado. Contacta con el administrador."
        />
      )}

      {isMobile && !isBlocked && (
        <Alert
          type="warning"
          message={`Modo móvil: usando servidor intermedio en ${servletBaseUrl}. Asegúrate de tener la app AutoFirma instalada en este dispositivo.`}
        />
      )}

      {isBusy && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Spinner label={buttonLabel} />
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert type="error" message={error} />
        </div>
      )}

      <div className="divider" />

      <button
        type="button"
        className="btn btn--primary btn--lg btn--full"
        onClick={handleSign}
        disabled={isBusy || isBlocked || !scriptReady}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
