import { useEffect, useRef } from 'react';

/**
 * Success confirmation page shown after the document is signed and submitted.
 */
export function SuccessPage({ signerName, documentType, signedPdfBytes }) {
  const downloadUrlRef = useRef(null);

  useEffect(() => {
    if (signedPdfBytes) {
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      downloadUrlRef.current = URL.createObjectURL(blob);
    }
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    };
  }, [signedPdfBytes]);

  const fileName = documentType
    ? `documento-firmado-${documentType.replace(/\s+/g, '-').toLowerCase()}.pdf`
    : 'documento-firmado.pdf';

  return (
    <div className="status-page">
      <span className="status-page__icon" aria-hidden="true">✅</span>
      <h1 className="status-page__title">Documento firmado correctamente</h1>
      <p className="status-page__description">
        {signerName ? `${signerName}, el` : 'El'} documento{documentType ? ` (${documentType})` : ''} ha sido firmado
        y enviado a Glovalsign correctamente.
      </p>
      {signedPdfBytes && downloadUrlRef.current && (
        <a
          href={downloadUrlRef.current}
          download={fileName}
          className="btn btn--secondary btn--lg"
          style={{ marginTop: '1.5rem', display: 'inline-block' }}
        >
          Descargar PDF firmado
        </a>
      )}
      <p className="status-page__description" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
        Puedes cerrar esta ventana.
      </p>
    </div>
  );
}
