const SIGN_ALGORITHM = 'SHA256withRSA';
const SIGN_FORMAT = 'PAdES';

// Firma trifásica: el servidor realiza las fases PRE y POST; al dispositivo solo viaja
// el hash del documento (mucho más rápido con PDFs grandes). Se activa con
// PUBLIC_TRIPHASE_SIGNING=true. Requiere el WAR afirma-server-triphase-signer en Tomcat.
const _triphaseEnabled = import.meta.env.PUBLIC_TRIPHASE_SIGNING === 'true';
const _servletBase = import.meta.env.PUBLIC_SERVLET_BASE_URL;
const SIGN_PARAMS = _triphaseEnabled && _servletBase
  ? `format=PAdES\nserverUrl=${_servletBase}/afirma-server-triphase-signer/SignatureService`
  : 'format=PAdES';

console.info(
  `[AutoFirma] Modo de firma: ${_triphaseEnabled && _servletBase ? 'TRIFÁSICO' : 'SIMPLE'}`,
  _triphaseEnabled && _servletBase
    ? `| serverUrl: ${_servletBase}/afirma-server-triphase-signer/SignatureService`
    : _triphaseEnabled
      ? '| (trifásico desactivado: PUBLIC_SERVLET_BASE_URL vacío)'
      : '',
);

/**
 * Returns a human-readable description of the current signing mode (simple vs. triphase).
 * Useful for the dev signing log overlay.
 * @returns {{ mode: 'TRIFÁSICO' | 'SIMPLE', detail: string }}
 */
export function getSignModeInfo() {
  if (_triphaseEnabled && _servletBase) {
    return {
      mode: 'TRIFÁSICO',
      detail: `serverUrl: ${_servletBase}/afirma-server-triphase-signer/SignatureService`,
    };
  }
  if (_triphaseEnabled && !_servletBase) {
    return { mode: 'SIMPLE', detail: '(trifásico desactivado: PUBLIC_SERVLET_BASE_URL vacío)' };
  }
  return { mode: 'SIMPLE', detail: 'WebSocket local' };
}



/**
 * Returns true if autoscript.js has been loaded and AutoScript is available on window.
 * @returns {boolean}
 */
export function isAutoScriptLoaded() {
  return typeof window.AutoScript !== 'undefined';
}

/**
 * Initialises the AutoFirma native client.
 *
 * On desktop: uses a local WebSocket connection — no servletBaseUrl needed.
 * On mobile:  uses the intermediate-server mode. Pass the base URL of the
 *             server where the two AutoFirma servlets are deployed, e.g.
 *             "https://mi-servidor.com". AutoScript will automatically resolve:
 *               - /afirma-signature-storage/StorageService
 *               - /afirma-signature-retriever/RetrieveService
 *
 * @param {string|undefined} servletBaseUrl - Origin of the servlet server (mobile mode only).
 */
export function initAutoFirma(servletBaseUrl) {
  if (!isAutoScriptLoaded()) {
    throw new Error('AutoScript no está cargado. Comprueba que /vendor/autoscript.js está disponible.');
  }

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isMobile && !servletBaseUrl) {
    throw new Error(
      'Modo móvil: configura PUBLIC_SERVLET_BASE_URL con la URL del servidor de servlets.',
    );
  }

  window.AutoScript.cargarAppAfirma(servletBaseUrl ?? undefined);
}

/**
 * Signs a PDF (supplied as a Base64 string) using AutoFirma PAdES/SHA256withRSA.
 *
 * @param {string} base64Pdf - The PDF content encoded in Base64.
 * @returns {Promise<string>} A Promise that resolves with the signed PDF in Base64.
 */
export function signPdfWithAutoFirma(base64Pdf) {
  return new Promise((resolve, reject) => {
    if (!isAutoScriptLoaded()) {
      reject(new Error('AutoScript no está cargado.'));
      return;
    }

    window.AutoScript.sign(
      base64Pdf,
      SIGN_ALGORITHM,
      SIGN_FORMAT,
      SIGN_PARAMS,
      (signatureB64) => {
        resolve(signatureB64);
      },
      (errorType, errorMessage) => {
        reject(buildSignError(errorType, errorMessage));
      },
    );
  });
}

/**
 * Converts an ArrayBuffer to a Base64-encoded string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Converts a Base64-encoded string to a Uint8Array.
 * @param {string} base64
 * @returns {Uint8Array}
 */
export function base64ToUint8Array(base64) {
  const byteString = atob(base64);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  return byteArray;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildSignError(errorType, errorMessage) {
  const knownTypes = {
    'es.gob.afirma.standalone.afirma5.ws.client.socket.AutoFirmaConnectionException':
      'No se pudo conectar con AutoFirma. ¿Está instalado y en ejecución?',
    java_cancel: 'El usuario canceló la operación de firma.',
    cancel: 'El usuario canceló la operación de firma.',
    timeout: 'Tiempo de espera agotado. AutoFirma no respondió.',
  };

  const friendly = knownTypes[errorType] ?? `Error inesperado: ${errorMessage ?? errorType}`;
  const err = new Error(friendly);
  err.name = errorType ?? 'AutoFirmaError';
  return err;
}

/**
 * Returns true when the error indicates AutoFirma is not installed or not reachable.
 * Use this to decide whether to show the install instructions modal.
 * @param {Error} err
 * @returns {boolean}
 */
export function isNotInstalledError(err) {
  if (!err) return false;
  const connectionType = 'es.gob.afirma.standalone.afirma5.ws.client.socket.AutoFirmaConnectionException';
  return err.name === connectionType || err.name === 'timeout';
}
