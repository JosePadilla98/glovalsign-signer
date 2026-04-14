import { useState, useEffect } from 'react';
import { Header } from './components/Header.jsx';
import { Footer } from './components/Footer.jsx';
import { SigningFlow } from './pages/SigningFlow.jsx';
import { ErrorPage } from './pages/ErrorPage.jsx';
import { getTokenFromUrl } from './utils/router.js';

/**
 * Root application component.
 * Reads the signing token from the URL and renders the appropriate page.
 */
export function App() {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getTokenFromUrl();
    setToken(t);
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        {token ? (
          <SigningFlow token={token} />
        ) : (
          <ErrorPage
            icon="🔗"
            title="Enlace no válido"
            description="Este enlace de firma no es válido o ha caducado. Por favor, solicita un nuevo enlace al remitente del documento."
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
