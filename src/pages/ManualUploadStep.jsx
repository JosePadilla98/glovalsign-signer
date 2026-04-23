import { useRef, useState } from 'react';
import { Alert } from '../components/Alert.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { submitSignedDocument } from '../api/signing.js';

/**
 * Step 2 (alternative) — Manual PDF upload.
 *
 * The user drops or selects a pre-signed PDF, then submits it to the backend.
 *
 * @param {object} props
 * @param {string} props.token
 * @param {(bytes: Uint8Array) => void} props.onSuccess
 */
export function ManualUploadStep({ token, onSuccess }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  // 'idle' | 'uploading' | 'error'
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function acceptFile(f) {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('El archivo debe ser un PDF.');
      return;
    }
    setError('');
    setFile(f);
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
    if (!file) return;
    setError('');
    setStatus('uploading');

    try {
      const buffer = await file.arrayBuffer();
      const signedBytes = new Uint8Array(buffer);
      const result = await submitSignedDocument(token, signedBytes);
      if (!result.ok) {
        throw new Error(result.error || 'Error al enviar el documento firmado al servidor.');
      }
      onSuccess(signedBytes);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const isBusy = status === 'uploading';

  return (
    <div>
      <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Si ya tienes el PDF firmado digitalmente, arrástralo aquí o selecciónalo desde tu
        dispositivo y pulsa <strong>Enviar</strong>.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => !isBusy && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-primary, #2563eb)' : file ? 'var(--color-success, #16a34a)' : '#cbd5e1'}`,
          borderRadius: '8px',
          padding: '2rem 1rem',
          textAlign: 'center',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          background: dragging ? 'rgba(37,99,235,0.05)' : file ? 'rgba(22,163,74,0.04)' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s',
          marginBottom: '1.25rem',
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
              {(file.size / 1024).toFixed(0)} KB · Haz clic para cambiar
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

      {error && <Alert type="error" message={error} />}

      {isBusy && (
        <div style={{ marginBottom: '1rem' }}>
          <Spinner label="Enviando documento firmado…" />
        </div>
      )}

      <button
        type="button"
        className="btn btn--primary btn--lg btn--full"
        onClick={handleSubmit}
        disabled={!file || isBusy}
      >
        {isBusy ? 'Enviando…' : 'Enviar documento firmado'}
      </button>
    </div>
  );
}
