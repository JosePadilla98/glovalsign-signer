import { getDocumentViewUrl } from '../api/signing.js';

/**
 * Step 1 — PDF Viewer.
 * Embeds the document from the backend as an iframe / object element.
 *
 * @param {object} props
 * @param {string} props.token
 * @param {object} props.solicitud   Signing request metadata
 * @param {() => void} props.onContinue
 */
export function DocumentViewer({ token, solicitud, onContinue }) {
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
          <div className="pdf-viewer__toolbar">
            <span>Vista previa del documento</span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
            >
              Abrir en nueva pestaña
            </a>
          </div>
          <iframe
            className="pdf-viewer__iframe"
            src={pdfUrl}
            title="Documento a firmar"
            aria-label="Vista previa del documento PDF"
          />
        </div>
      </div>

      <div className="divider" />

      <button type="button" className="btn btn--primary btn--lg btn--full" onClick={onContinue}>
        He leído el documento · Continuar con la firma →
      </button>
    </div>
  );
}
