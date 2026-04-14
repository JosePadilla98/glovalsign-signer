import { useState } from 'react';

/**
 * Password input with visibility toggle.
 *
 * @param {string} value
 * @param {(v: string) => void} onChange
 * @param {string} [id]
 * @param {boolean} [hasError]
 * @param {string} [autoComplete]
 */
export function PasswordInput({ value, onChange, id = 'password', hasError, autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-wrapper">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`form-input${hasError ? ' form-input--error' : ''}`}
        autoComplete={autoComplete}
        spellCheck={false}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
