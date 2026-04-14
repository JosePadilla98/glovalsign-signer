import { useState } from 'react';
import { CertificateFilePicker } from '../components/CertificateFilePicker.jsx';
import { PasswordInput } from '../components/PasswordInput.jsx';
import { Alert } from '../components/Alert.jsx';
import { parseCertificateInfo, signPdf } from '../utils/pdfSigner.js';
import { getDocumentViewUrl, submitSignedDocument } from '../api/signing.js';

/**
 * Step 2 — Certificate upload, password entry and signing.
 *
 * @param {object} props
 * @param {string} props.token
 * @param {object} props.solicitud   Signing request metadata from the backend
 * @param {() => void} props.onSuccess
 */
export function CertificateSigningStep({ token, solicitud, onSuccess }) {
  const [certFile, setCertFile] = useState(null);
  const [password, setPassword] = useState('');
  const [certInfo, setCertInfo] = useState(null);
  const [certError, setCertError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'signing' | 'uploading'

  const { nombre_firmante, tipo_documento, numero_expediente } = solicitud?.datos_documento ?? {};
  const isLoading = status !== 'idle';

  // ── Certificate file selection ──────────────────────────────────────────────

  function handleFileSelected(file) {
    setCertFile(file);
    setCertInfo(null);
    setCertError('');
    setPasswordError('');
    setGlobalError('');
    setPassword('');
  }

  // ── Validate certificate (preview info without signing) ───────────────────

  async function handleValidateCert() {
    if (!certFile) {
      setCertError('Por favor selecciona tu certificado digital.');
      return;
    }
    if (!password) {
      setPasswordError('Introduce la contraseña del certificado.');
      return;
    }

    setCertError('');
    setPasswordError('');
    setCertInfo(null);

    try {
      const buffer = await certFile.arrayBuffer();
      const info = parseCertificateInfo(buffer, password);

      // Validate certificate is not expired
      const now = new Date();
      if (info.validTo < now) {
        setCertError(
          `El certificado ha caducado el ${info.validTo.toLocaleDateString('es-ES')}. Usa un certificado vigente.`
        );
        return;
      }

      setCertInfo(info);
    } catch (err) {
      if (/contraseña|password/i.test(err.message)) {
        setPasswordError(err.message);
      } else {
        setCertError(err.message || 'Error al leer el certificado. Comprueba que el archivo es válido.');
      }
    }
  }

  // ── Sign and submit ────────────────────────────────────────────────────────

  async function handleSign() {
    if (!certFile || !password) return;
    if (!certInfo) {
      await handleValidateCert();
      return;
    }

    setGlobalError('');

    try {
      // 1. Download original PDF from the backend
      setStatus('signing');
      const pdfUrl = getDocumentViewUrl(token);
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error('No se pudo descargar el documento original. Inténtalo de nuevo.');
      }
      const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

      // 2. Sign in the browser
      const p12Buffer = await certFile.arrayBuffer();
      const signedBytes = await signPdf(pdfBytes, p12Buffer, password, {
        name: nombre_firmante,
        reason: `Firma de ${tipo_documento || 'documento'}`,
        location: solicitud?.datos_documento?.direccion_postal || '',
        email: solicitud?.datos_documento?.email_firmante || '',
      });

      // 3. Send signed PDF to the backend
      setStatus('uploading');
      const result = await submitSignedDocument(token, signedBytes);

      if (!result.ok) {
        throw new Error(result.error || 'Error al enviar el documento firmado al servidor.');
      }

      onSuccess();
    } catch (err) {
      setGlobalError(err.message || 'Se produjo un error durante la firma. Inténtalo de nuevo.');
      setStatus('idle');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const buttonLabel =
    status === 'signing'
      ? 'Firmando documento…'
      : status === 'uploading'
      ? 'Enviando documento firmado…'
      : certInfo
      ? 'Firmar y enviar documento'
      : 'Verificar certificado';

  return (
    <div>
      <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Tu certificado digital no será enviado al servidor. La firma se realiza únicamente en tu
        navegador.
      </p>

      {/* Certificate picker */}
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label className="form-label">Certificado digital (.p12 / .pfx)</label>
        <CertificateFilePicker onFileSelected={handleFileSelected} selectedFile={certFile} />
        {certError && <p className="form-error">{certError}</p>}
      </div>

      {/* Password */}
      {certFile && (
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" htmlFor="cert-password">
            Contraseña del certificado
          </label>
          <PasswordInput
            id="cert-password"
            value={password}
            onChange={setPassword}
            hasError={!!passwordError}
          />
          {passwordError && <p className="form-error">{passwordError}</p>}
          <p className="form-hint">
            La contraseña nunca saldrá de tu dispositivo.
          </p>
        </div>
      )}

      {/* Certificate info preview */}
      {certInfo && (
        <div className="sign-summary">
          <p className="sign-summary__title">✅ Certificado verificado</p>
          <p className="sign-summary__detail">
            <strong>Titular:</strong> {certInfo.commonName || '—'}
          </p>
          {certInfo.organization && (
            <p className="sign-summary__detail">
              <strong>Organización:</strong> {certInfo.organization}
            </p>
          )}
          <p className="sign-summary__detail">
            <strong>Válido hasta:</strong> {certInfo.validTo.toLocaleDateString('es-ES')}
          </p>
          {nombre_firmante && certInfo.commonName && (
            !certInfo.commonName.toLowerCase().includes(nombre_firmante.split(' ')[0].toLowerCase()) && (
              <Alert
                type="warning"
                message="El nombre del certificado no coincide exactamente con el del firmante. Asegúrate de usar el certificado correcto."
              />
            )
          )}
        </div>
      )}

      {globalError && (
        <div style={{ marginTop: '1rem' }}>
          <Alert type="error" message={globalError} />
        </div>
      )}

      <div className="divider" />

      <button
        type="button"
        className={`btn btn--primary btn--lg btn--full${isLoading ? ' btn--loading' : ''}`}
        onClick={certInfo ? handleSign : handleValidateCert}
        disabled={isLoading || !certFile || !password}
      >
        {isLoading && <span className="btn__spinner" aria-hidden="true" />}
        {buttonLabel}
      </button>
    </div>
  );
}
