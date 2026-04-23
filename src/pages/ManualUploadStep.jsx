import { useRef, useState } from 'react';
import { Alert } from '../components/Alert.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { submitSignedDocument, validatePdf, getDocumentViewUrl } from '../api/signing.js';

// ---------------------------------------------------------------------------
// ValidationChecklist — shows the result of each check after file selection
// ---------------------------------------------------------------------------

const CHECK_STYLES = {
  list: {
    listStyle: 'none',
    margin: '0 0 1.25rem',
    padding: '0.75rem 1rem',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  item: (state) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color:
      state === 'ok' ? '#15803d'
      : state === 'error' ? '#b91c1c'
      : state === 'skipped' ? '#64748b'
      : '#64748b',
  }),
  icon: (state) =>
    state === 'ok' ? '✅'
    : state === 'error' ? '❌'
    : state === 'skipped' ? '⚠️'
    : '⏳',
};

function CheckItem({ state, label, detail }) {
  return (
    <li style={CHECK_STYLES.item(state)}>
      <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>{CHECK_STYLES.icon(state)}</span>
      <span>
        <strong>{label}</strong>
        {detail && <span style={{ marginLeft: '0.35rem', opacity: 0.8 }}>— {detail}</span>}
      </span>
    </li>
  );
}

function ValidationChecklist({ validating, result }) {
  if (!validating && !result) return null;

  if (validating) {
    return (
      <ul style={CHECK_STYLES.list}>
        <CheckItem state="pending" label="Verificando documento…" />
      </ul>
    );
  }

  const { isPdf, identityOk, signatureOk, byteRangeOk } = result;

  return (
    <ul style={CHECK_STYLES.list}>
      {isPdf !== null && (
        <CheckItem
          state={isPdf ? 'ok' : 'error'}
          label="Formato PDF"
          detail={isPdf ? 'Archivo PDF válido' : 'El archivo no es un PDF válido'}
        />
      )}
      {isPdf !== false && (
        <>
          {identityOk !== null && (
            <CheckItem
              state={identityOk ? 'ok' : 'error'}
              label="Documento correcto"
              detail={
                identityOk
                  ? 'Corresponde al documento original'
                  : 'No corresponde al documento enviado para firmar'
              }
            />
          )}
          {signatureOk !== null && (
            <CheckItem
              state={signatureOk ? 'ok' : 'error'}
              label="Firma digital"
              detail={
                signatureOk
                  ? 'Contiene firma digital'
                  : 'No se detecta ninguna firma digital en el PDF'
              }
            />
          )}
          {byteRangeOk !== null && (
            <CheckItem
              state={byteRangeOk ? 'ok' : 'error'}
              label="Integridad de la firma"
              detail={
                byteRangeOk
                  ? 'La firma cubre el documento completo'
                  : 'La firma no cubre el documento completo — posible adulteración'
              }
            />
          )}
        </>
      )}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// ManualUploadStep
// ---------------------------------------------------------------------------

/**
 * Step 2 (alternative) — Manual PDF upload.
 *
 * The user drops or selects a pre-signed PDF. The file is validated by the
 * backend (single source of truth for all 4 checks) before submission.
 *
 * @param {object} props
 * @param {string} props.token
 * @param {(bytes: Uint8Array) => void} props.onSuccess
 */
export function ManualUploadStep({ token, fileName, onSuccess }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  // 'idle' | 'validating' | 'uploading' | 'error'
  const [status, setStatus] = useState('idle');
  const [validation, setValidation] = useState(null);
  const [uploadError, setUploadError] = useState('');
  // Keep a reference to the file's bytes to avoid re-reading on submit
  const fileBytesRef = useRef(null);
  const inputRef = useRef(null);

  async function acceptFile(f) {
    if (!f) return;

    // Quick extension/MIME check before reading
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setFile(f);
      setValidation({ isPdf: false, identityOk: false, signatureOk: false, byteRangeOk: false });
      fileBytesRef.current = null;
      return;
    }

    setFile(f);
    setValidation(null);
    setUploadError('');
    setStatus('validating');
    fileBytesRef.current = null;

    try {
      const buffer = await f.arrayBuffer();
      const uploadedBytes = new Uint8Array(buffer);
      fileBytesRef.current = uploadedBytes;

      const apiResult = await validatePdf(token, uploadedBytes);
      if (apiResult.ok) {
        setValidation(apiResult.data);
      } else {
        // Network or server error — treat as full validation failure so submission is blocked
        setValidation({ isPdf: false, identityOk: false, signatureOk: false, byteRangeOk: false });
        setUploadError(apiResult.error || 'Error al validar el documento. Inténtalo de nuevo.');
      }
    } catch (_err) {
      setValidation({ isPdf: false, identityOk: false, signatureOk: false, byteRangeOk: false });
      setUploadError('Error inesperado al validar el documento.');
    } finally {
      setStatus('idle');
    }
  }

  function onInputChange(e) {
    acceptFile(e.target.files?.[0] ?? null);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setUploadError('');
    setStatus('uploading');

    try {
      // Re-use bytes already read during validation; fall back to re-reading if needed
      let signedBytes = fileBytesRef.current;
      if (!signedBytes) {
        const buffer = await file.arrayBuffer();
        signedBytes = new Uint8Array(buffer);
      }

      const result = await submitSignedDocument(token, signedBytes, 'manual_upload');
      if (!result.ok) {
        throw new Error(result.error || 'Error al enviar el documento firmado al servidor.');
      }
      onSuccess(signedBytes);
    } catch (err) {
      setUploadError(err.message);
      setStatus('error');
    }
  }

  const isValidating = status === 'validating';
  const isUploading = status === 'uploading';
  const isBusy = isValidating || isUploading;

  // Submit is allowed when no enabled check has failed (=== false).
  // null = check disabled = no blocker.
  const validationPassed =
    validation !== null &&
    validation.isPdf !== false &&
    validation.identityOk !== false &&
    validation.signatureOk !== false &&
    validation.byteRangeOk !== false;
  const canSubmit = !!file && validationPassed && !isBusy;

  // Drop zone border colour reflects current state
  const dropBorderColor =
    dragging ? 'var(--color-primary, #2563eb)'
    : !file ? '#cbd5e1'
    : validation === null || isValidating ? '#94a3b8'
    : validationPassed ? '#16a34a'
    : '#dc2626';

  const dropBg =
    dragging ? 'rgba(37,99,235,0.05)'
    : validationPassed ? 'rgba(22,163,74,0.04)'
    : 'transparent';

  return (
    <div>
      <p style={{ marginBottom: '1.25rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Firma el documento con tu herramienta habitual, luego arrástralo aquí o selecciónalo
        desde tu dispositivo y pulsa <strong>Enviar</strong>.
      </p>

      {/* Download original document */}
      <a
        href={getDocumentViewUrl(token)}
        download={fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--color-primary, #2563eb)',
          textDecoration: 'none',
          border: '1px solid currentColor',
          borderRadius: '6px',
          padding: '0.4rem 0.85rem',
        }}
      >
        ⬇️ Descargar documento original
      </a>

      {/* Drop zone */}
      <div
        onClick={() => !isBusy && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dropBorderColor}`,
          borderRadius: '8px',
          padding: '2rem 1rem',
          textAlign: 'center',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          background: dropBg,
          transition: 'border-color 0.15s, background 0.15s',
          marginBottom: '1rem',
          userSelect: 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={onInputChange}
          disabled={isBusy}
        />
        {file ? (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📄</div>
            <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{file.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              {(file.size / 1024).toFixed(0)} KB
              {!isBusy && ' · Haz clic para cambiar'}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⬆️</div>
            <div style={{ fontWeight: 500 }}>Arrastra el PDF firmado aquí</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              o haz clic para seleccionar un archivo
            </div>
          </div>
        )}
      </div>

      {/* Validation checklist */}
      <ValidationChecklist validating={isValidating} result={validation} />

      {/* Upload spinner */}
      {isUploading && (
        <div style={{ marginBottom: '1rem' }}>
          <Spinner label="Enviando documento firmado…" />
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert type="error" message={uploadError} />
        </div>
      )}

      <button
        type="button"
        className="btn btn--primary btn--lg btn--full"
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {isUploading ? 'Enviando…' : 'Enviar documento firmado'}
      </button>
    </div>
  );
}
