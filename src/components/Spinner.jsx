/**
 * Full-page loading spinner.
 */
export function Spinner({ label = 'Cargando...' }) {
  return (
    <div className="spinner-fullpage">
      <div className="spinner" role="status" aria-label={label} />
      <p>{label}</p>
    </div>
  );
}
