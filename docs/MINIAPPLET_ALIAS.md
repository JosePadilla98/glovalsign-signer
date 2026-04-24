# Por qué existe `window.MiniApplet` en autoscript.js

## Historia

La firma digital en navegadores web pasó por tres generaciones:

### 1ª generación — Java Applet (hasta ~2017)

El Ministerio de Hacienda publicó el **MiniApplet** de firma: un applet Java que se ejecutaba dentro del navegador mediante el plugin Java (NPAPI). Toda integración usaba `window.MiniApplet` para llamar a las operaciones de firma.

```html
<!-- Integración clásica con MiniApplet -->
<script src="miniapplet.js"></script>
<script>
  MiniApplet.sign(dataB64, 'SHA256withRSA', 'PAdES', '', onSuccess, onError);
</script>
```

### 2ª generación — Desaparición del plugin Java

A partir de 2015-2017, los principales navegadores (Chrome, Firefox, Edge) **eliminaron el soporte para plugins NPAPI** (y con él el plugin Java). El MiniApplet dejó de funcionar.

El Ministerio desarrolló entonces **AutoFirma**: una aplicación nativa de escritorio que expone un WebSocket local para que el navegador pueda comunicarse con ella sin necesidad de plugin. La librería JavaScript que hace de puente se renombró a `AutoScript`.

### 3ª generación — autoscript.js actual

`autoscript.js` expone `window.AutoScript` como objeto principal. Para no romper **todas las integraciones existentes** que ya usaban `window.MiniApplet`, el propio script añade al final:

```js
// Fragmento de autoscript.js (al final del fichero)
/**
 * Mantenemos una copia del objeto de despliegue usando el nombre de variable anterior
 * por compatibilidad con los despliegues actuales.
 */
var MiniApplet = AutoScript;
```

Es simplemente **una asignación de referencia**: `MiniApplet` y `AutoScript` apuntan exactamente al mismo objeto. No hay diferencia funcional alguna entre usar uno u otro.

---

## Implicación práctica

| Variable | Estado | Usar en código nuevo |
|---|---|---|
| `window.AutoScript` | Nombre oficial actual | ✅ Sí |
| `window.MiniApplet` | Alias por compatibilidad | ❌ No — es nombre obsoleto |

En este proyecto usamos siempre `window.AutoScript` (a través de la capa `src/utils/autofirma.js`), nunca el alias.
