# AutoScript.js — Referencia completa de la API

> Versión documentada: **1.9.0** (`AutoScript.VERSION`)  
> Fuente: `public/vendor/autoscript.js`

---

## Índice

1. [Objeto global `AutoScript`](#1-objeto-global-autoscript)
2. [Inicialización](#2-inicialización)
3. [API de firma](#3-api-de-firma)
4. [Gestión de ficheros](#4-gestión-de-ficheros)
5. [Configuración](#5-configuración)
6. [Errores — catálogo completo](#6-errores--catálogo-completo)
7. [Sistema de diálogos interno (`SupportDialog`)](#7-sistema-de-diálogos-interno-supportdialog)
8. [Firma de lotes (batch)](#8-firma-de-lotes-batch)
9. [Utilidades](#9-utilidades)
10. [Constantes expuestas](#10-constantes-expuestas)
11. [Métodos deprecados](#11-métodos-deprecados)
12. [Qué usamos y qué no](#12-qué-usamos-y-qué-no)

---

## 1. Objeto global `AutoScript`

Al cargar `autoscript.js`, se crea `window.AutoScript` (IIFE). Existe también `window.MiniApplet` como alias por compatibilidad con despliegues antiguos.

```js
window.AutoScript  // objeto principal
window.MiniApplet  // alias, mismo objeto
window.SupportDialog  // objeto separado para controlar los diálogos internos
```

---

## 2. Inicialización

### `AutoScript.cargarAppAfirma(clientAddress, keystore?)`

**El primer método que debe llamarse antes de cualquier firma.**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `clientAddress` | `string \| undefined` | Base URL del servidor intermedio (Tomcat). Ej: `"https://mi-server.com"`. Solo obligatorio en móvil. En desktop puede omitirse. |
| `keystore` | `string \| undefined` | Almacén de certificados. Si se omite, usa el predeterminado del navegador/OS. Ver constantes en §10. |

**Lógica interna:**

- Android / iOS → `AppAfirmaJSWebService` (servidor intermedio)
- Desktop moderno (Chrome, Edge, Safari) → `AppAfirmaWebSocketClient` (WebSocket local)
- Firefox ≤ 60 / IE ≤ 10 → `AppAfirmaJSSocket` o `AppAfirmaJSWebService`

> Alias deprecado: `AutoScript.cargarMiniApplet()` — hace exactamente lo mismo.

**En este proyecto:**
```js
// autofirma.js → initAutoFirma()
window.AutoScript.cargarAppAfirma(servletBaseUrl ?? undefined);
```

---

## 3. API de firma

### `AutoScript.sign(dataB64, algorithm, format, params, successCB, errorCB)`

Firma un documento.

| Parámetro | Tipo | Descripción |
|---|---|---|
| `dataB64` | `string` | Documento a firmar en Base64 |
| `algorithm` | `string` | Algoritmo. Ej: `"SHA256withRSA"`, `"SHA512withRSA"`, `"SHA1withRSA"` |
| `format` | `string` | Formato de firma. Ej: `"PAdES"`, `"CAdES"`, `"XAdES"`, `"FacturaE"` |
| `params` | `string` | Parámetros extra en formato `clave=valor\nclave=valor`. Ver nota. |
| `successCB` | `(signatureB64: string) => void` | Llamado con el documento firmado en Base64 |
| `errorCB` | `(errorType: string, errorMessage: string) => void` | Llamado con el tipo y mensaje de error |

**Parámetros relevantes en `params` para PAdES:**

```
format=PAdES
serverUrl=https://…/afirma-server-triphase-signer/SignatureService   ← activa trifásico
signatureSubFilter=ETSI.CAdES.detached
signingCertificateV2=true
```

**En este proyecto:**
```js
// SIGN_PARAMS en autofirma.js
'format=PAdES'
// o con trifásico:
`format=PAdES\nserverUrl=${_servletBase}/afirma-server-triphase-signer/SignatureService`
```

---

### `AutoScript.coSign(signB64, dataB64, algorithm, format, params, successCB, errorCB)` / `cosign(...)`

Cofirma: añade una firma adicional sobre un documento ya firmado. Ambos signatarios firman de forma independiente el mismo documento.

> ⚠️ La API no soporta cofirma CAdES explícita con algoritmo distinto al original.

**No usado en este proyecto.**

---

### `AutoScript.counterSign(signB64, algorithm, format, params, successCB, errorCB)`

Contrafirma: firma una firma existente (firma sobre firma). El firmante acredita que ha visto la firma anterior.

**No usado en este proyecto.**

---

### `AutoScript.selectCertificate(params, successCB, errorCB)`

Muestra el selector de certificados de AutoFirma sin firmar nada. Permite obtener el certificado seleccionado por el usuario.

| Callback | Resultado |
|---|---|
| `successCB(certB64)` | Certificado en Base64 (DER) |
| `errorCB(errorType, msg)` | Error estándar |

**Caso de uso:** pre-seleccionar certificado antes de firmar, o mostrar qué certificado se usará.  
**No usado en este proyecto.**

---

### `AutoScript.signAndSaveToFile(operationId, dataB64, algorithm, format, params, outputFileName, successCB, errorCB)`

Firma y guarda directamente en un fichero local en el equipo del usuario. No devuelve el resultado al navegador.

**No usado en este proyecto.**

---

## 4. Gestión de ficheros

### `AutoScript.saveDataToFile(dataB64, title, fileName, extension, description, successCB, errorCB)`

Muestra un diálogo de guardado en el equipo del usuario.

| Parámetro | Descripción |
|---|---|
| `dataB64` | Contenido a guardar en Base64 |
| `title` | Título del diálogo |
| `fileName` | Nombre sugerido del fichero |
| `extension` | Extensión sin punto. Ej: `"pdf"` |
| `description` | Descripción del tipo de fichero |

**No usado en este proyecto.**

---

### `AutoScript.getFileNameContentBase64(title, extensions, description, filePath, successCB, errorCB)`

Abre un selector de fichero para que el usuario elija un fichero del equipo. Devuelve nombre y contenido en Base64.

**No usado en este proyecto.**

---

### `AutoScript.getMultiFileNameContentBase64(title, extensions, description, filePath, successCB, errorCB)`

Igual que el anterior pero permite selección múltiple.

**No usado en este proyecto.**

---

## 5. Configuración

Todos estos métodos deben llamarse **antes de** `cargarAppAfirma()` para que tengan efecto, salvo `setServlets` que puede llamarse después.

### `AutoScript.setForceWSMode(force: boolean)`

Fuerza el uso del servidor intermedio incluso en desktop. Útil para depurar el flujo móvil desde el PC.

```js
AutoScript.setForceWSMode(true);  // simula comportamiento móvil en desktop
```

**No usado en este proyecto** (útil para debug).

---

### `AutoScript.setServlets(storageServlet, retrieverServlet)`

Establece las URLs de los servlets de almacenamiento y recuperación explícitamente, en lugar de dejar que autoscript las deduzca desde `clientAddress`.

```js
AutoScript.setServlets(
  'https://server.com/afirma-signature-storage/StorageService',
  'https://server.com/afirma-signature-retriever/RetrieveService'
);
```

También activa la verificación (`checkComunicationServices`) si estamos en móvil.

**No usado directamente**. El proyecto pasa `clientAddress` a `cargarAppAfirma()` y autoscript deduce las URLs.

---

### `AutoScript.setPortRange(min, max)`

Cambia el rango de puertos aleatorios para el WebSocket local. Por defecto: 49152–65535.

```js
AutoScript.setPortRange(55000, 55100); // restringe a 100 puertos
```

**No usado en este proyecto.**

---

### `AutoScript.setKeyStore(ksType: string)`

Fuerza el uso de un almacén de certificados concreto. Ver constantes en §10.

```js
AutoScript.setKeyStore(AutoScript.KEYSTORE_PKCS12); // solo ficheros .p12
AutoScript.setKeyStore(AutoScript.KEYSTORE_DNIE);   // solo DNIe
```

**No usado en este proyecto** (usa el predeterminado del sistema).

---

### `AutoScript.setMinimumClientVersion(version: string)`

Si la versión de AutoFirma instalada es inferior a la indicada, se mostrará un error.

```js
AutoScript.setMinimumClientVersion('1.8.0');
```

**No usado en este proyecto.**

---

### `AutoScript.setStickySignatory(sticky: boolean)`

Si `true`, AutoFirma recuerda el certificado seleccionado para las siguientes llamadas de la misma sesión, sin volver a preguntar.

```js
AutoScript.setStickySignatory(true);
```

**No usado en este proyecto** (en glovalsign-signer se firma una sola vez por sesión).

---

### `AutoScript.setAppName(name: string)`

Establece el nombre de la aplicación que aparece en los diálogos de AutoFirma.

```js
AutoScript.setAppName('Glovalsign');
```

**No usado en este proyecto.**

---

### `AutoScript.setLocale(locale: string)`

Cambia el idioma de los mensajes internos. Valores: `"es_ES"`, `"gl_ES"`.

**No usado en este proyecto** (por defecto `es_ES`).

---

### `AutoScript.checkTime(checkType, maxMillis, checkURL?)`

Verifica que el reloj del cliente no tenga un desfase grande respecto al servidor.

| `checkType` | Constante | Comportamiento |
|---|---|---|
| `CT_NO` | `AutoScript.CHECKTIME_NO` | No comprueba |
| `CT_RECOMMENDED` | `AutoScript.CHECKTIME_RECOMMENDED` | Avisa pero no bloquea |
| `CT_OBLIGATORY` | `AutoScript.CHECKTIME_OBLIGATORY` | Bloquea la firma si hay desfase |

```js
AutoScript.checkTime(AutoScript.CHECKTIME_RECOMMENDED, 300000); // avisa si >5 min
```

**No usado en este proyecto.**

---

## 6. Errores — catálogo completo

El callback `errorCB(errorType, errorMessage)` recibe siempre dos parámetros. En `autofirma.js` del proyecto, `buildSignError()` mapea los conocidos.

### Errores del cliente WebSocket (desktop)

| `errorType` | Cuándo ocurre |
|---|---|
| `es.gob.afirma.standalone.afirma5.ws.client.socket.AutoFirmaConnectionException` | No se pudo abrir el WebSocket — AutoFirma no instalada o no arrancada |
| `java.util.concurrent.TimeoutException` | AutoFirma no respondió a tiempo (agotados los reintentos) |
| `java.lang.InterruptedException` | AutoFirma se cerró o cerró el WebSocket durante la operación |
| `es.gob.afirma.standalone.ApplicationNotFoundException` | AutoFirma no encontrada al intentar lanzarla |
| `java.lang.IOException` | Error de comunicación genérico |
| `es.gob.afirma.core.AOCancelledOperationException` | El usuario canceló en el diálogo de AutoFirma |
| `es.gob.afirma.core.OutOfMemoryError` | El fichero supera la memoria disponible en AutoFirma |
| `java.lang.Exception` | Error genérico o desconocido |
| `java.lang.NoSuchMethodException` | Método no implementado (ej: `getCurrentLog`) |

### Errores del servidor intermedio (móvil)

| `errorType` | Cuándo ocurre |
|---|---|
| `es.gob.afirma.core.AOCancelledOperationException` | Usuario canceló en la app AutoFirma móvil |
| `es.gob.afirma.core.OutOfMemoryError` | Fichero demasiado grande para la app móvil |
| `java.lang.Exception` | Error genérico del servidor o respuesta inválida |

### Errores de `getCurrentLog`

| `errorType` | Cuándo ocurre |
|---|---|
| `java.lang.NoSuchMethodException` | Método desactivado — siempre se dispara este error |

---

### Estado actual de `isNotInstalledError()` en el proyecto

```js
// autofirma.js
export function isNotInstalledError(err) {
  const connectionType = 'es.gob.afirma.standalone.afirma5.ws.client.socket.AutoFirmaConnectionException';
  return err.name === connectionType || err.name === 'timeout';
}
```

**Problema:** solo detecta el caso WebSocket en desktop. En móvil, si AutoFirma no está instalada, el error real puede ser `es.gob.afirma.standalone.ApplicationNotFoundException` o simplemente un timeout largo sin `errorCB`. Una versión más robusta:

```js
export function isNotInstalledError(err) {
  if (!err) return false;
  const notInstalledTypes = new Set([
    'es.gob.afirma.standalone.afirma5.ws.client.socket.AutoFirmaConnectionException',
    'es.gob.afirma.standalone.ApplicationNotFoundException',
    'timeout',
    'java.util.concurrent.TimeoutException',
    'java.lang.IOException',
  ]);
  return notInstalledTypes.has(err.name);
}
```

---

## 7. Sistema de diálogos interno (`SupportDialog`)

autoscript.js tiene su propio sistema de modales que se muestra automáticamente cuando AutoFirma no está instalada o hay errores de conexión. **Puede colisionar visualmente con nuestro `AutofirmaInstallModal`.**

### Cuándo se activa

- Durante `cargarAppAfirma()` en móvil: verifica los servlets (`checkComunicationServices`) y muestra error si fallan.
- Durante la firma: si se agota el timeout de conexión con AutoFirma.
- En desktop: cuando se detecta que AutoFirma no está instalada.

### Cómo desactivarlo completamente

```js
SupportDialog.enableSupportDialog(false);
// o selectivamente:
SupportDialog.enableLoadingDialog(false);  // desactiva spinner de "cargando"
SupportDialog.enableErrorDialog(false);    // desactiva diálogos de error
```

### Cómo personalizar sin desactivarlo

```js
// Cambiar clases CSS
SupportDialog.setBackgroundClass('mi-overlay');
SupportDialog.setDialogClass('mi-modal');
SupportDialog.setActionButtonClass('btn btn--primary');
SupportDialog.setCloseButtonClass('btn btn--secondary');
SupportDialog.setLogoClass('mi-logo');
SupportDialog.setSpinnerClass('mi-spinner');

// Cambiar URLs de descarga
SupportDialog.setPCDownloadURL('<a href="https://...">Descargar AutoFirma</a>');
SupportDialog.setAndroidDownloadURL('<a href="https://play.google.com/...">Google Play</a>');
SupportDialog.setIOSDownloadURL('<a href="https://apps.apple.com/...">App Store</a>');

// Texto de contacto administrador
SupportDialog.setAdminContactInfo('soporte@empresa.com');

// App alternativa para móvil si el trámite no es compatible
SupportDialog.setAlternativeAndroidAppLink('<a href="...">App alternativa</a>');
SupportDialog.setAlternativeIOSAppLink('<a href="...">App alternativa iOS</a>');
```

### IDs del DOM que inyecta

| ID | Descripción |
|---|---|
| `afirmaSupportDialog` | Overlay principal (backdrop) |
| `afirmaChildDiv` | Contenedor del modal |
| `afirmaMessagePanel` | Panel logo + texto |
| `afirmaImgDiv` | Logo de AutoFirma |
| `afirmaSupportDialogLabel` | Span con el mensaje |
| `afirmaActionButton` | Botón de acción ("Reintentar") |
| `afirmaCloseButton` | Botón de cierre |

> **Recomendación para este proyecto:** llamar a `SupportDialog.enableSupportDialog(false)` justo después de cargar `autoscript.js`, ya que tenemos nuestro propio `AutofirmaInstallModal` con mejor UX. Sin eso, pueden aparecer dos modales superpuestos.

---

## 8. Firma de lotes (batch)

autoscript.js soporta dos mecanismos para firmar múltiples documentos en una sola llamada.

### Lote JSON (recomendado)

```js
// 1. Crear el lote
AutoScript.createBatch('SHA256withRSA', 'PAdES', 'sign', 'format=PAdES');

// 2. Añadir documentos
AutoScript.addDocumentToBatch('id-doc-1', documentoB64_1);
AutoScript.addDocumentToBatch('id-doc-2', documentoB64_2, 'CAdES'); // formato distinto

// 3. Firmar
AutoScript.signBatchProcess(
  false,  // stopOnError: si true, para en el primer error
  'https://servidor/afirma-server-batch/PreSignerService',
  'https://servidor/afirma-server-batch/PostSignerService',
  null,   // certFilters
  (resultB64) => { /* JSON con resultados por ID */ },
  (errorType, msg) => { /* error */ }
);
```

### Lote XML (legacy)

```js
AutoScript.signBatch(
  batchXmlB64,
  'https://servidor/afirma-server-batch/PreSignerService',
  'https://servidor/afirma-server-batch/PostSignerService',
  'format=PAdES',
  successCB,
  errorCB
);
```

**No usado en este proyecto** — se firma un documento por solicitud.

---

## 9. Utilidades

### `AutoScript.getBase64FromText(plainText: string): string`

Convierte texto plano a Base64.

### `AutoScript.getTextFromBase64(base64: string): string`

Convierte Base64 a texto.

### `AutoScript.downloadRemoteData(url, successCB, errorCB)`

Descarga datos desde una URL (usando XMLHttpRequest interno) y devuelve el contenido en Base64.

### `AutoScript.echo(): string`

Comprueba si la conexión con AutoFirma está activa. Devuelve `"OK"` si está conectado.

### `AutoScript.isAndroid(): boolean` / `AutoScript.isIOS(): boolean`

Detección de plataforma expuesta al exterior.

### `AutoScript.getErrorMessage(): string` / `AutoScript.getErrorType(): string`

Obtienen el último error producido. Solo funcionan después de una operación fallida y mientras `clienteFirma` esté inicializado.

---

## 10. Constantes expuestas

### Almacenes de certificados (para `setKeyStore`)

| Constante | Valor | Descripción |
|---|---|---|
| `KEYSTORE_WINDOWS` | `"WINDOWS"` | Almacén del sistema Windows |
| `KEYSTORE_APPLE` | `"APPLE"` | Llavero de macOS |
| `KEYSTORE_PKCS12` | `"PKCS12"` | Fichero .p12 / .pfx |
| `KEYSTORE_PKCS11` | `"PKCS11"` | Tarjeta criptográfica (DNIe, etc.) |
| `KEYSTORE_MOZILLA` | `"MOZ_UNI"` | Almacén de Firefox |
| `KEYSTORE_DNIE` | `"DNIEJAVA"` | DNI electrónico español |
| `KEYSTORE_JAVA` | `"JAVA"` | Almacén Java (JKS) |
| `KEYSTORE_JCEKS` | `"JCEKS"` | Almacén JCEKS |
| `KEYSTORE_JAVACE` | `"JAVACE"` | Almacén Java CE |
| `KEYSTORE_SHARED_NSS` | `"SHARED_NSS"` | NSS compartido |

### Comprobación de hora

| Constante | Valor |
|---|---|
| `CHECKTIME_NO` | `"CT_NO"` |
| `CHECKTIME_RECOMMENDED` | `"CT_RECOMMENDED"` |
| `CHECKTIME_OBLIGATORY` | `"CT_OBLIGATORY"` |

### Tiempos de conexión WebSocket

| Constante | Valor por defecto | Descripción |
|---|---|---|
| `AUTOFIRMA_LAUNCHING_TIME` | `2000` ms | Espera entre reintentos de conexión |
| `AUTOFIRMA_CONNECTION_RETRIES` | `15` | Número de reintentos (total ≈ 30 s) |

---

## 11. Métodos deprecados

| Método | Reemplazado por |
|---|---|
| `cargarMiniApplet()` | `cargarAppAfirma()` |
| `setForceAFirma()` | Sin efecto — siempre se usa la app nativa |
| `setJnlpService()` | Sin efecto — WebStart eliminado |
| `isJNLP()` | Siempre devuelve `false` |
| `needNativeAppInstalled()` | Siempre devuelve `true` |
| `JAVA_ARGUMENTS` | `null` — sin efecto |
| `SYSTEM_PROPERTIES` | `null` — sin efecto |
| `getCurrentLog()` | Siempre dispara `NoSuchMethodException` |

---

## 12. Qué usamos y qué no

### ✅ Usado en este proyecto

| Método / Feature | Dónde |
|---|---|
| `cargarAppAfirma(servletBaseUrl)` | `autofirma.js → initAutoFirma()` |
| `sign(pdfB64, 'SHA256withRSA', 'PAdES', params, successCB, errorCB)` | `autofirma.js → signPdfWithAutoFirma()` |
| Detección automática de plataforma (Android/iOS → servlet) | Implícita en `cargarAppAfirma()` |
| Modo trifásico vía `serverUrl` en `params` | `autofirma.js → SIGN_PARAMS` |
| Tipos de error `AutoFirmaConnectionException` y `timeout` | `autofirma.js → isNotInstalledError()` |

### ❌ No usado (oportunidades / decisiones conscientes)

| Método | Por qué no / cuándo podría usarse |
|---|---|
| `SupportDialog.enableSupportDialog(false)` | **Debería usarse** — el modal nativo de autoscript puede superponerse al nuestro |
| `setAppName('Glovalsign')` | Cosmético — mejoraría UX en el diálogo nativo de AutoFirma |
| `setStickySignatory(true)` | Útil si hubiera que firmar varios documentos seguidos en la misma sesión |
| `setMinimumClientVersion()` | Solo necesario si se requiere una versión mínima de AutoFirma |
| `selectCertificate()` | Permitiría mostrar el certificado al usuario antes de firmar |
| `coSign()` / `counterSign()` | No hay caso de uso en glovalsign-signer |
| `createBatch()` / `signBatchProcess()` | No hay firma de múltiples documentos en una llamada |
| `saveDataToFile()` | No se ofrece descarga directa desde AutoFirma |
| `getFileNameContentBase64()` | No se carga ficheros del equipo del usuario |
| `setForceWSMode(true)` | Útil para **debuggear el flujo móvil desde desktop** |
| `echo()` | Podría usarse para pre-verificar que AutoFirma está activa antes de mostrar el botón |
| `checkTime()` | Podría activarse si hay problemas con certificados caducados por desfase horario |
| `setPortRange()` | Solo necesario en entornos con firewall corporativo |
| `downloadRemoteData()` | No se usa; el PDF lo descarga el backend, no autoscript |
