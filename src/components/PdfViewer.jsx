import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Serve worker locally (public/vendor/pdf.worker.min.mjs)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs';

/**
 * Mobile-compatible PDF viewer using PDF.js canvas rendering.
 * Falls back gracefully if loading fails.
 *
 * @param {object}  props
 * @param {string}  props.url        URL of the PDF to render
 * @param {string}  [props.fallbackLabel]  Label for the "open in new tab" button
 */
export function PdfViewer({ url, fallbackLabel = 'Abrir en nueva pestaña' }) {
  const containerRef = useRef(null);
  // 'loading' → 'rendering' (first page done, container visible) → 'rendered' | 'error'
  const [status, setStatus] = useState('loading');
  const [pageCount, setPageCount] = useState(0);
  const taskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setStatus('loading');

      try {
        // Fetch PDF bytes so auth cookies are included automatically
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();

        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        taskRef.current = loadingTask;

        const pdf = await loadingTask.promise;
        if (cancelled) return;

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
          if (i === 1 && !cancelled) setStatus('rendering');
        }

        if (!cancelled) setStatus('rendered');
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

  return (
    <div>
      {status === 'loading' && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Cargando documento…
        </div>
      )}

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
