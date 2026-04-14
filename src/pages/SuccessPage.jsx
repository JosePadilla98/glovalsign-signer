/**
 * Success confirmation page shown after the document is signed and submitted.
 */
export function SuccessPage({ signerName, documentType }) {
  return (
    <div className="status-page">
      <span className="status-page__icon" aria-hidden="true">✅</span>
      <h1 className="status-page__title">Documento firmado correctamente</h1>
      <p className="status-page__description">
        {signerName ? `${signerName}, el` : 'El'} documento{documentType ? ` (${documentType})` : ''} ha sido firmado
        y enviado a Glovalsign correctamente.
      </p>
      <p className="status-page__description" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
        Puedes cerrar esta ventana.
      </p>
    </div>
  );
}
