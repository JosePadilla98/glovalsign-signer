/**
 * AutofirmaInstallModal
 *
 * Shown when AutoFirma is not installed or unreachable.
 * Detects the user's OS and shows the appropriate download link + install steps.
 *
 * Props:
 *   onClose   () => void   — closes without retrying
 *   onRetry   () => void   — closes and triggers a new sign attempt
 */

const DOWNLOAD_PAGE = 'https://firmaelectronica.gob.es/ciudadanos/descargas';

const PLATFORMS = {
  windows: {
    label: 'Windows',
    icon: '🪟',
    downloadUrl: DOWNLOAD_PAGE,
    steps: [
      'Descarga el instalador (.zip) y descomprímelo.',
      'Ejecuta AutoFirma_Setup.exe con permisos de administrador.',
      'Sigue el asistente de instalación.',
      'Cuando termine, vuelve a esta página e intenta firmar de nuevo.',
    ],
  },
  mac: {
    label: 'macOS',
    icon: '🍎',
    downloadUrl: DOWNLOAD_PAGE,
    steps: [
      'Descarga el paquete (.zip) y descomprímelo.',
      'Abre AutoFirma.pkg y sigue el instalador.',
      'Si macOS bloquea la apertura: Preferencias del Sistema → Seguridad → "Abrir de todas formas".',
      'Cuando termine, vuelve a esta página e intenta firmar de nuevo.',
    ],
  },
  linux: {
    label: 'Linux',
    icon: '🐧',
    downloadUrl: DOWNLOAD_PAGE,
    steps: [
      'Descarga el paquete (.zip) y descomprímelo.',
      'Instala el .deb con: sudo dpkg -i AutoFirma*.deb',
      'O usa el instalador .rpm si tu distribución lo requiere.',
      'Cuando termine, vuelve a esta página e intenta firmar de nuevo.',
    ],
  },
  android: {
    label: 'Android',
    icon: '🤖',
    downloadUrl: 'https://play.google.com/store/apps/details?id=es.gob.afirma&hl=es',
    steps: [
      'Instala la app AutoFirma desde Google Play.',
      'Abre la app al menos una vez para completar la configuración inicial.',
      'Vuelve a esta página e intenta firmar de nuevo.',
    ],
  },
  ios: {
    label: 'iOS',
    icon: '📱',
    downloadUrl: 'https://apps.apple.com/es/app/autofirma-app/id627410001',
    steps: [
      'Instala la app AutoFirma desde la App Store.',
      'Abre la app al menos una vez para completar la configuración inicial.',
      'Vuelve a esta página e intenta firmar de nuevo.',
    ],
  },
};

function detectPlatform() {
  const ua = navigator.userAgent;
  const platform = navigator.platform ?? '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'mac';
  if (/Linux/i.test(platform)) return 'linux';
  return null;
}

export function AutofirmaInstallModal({ onClose, onRetry }) {
  const platformKey = detectPlatform();
  const platform = platformKey ? PLATFORMS[platformKey] : null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal">
        <button
          className="modal__close"
          onClick={onClose}
          aria-label="Cerrar"
          type="button"
        >
          ✕
        </button>

        <div className="modal__header">
          <span className="modal__icon">🔏</span>
          <h2 className="modal__title" id="modal-title">AutoFirma no encontrado</h2>
          <p className="modal__subtitle">
            Para firmar el documento necesitas tener instalada la aplicación <strong>AutoFirma</strong>{' '}
            del Ministerio de Hacienda.
          </p>
        </div>

        <div className="modal__body">
          {platform ? (
            <>
              <p className="modal__platform-label">
                {platform.icon} Instrucciones para <strong>{platform.label}</strong>:
              </p>
              <ol className="modal__steps">
                {platform.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <a
                href={platform.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--primary btn--lg btn--full"
                style={{ marginTop: '1.25rem', textDecoration: 'none' }}
              >
                Descargar AutoFirma para {platform.label}
              </a>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No se pudo detectar tu sistema operativo automáticamente.
                Accede a la página oficial de descargas:
              </p>
              <a
                href={DOWNLOAD_PAGE}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--primary btn--lg btn--full"
                style={{ textDecoration: 'none' }}
              >
                Página de descargas de AutoFirma
              </a>
            </>
          )}
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Ya lo tengo instalado — Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
