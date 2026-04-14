/**
 * Generic error / status page (no token, already signed, invalidated, etc.)
 */
export function ErrorPage({ icon = '❌', title, description, children }) {
  return (
    <div className="status-page">
      <span className="status-page__icon" aria-hidden="true">{icon}</span>
      <h1 className="status-page__title">{title}</h1>
      {description && <p className="status-page__description">{description}</p>}
      {children}
    </div>
  );
}
