/**
 * Inline alert / notification banner.
 *
 * @param {'error'|'success'|'warning'|'info'} type
 * @param {string} message
 */
export function Alert({ type = 'info', message, children }) {
  const icons = {
    error: '⚠️',
    success: '✅',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className={`alert alert--${type}`} role="alert">
      <span className="alert__icon">{icons[type]}</span>
      <div>{message || children}</div>
    </div>
  );
}
