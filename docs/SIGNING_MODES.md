# Modos de firma electrónica en AutoFirma

## 1. Conceptos generales

### Firma simple (`sign`)

Una entidad firma unos datos. El resultado contiene los datos originales (o una referencia a ellos) junto con la firma criptográfica del firmante.

### Cofirma (`coSign` / `cosign`)

Dos o más entidades firman **de forma independiente los mismos datos originales**. Ninguna firma "engloba" a la otra; ambas tienen el mismo rango y valor legal. Es el equivalente a que dos personas firmen el mismo folio en posiciones distintas.

### Contrafirma (`counterSign`)

Una entidad firma **la firma de otra entidad**, no los datos originales. Crea una cadena jerárquica: la segunda firma certifica que la primera existía en ese momento. Es el equivalente a que un notario firme encima de tu firma.

---

## 2. Soporte por formato

| Operación     | **CAdES** (`.p7s`, `.csig`) | **PAdES** (PDF) | **XAdES** (XML) |
|---------------|-----------------------------|-----------------|-----------------|
| Firma simple  | ✅                           | ✅               | ✅               |
| Cofirma       | ✅ (`cosign`)                | ⚠️ ver §3       | ✅               |
| Contrafirma   | ✅ (`countersign`)           | ❌               | ✅               |

### Por qué PAdES no tiene cofirma/contrafirma formales

PAdES está definido sobre el estándar PDF, que solo permite añadir firmas como **revisiones incrementales** del documento. Cada nueva firma se añade al final del fichero sin tocar los bytes anteriores. No existe en la especificación un objeto PDF que represente una "cofirma" o una "contrafirma" en el sentido de CAdES/XAdES.

En la práctica, el resultado visual es muy similar: si tres personas firman el mismo PDF con AutoFirma, el documento tendrá tres revisiones, cada una con su propio `/ByteRange` y su objeto `/Sig`. Cualquier visor de firmas (Adobe Acrobat, Autofirma Verif, etc.) las mostrará como tres firmas independientes sobre el documento.

---

## 3. Qué usamos en Glovalsign

| Parámetro        | Valor                |
|------------------|----------------------|
| `SIGN_FORMAT`    | `PAdES`              |
| `SIGN_ALGORITHM` | `SHA256withRSA`      |
| Función API      | `AutoScript.sign()`  |
| Archivo          | `src/utils/autofirma.js` |

Se usa **firma simple PAdES con revisión incremental**. Cuando un PDF ya contiene una o más firmas y se vuelve a firmar:

1. El backend sirve el PDF **sin reescribir sus bytes** (actualización incremental en `streamPdfFromApi.js` — véase §4).
2. AutoFirma añade su firma como una nueva revisión al final del fichero.
3. El PDF resultante contiene ambas firmas, cada una con su propio `ByteRange` válido.
4. Okular, Adobe Acrobat y otros validadores muestran las dos firmas como independientes y verificables.

---

## 4. Problema anterior y corrección

### Síntoma

Al firmar un PDF ya firmado, la primera firma aparecía como "no verificable" en Okular.

### Causa

`streamPdfFromApi.js` usaba `pdf-lib` para incrustar el token de identidad en el campo `Subject` del PDF:

```js
// ANTES — reescribía el PDF completo
const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
doc.setSubject(`GLOVALSIGN_TOKEN:${token}`);
const markedBytes = await doc.save();  // ← reserialización completa
```

`pdf-lib.save()` reescribe todo el árbol de objetos del PDF, **cambiando las posiciones absolutas de los bytes**. Los `/ByteRange` de la firma original apuntaban a los offsets del archivo antiguo; al cambiar el archivo, esos rangos dejaban de cubrir los datos correctos y la firma era inverificable.

### Corrección

Cuando el PDF ya contiene firmas (`/ByteRange` detectado), se usa una **actualización incremental** (append-only):

```
[bytes originales, intactos]
[nuevo objeto Info con Subject]
[nueva sección xref]
[nuevo trailer con /Prev apuntando al xref anterior]
%%EOF
```

Ningún byte anterior cambia, por lo que todos los `/ByteRange` existentes siguen siendo válidos. Esta lógica está en `appendTokenIncrementalUpdate()` dentro de `src/utils/streamPdfFromApi.js`.

---

## 5. Referencias

- ETSI EN 319 102-1 — Procedures for Creation and Validation of AdES Digital Signatures
- ETSI EN 319 122-1 — CAdES baseline signatures
- ETSI EN 319 132-1 — XAdES baseline signatures
- ETSI EN 319 142-1 — PAdES baseline signatures
- ISO 32000-2 (PDF 2.0) — §12.8 Digital signatures
- [AUTOSCRIPT_API_REFERENCE.md](AUTOSCRIPT_API_REFERENCE.md) — métodos `sign`, `coSign`, `counterSign` de AutoScript
