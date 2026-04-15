/**
 * API client for communicating with the Glovalsign backend.
 * All calls include the token in the URL as defined by the backend routes.
 */

const BASE_URL = `${import.meta.env.PUBLIC_BACKEND_URL}/api/v1/sign`;

/**
 * Fetch the signing request data for a given token.
 * Uses the GET /public/documento/ver/:token endpoint to stream the PDF,
 * and a dedicated metadata endpoint for the signing info.
 * @param {string} token
 * @returns {Promise<{ok: boolean, data?: any, error?: string, status?: number}>}
 */
export async function getSolicitud(token) {
  const url = `${BASE_URL}/public/documento/solicitud/${token}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      let error = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        error = body?.message || error;
      } catch (_) { /* ignore */ }
      return { ok: false, error, status: res.status };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Get the URL for viewing the original PDF document.
 * The backend streams the PDF directly from this endpoint.
 * @param {string} token
 * @returns {string}
 */
export function getDocumentViewUrl(token) {
  return `${BASE_URL}/public/documento/ver/${token}`;
}

/**
 * Submit the signed PDF document back to the backend.
 * @param {string} token
 * @param {Uint8Array} signedPdfBytes  The signed PDF bytes
 * @returns {Promise<{ok: boolean, data?: any, error?: string, status?: number}>}
 */
export async function submitSignedDocument(token, signedPdfBytes) {
  const url = `${BASE_URL}/public/certificado-digital/firmar/${token}`;
  const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('documentoFirmado', blob, 'documento-firmado.pdf');

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let error = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        error = body?.message || error;
      } catch (_) { /* ignore */ }
      return { ok: false, error, status: res.status };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
