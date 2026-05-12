import { useState } from 'react';
import { Alert } from '../components/Alert.jsx';
import { submitCustodiedCertSigning } from '../api/signing.js';

/**
 * Signing step for server-side custodied certificate flow.
 *
 * The user enters their certificate PIN; the backend downloads the original PDF,
 * signs it with the stored .p12 and registers the evidence.
 *
 * @param {object}   props
 * @param {string}   props.token       Signing token
 * @param {()=>void} props.onSuccess   Called when the backend confirms the signature
 */
export function CustodiedCertSigningStep({ token, onSuccess }) {
  const [pin, setPin] = useState('');
  // 'idle' | 'submitting' | 'error'
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const isBusy = status === 'submitting';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin.trim()) return;

    setError('');
    setStatus('submitting');

    const result = await submitCustodiedCertSigning(token, pin.trim());

    if (!result.ok) {
      const msg =
        result.status === 422
          ? 'PIN incorrecto. Comprueba tu PIN e inténtalo de nuevo.'
          : result.status === 404
          ? 'No se encontró el certificado digital para tu usuario. Contacta con el administrador.'
          : result.error || 'Error al procesar la firma. Inténtalo de nuevo.';
      setError(msg);
      setStatus('error');
      return;
    }

    onSuccess(null, 'custodiado');
  }

  return (
    <div>
      <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        El servidor firmará el documento usando tu certificado digital custodiado.
        Introduce el PIN de tu certificado para autorizar la firma.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="cert-pin"
            style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}
          >
            PIN del certificado
          </label>
          <input
            id="cert-pin"
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            disabled={isBusy}
            placeholder="Introduce tu PIN"
            style={{
              width: '100%',
              padding: '0.65rem 0.875rem',
              fontSize: '1rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: '1.25rem' }}>
            <Alert type="error" message={error} />
          </div>
        )}

        <div className="divider" />

        <button
          type="submit"
          className={`btn btn--primary btn--lg btn--full${isBusy ? ' btn--loading' : ''}`}
          disabled={isBusy || !pin.trim()}
        >
          {isBusy && <span className="btn__spinner" aria-hidden="true" />}
          {isBusy ? 'Firmando…' : 'Firmar documento'}
        </button>
      </form>
    </div>
  );
}
