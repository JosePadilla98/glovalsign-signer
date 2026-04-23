import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Spinner } from './Spinner.jsx';

// Serve worker locally (public/vendor/pdf.worker.min.mjs)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs';

/**
 * Mobile-compatible PDF viewer using PDF.js canvas rendering.
 * Falls back gracefully if loading fails.
 *
 * @param {object}  props
 * @param {string}   props.url                  URL of the PDF to render
 * @param {string}   [props.fallbackLabel]        Label for the "open in new tab" button
 * @param {Function} [props.onReady]              Called when the first page is painted
 * @param {Function} [props.onScrolledToBottom]   Called when user reaches the last page
 * @param {Function} [props.onBytesReady]         Called with the raw ArrayBuffer once downloaded — lets the caller reuse the bytes (e.g. for signing) without a second network request
 */
export function PdfViewer({ url, fallbackLabel = 'Abrir en nueva pestaña', onReady, onScrolledToBottom, onBytesReady }) {
  const containerRef = useRef(null);
  // 'loading' → 'rendering' (first page done, container visible) → 'rendered' | 'error'
  const [status, setStatus] = useState('loading');
  const [pageCount, setPageCount] = useState(0);
  const taskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setStatus('loading');
      const IS_DEV = import.meta.env.DEV;
      const t0 = performance.now();
      const devLog = (msg) => IS_DEV && console.debug(`[PdfViewer +${((performance.now()-t0)/1000).toFixed(2)}s] ${msg}`);

      try {
        // Fetch PDF bytes so auth cookies are included automatically
        devLog('fetch() inicio…');
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        devLog(`fetch() fin — ${(buffer.byteLength/1024).toFixed(0)} KB`);

        if (cancelled) return;

        // Expose raw bytes to parent so they can be reused (e.g. for AutoFirma signing)
        // without triggering a second download.
        onBytesReady?.(buffer);

        devLog('pdfjs.getDocument() inicio…');
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        taskRef.current = loadingTask;

        const pdf = await loadingTask.promise;
        if (cancelled) return;
        devLog(`pdfjs listo — ${pdf.numPages} páginas`);

        setPageCount(pdf.numPages);

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.display = 'block';
          canvas.style.marginBottom = i < pdf.numPages ? '4px' : '0';

          container.appendChild(canvas);

          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Show the container as soon as the first page is painted
          if (i === 1 && !cancelled) {
            devLog('página 1 pintada → onReady');
            setStatus('rendering');
            onReady?.();
          }
        }

        if (!cancelled) {
          devLog('todas las páginas renderizadas → onScrolledToBottom disponible');
          setStatus('rendered');
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[PdfViewer] Error rendering PDF:', err);
          setStatus('error');
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      taskRef.current?.destroy?.();
    };
  }, [url]);

  // Detect scroll-to-bottom; only active once ALL pages are fully rendered.
  // Also fires immediately if the content fits on screen without scrolling.
  useEffect(() => {
    if (status !== 'rendered') return;
    const container = containerRef.current;
    if (!container) return;

    function checkBottom() {
      if (container.scrollHeight - container.scrollTop - container.clientHeight < 30) {
        onScrolledToBottom?.();
      }
    }

    container.addEventListener('scroll', checkBottom, { passive: true });
    // Unlock immediately if no scrollbar is needed
    checkBottom();

    return () => container.removeEventListener('scroll', checkBottom);
  }, [status, onScrolledToBottom]);

  return (
    <div>
      {status === 'loading' && <Spinner label="Cargando documento…" />}

      {status === 'error' && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No se puede previsualizar el documento en este dispositivo.
        </div>
      )}

      {/* Canvas container — visible as soon as the first page is painted */}
      <div
        ref={containerRef}
        style={{
          display: status === 'rendered' || status === 'rendering' ? 'block' : 'none',
          overflowY: 'auto',
          maxHeight: '60vh',
          background: '#f5f5f5',
          borderRadius: '4px',
        }}
      />

      <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--secondary"
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
        >
          {fallbackLabel}
        </a>
      </div>
    </div>
  );
}
