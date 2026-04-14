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
 * Supports path segments and query params.
 * @returns {string|null}
 */
export function getTokenFromUrl() {
  // Try path: /firmar/{token} or /{token}
  const pathParts = window.location.pathname.replace(/^\//, '').split('/');
  for (const part of pathParts) {
    if (part && part.length >= 32) {
      return part;
    }
  }

  // Try query string: ?token={token}
  const params = new URLSearchParams(window.location.search);
  const tokenParam = params.get('token');
  if (tokenParam && tokenParam.length >= 32) {
    return tokenParam;
  }

  // Try hash: #/firmar/{token}
  const hash = window.location.hash.replace(/^#\/?/, '');
  const hashParts = hash.split('/');
  for (const part of hashParts) {
    if (part && part.length >= 32) {
      return part;
    }
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
