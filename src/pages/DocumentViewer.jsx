import { useState } from 'react';
import { getDocumentViewUrl } from '../api/signing.js';
import { PdfViewer } from '../components/PdfViewer.jsx';

/**
 * Step 1 — PDF Viewer.
 * Embeds the document from the backend as an iframe / object element.
 *
 * @param {object} props
 * @param {string} props.token
 * @param {object} props.solicitud   Signing request metadata
 * @param {() => void} props.onContinue
 * @param {(buffer: ArrayBuffer) => void} [props.onPdfBytesReady]  Forwarded to PdfViewer so the parent can reuse the downloaded bytes
 */
export function DocumentViewer({ token, solicitud, onContinue, onPdfBytesReady }) {
  const [pdfReady, setPdfReady] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const pdfUrl = getDocumentViewUrl(token);
  const { nombre_firmante, tipo_documento, numero_expediente } = solicitud?.datos_documento ?? {};

  return (
    <div>
      {/* Signer info summary */}
      <div className="signer-info">
        {nombre_firmante && (
          <div className="signer-info__item">
            <span className="signer-info__label">Firmante</span>
            <span className="signer-info__value">{nombre_firmante}</span>
          </div>
        )}
        {numero_expediente && (
          <div className="signer-info__item">
            <span className="signer-info__label">Expediente</span>
            <span className="signer-info__value">{numero_expediente}</span>
          </div>
        )}
        {tipo_documento && (
          <div className="signer-info__item">
            <span className="signer-info__label">Tipo de documento</span>
            <span className="signer-info__value" style={{ textTransform: 'capitalize' }}>
              {tipo_documento}
            </span>
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      <div className="section">
        <h2 className="section__title">Documento a firmar</h2>
        <div className="pdf-viewer">
          <PdfViewer
            url={pdfUrl}
            onReady={() => setPdfReady(true)}
            onScrolledToBottom={() => setHasScrolled(true)}
            onBytesReady={onPdfBytesReady}
          />
        </div>
      </div>

      <div className="divider" />

      <button
        type="button"
        className="btn btn--primary btn--lg btn--full"
        onClick={onContinue}
        disabled={!hasScrolled}
        style={{ whiteSpace: 'normal', lineHeight: '1.4' }}
      >
        {!pdfReady
          ? 'Cargando documento…'
          : !hasScrolled
          ? '↓ Desplázate hasta el final para continuar'
          : 'He leído el documento · Continuar con la firma →'}
      </button>
    </div>
  );
}
