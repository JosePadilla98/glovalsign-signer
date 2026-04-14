import { useState, useRef } from 'react';

/**
 * Drag-and-drop / click file selector restricted to .p12 and .pfx files.
 *
 * @param {(file: File) => void} onFileSelected - Callback when a valid file is picked
 * @param {File|null} selectedFile              - Currently selected file (controlled)
 */
export function CertificateFilePicker({ onFileSelected, selectedFile }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleFiles(files) {
    const file = files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['p12', 'pfx'].includes(ext)) {
      alert('Por favor selecciona un archivo de certificado con extensión .p12 o .pfx');
      return;
    }
    onFileSelected(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleChange(e) {
    handleFiles(e.target.files);
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  }

  return (
    <div
      className={`file-drop${dragOver ? ' file-drop--dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Seleccionar certificado digital"
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".p12,.pfx"
        onChange={handleChange}
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: 'none' }}
      />
      <span className="file-drop__icon">🔐</span>
      <p className="file-drop__label">
        <strong>Haz clic o arrastra</strong> tu certificado digital aquí
        <br />
        <span>Formatos aceptados: .p12, .pfx</span>
      </p>
      {selectedFile && (
        <p className="file-drop__selected">
          <span>✅</span>
          {selectedFile.name}
        </p>
      )}
    </div>
  );
}
