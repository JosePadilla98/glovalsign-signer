/**
 * Minimal hash-based SPA router.
 * Reads the signing token from the URL path or query string.
 *
 * Expected URL formats from the backend email link:
 *   https://app.example.com/firmar/{token}
 *   https://app.example.com/?token={token}
 */

/**
 * Extract the signing token from the current URL.
 * Supports path segments (/firmar/{token}), query params (?token=) and hash (#/{token}).
 * Validation is delegated entirely to the backend.
 * @returns {string|null}
 */
export function getTokenFromUrl() {
  // Query string takes priority: ?token={token}
  const params = new URLSearchParams(window.location.search);
  const tokenParam = params.get('token');
  if (tokenParam) return tokenParam;

  // Path segments: /firmar/{token} — skip known static segments
  const STATIC_SEGMENTS = new Set(['firmar', 'certificado-digital', '']);
  const pathParts = window.location.pathname.replace(/^\//, '').split('/');
  for (const part of pathParts) {
    if (!STATIC_SEGMENTS.has(part)) return part;
  }

  // Hash: #/firmar/{token} or #/{token}
  const hash = window.location.hash.replace(/^#\/?/, '');
  const hashParts = hash.split('/');
  for (const part of hashParts) {
    if (part && !STATIC_SEGMENTS.has(part)) return part;
  }

  return null;
}

/**
 * Returns all query parameters from the current URL as an object.
 * @returns {Record<string, string>}
 */
export function getQueryParams() {
  const result = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    result[k] = v;
  });
  return result;
}
