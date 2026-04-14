import { useState, useEffect } from 'react';
import { Steps } from '../components/Steps.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { Alert } from '../components/Alert.jsx';
import { DocumentViewer } from './DocumentViewer.jsx';
import { CertificateSigningStep } from './CertificateSigningStep.jsx';
import { SuccessPage } from './SuccessPage.jsx';
import { ErrorPage } from './ErrorPage.jsx';
import { getSolicitud } from '../api/signing.js';

const STEPS = [
  { label: 'Revisar documento' },
  { label: 'Firmar' },
];

const STEP_VIEW = 0;
const STEP_SIGN = 1;
const STEP_SUCCESS = 2;

/**
 * Top-level signing flow orchestrator.
 * Fetches signing request metadata and renders the appropriate step.
 *
 * @param {{ token: string }} props
 */
export function SigningFlow({ token }) {
  const [currentStep, setCurrentStep] = useState(STEP_VIEW);
  const [solicitud, setSolicitud] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load signing request metadata on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const result = await getSolicitud(token);

      if (cancelled) return;

      if (!result.ok) {
        if (result.status === 404 || result.status === 410) {
          setLoadError('not_found');
        } else if (result.status === 409) {
          setLoadError('already_signed');
        } else if (result.status === 423) {
          setLoadError('locked');
        } else {
          setLoadError('generic');
        }
      } else {
        setSolicitud(result.data);
      }

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  // ── Error states ────────────────────────────────────────────────────────────

  if (loading) {
    return <Spinner label="Cargando solicitud de firma…" />;
  }

  if (loadError === 'not_found') {
    return (
      <ErrorPage
        icon="🔗"
        title="Enlace caducado o no encontrado"
        description="Este enlace de firma ya no es válido. Es posible que haya caducado o haya sido reemplazado por uno nuevo. Revisa tu correo para encontrar el enlace más reciente."
      />
    );
  }

  if (loadError === 'already_signed') {
    return (
      <ErrorPage
        icon="✅"
        title="Documento ya firmado"
        description="Este documento ya ha sido firmado anteriormente. Si crees que es un error, contacta con el remitente."
      />
    );
  }

  if (loadError === 'locked') {
    return (
      <ErrorPage
        icon="⏳"
        title="Firma en curso"
        description="Hay una operación de firma en progreso para este documento. Espera unos segundos y vuelve a intentarlo."
      />
    );
  }

  if (loadError) {
    return (
      <ErrorPage
        icon="⚠️"
        title="Error al cargar el documento"
        description="No se pudo obtener la información del documento. Por favor, inténtalo de nuevo más tarde o contacta con el soporte."
      />
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────

  if (currentStep === STEP_SUCCESS) {
    return (
      <SuccessPage
        signerName={solicitud?.datos_documento?.nombre_firmante}
        documentType={solicitud?.datos_documento?.tipo_documento}
      />
    );
  }

  // ── Main signing flow ───────────────────────────────────────────────────────

  return (
    <div>
      <Steps steps={STEPS} currentStep={currentStep} />

      <div className="card">
        <div className="card__header">
          <h1 className="card__title">
            {currentStep === STEP_VIEW ? 'Revisa el documento' : 'Firma con tu certificado digital'}
          </h1>
          <p className="card__subtitle">
            {currentStep === STEP_VIEW
              ? 'Lee el documento detenidamente antes de firmarlo.'
              : 'Selecciona tu certificado .p12 o .pfx e introduce tu contraseña para firmar.'}
          </p>
        </div>

        {currentStep === STEP_VIEW && (
          <DocumentViewer
            token={token}
            solicitud={solicitud}
            onContinue={() => setCurrentStep(STEP_SIGN)}
          />
        )}

        {currentStep === STEP_SIGN && (
          <CertificateSigningStep
            token={token}
            solicitud={solicitud}
            onSuccess={() => setCurrentStep(STEP_SUCCESS)}
          />
        )}
      </div>
    </div>
  );
}
