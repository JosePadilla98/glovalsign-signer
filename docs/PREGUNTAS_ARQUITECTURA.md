# Preguntas y respuestas sobre arquitectura — GlovalSign Signer

---

## Flujo general

### 1. ¿Qué hace exactamente `autoscript.js` y qué no hace? ¿Quién realiza la firma criptográfica real?

`autoscript.js` es una librería del Ministerio que actúa de **intermediario**: detecta el entorno del cliente (desktop/móvil, navegador, modo de comunicación disponible) y construye la URL `afirma://...` con todos los parámetros empaquetados —el PDF en Base64, el algoritmo, el formato, la URL del servlet si aplica— para pasársela a AutoFirma.

**No firma nada**. La firma criptográfica la realiza exclusivamente la aplicación nativa **AutoFirma**, instalada en el equipo del usuario, porque es quien tiene acceso directo a los certificados y claves privadas almacenados en el sistema operativo o la tarjeta criptográfica.

---

### 3. ¿Por qué necesitamos AutoFirma instalado en el cliente? ¿No podríamos firmar en el servidor?

Firmar en el servidor requeriría que la clave privada del usuario saliera de su equipo, lo que **quiebra la cadena de custodia** y es inválido legalmente en muchos contextos (p. ej. firma con certificado de la FNMT). La normativa de firma electrónica avanzada/cualificada exige que la clave privada esté bajo control exclusivo del firmante. AutoFirma accede al almacén de certificados del SO (Windows, macOS, Linux) o a dispositivos criptográficos (tarjeta DNI-e, token USB) sin exponer nunca la clave privada al exterior.

---

## Modos de comunicación

### 4. ¿Cuántos modos de comunicación existen entre el navegador y AutoFirma? ¿Cuándo se usa cada uno?

Hay cuatro modos, seleccionados automáticamente por `autoscript.js`:

| Modo | Clase JS | Cuándo se activa |
|---|---|---|
| **WebSocket local** | `AppAfirmaWebSocketClient` | Desktop moderno (Chrome, Edge, Firefox ≥ 61, Safari ≥ 11). Es el caso normal. |
| **Socket HTTPS directo** | `AppAfirmaJSSocket` | Navegadores sin WebSocket completo o con problemas de VDI (Firefox 49–60). |
| **Servidor intermedio simple** | `AppAfirmaJSWebService` | Móvil (Android/iOS), IE ≤ 10, o `forceWSMode = true`. |
| **Servidor intermedio trifásico** | `AppAfirmaJSWebService` | Cuando se llama a `signBatchJSON` con URLs de pre/post-signer, o cuando `PUBLIC_TRIPHASE_SIGNING=true`. |

En este proyecto, el modo activo se decide en `src/utils/autofirma.js` según las variables de entorno `PUBLIC_TRIPHASE_SIGNING` y `PUBLIC_SERVLET_BASE_URL`.

---

### 5. ¿Qué pasa si el usuario está en móvil? ¿Por qué no funciona el WebSocket local en ese caso?

En móvil, el navegador **no puede conectarse a `localhost` del propio dispositivo** mediante WebSocket porque los navegadores móviles restringen el acceso a direcciones loopback (`127.0.0.1`) desde páginas web. Además, AutoFirma móvil no abre un servidor WebSocket local.

Se usa entonces el modo servidor intermedio: el browser sube el PDF (cifrado) al `StorageService` de Tomcat, lanza AutoFirma mediante URL scheme `afirma://...`, y AutoFirma descarga el PDF desde ese servidor, lo firma, y sube el resultado al `RetrieveService`. El browser hace polling hasta obtener el resultado.

Para que esto funcione, los servlets de Tomcat deben ser accesibles tanto desde el navegador del usuario como desde la app AutoFirma del móvil —de ahí la necesidad del túnel Cloudflare.

---

### 6. ¿Cómo sabe `autoscript.js` si AutoFirma está instalado? ¿Hay algún callback del sistema operativo?

**No hay ningún callback del OS**. El navegador lanza la URL `afirma://...` y no recibe ninguna confirmación de si la app está o no instalada; si no lo está, el OS simplemente ignora la URL en silencio.

`autoscript.js` lo infiere por **timeout**: si tras lanzar la URL scheme no se establece el WebSocket en ~30 segundos (15 reintentos × 2 s), asume que AutoFirma no está instalado y llama al `errorCallback`. En este proyecto, ese caso muestra un `Alert` con el mensaje de error. El enlace "¿Cómo instalar AutoFirma?" (que abre `AutofirmaInstallModal`) está siempre visible en el paso de firma como ayuda, no se activa condicionalmente por el timeout.

La opción de firma manual por subida de archivo (`ManualUploadStep`) es independiente de este flujo: solo aparece si el backend devuelve `signing_methods.manual_upload: true` en los metadatos de la solicitud.

---

## Seguridad

### 7. El PDF del usuario, ¿viaja por nuestros servidores en algún caso? ¿En cuál? ¿Está cifrado?

#### Caso A — Desktop moderno (caso normal en este proyecto)

El PDF **no sale del equipo del usuario**. El flujo es completamente local:

```
RAM del navegador → autoscript.js → wss://127.0.0.1:PORT → AutoFirma
```

`autoscript.js` construye la URL de la operación con el PDF codificado en Base64 en el parámetro `dat=` y la envía por el WebSocket:

```
ws.send("afirma://sign?dat=<pdfEnBase64>&format=PAdES&algorithm=SHA256withRSA&...")
```

Ese mensaje viaja por `wss://127.0.0.1:PORT` — un WebSocket en loopback dentro de la misma máquina. El PDF viaja en Base64, pero **nunca sale del equipo**: no hay red externa, no hay servidor intermedio, el servlet Tomcat no interviene en ningún momento.

#### Caso B — Móvil o `forceWSMode` (servidor intermedio)

El PDF **sí pasa por el servidor** Tomcat, pero **cifrado**. El flujo exacto extraído del código de `AppAfirmaJSWebService`:

**1. El browser genera `cipherKey`**

```js
// autoscript.js — generateCipherKey()
var randomInts = new Uint32Array(1);
window.crypto.getRandomValues(randomInts);
cipherKey = zeroFill(randomInts[0] % 100000000, 8);  // 8 dígitos, ej. "04729183"
```

**2. El browser cifra el PDF y lo sube al `StorageService`**

```
// autoscript.js — sendDataAndExecAppIntent()
POST StorageService
  body: op=put&v=1_0&id=<fileId>&dat=<padding>.<XML_con_PDF_cifrado_DES-CBC>
```

El XML que se cifra contiene todos los parámetros de la operación (PDF en Base64, algoritmo, formato...). El cifrado usa DES-CBC sin padding (`Cipher.des(key, data, 1, 0, null)`), con el `cipherKey` como clave. El servlet recibe y almacena ese blob —**nunca ve el contenido en claro**.

**3. El browser lanza AutoFirma con la URL scheme, incluyendo el `cipherKey`**

```
afirma://sign?id=<idSession>&key=04729183&fileid=<fileId>
              &rtservlet=https://servidor/RetrieveService
              &stservlet=https://servidor/StorageService&...
```

La `key` viaja en esta URL, que el OS pasa directamente a la app AutoFirma. **No pasa por el servlet**.

**4. AutoFirma descarga el PDF cifrado del `StorageService`, lo descifra con `key`, firma y sube el resultado al `RetrieveService` (también cifrado con la misma `key`)**

**5. El browser hace polling al `RetrieveService`**

```
// autoscript.js — getStoredFileFromServlet() / retrieveRequest()
// Desktop: cada 3 s, máx. 10 intentos
// Móvil:   cada 4 s, máx. 15 intentos
POST RetrieveService
  body: op=get&v=1_0&id=<idSession>&it=<n>

Respuestas posibles:
  ERR-06        → todavía no hay resultado, seguir polling
  #WAIT...      → AutoFirma activo, reiniciar contador de intentos
  ERR-11:=...   → cancelado por el usuario
  ERR-xx:=...   → error de AutoFirma
  CANCEL        → cancelación explícita
  <cert>|<firma_cifrada>  → éxito
```

**6. El browser descifra el resultado con su copia del `cipherKey`**

```js
// autoscript.js — decipher()
signature = Cipher.des(key, cipheredData, 0, 0, null);  // descifrado DES-CBC
```

---

### 8. ¿Para qué sirve el `cipherKey`? ¿Quién lo genera, quién lo conoce y quién no?

`cipherKey` es la clave de cifrado que protege los datos cuando se usa el servidor intermedio (modo móvil).

- **Lo genera:** el browser, con `window.crypto.getRandomValues()` → 8 dígitos decimales (ej. `"04729183"`).
- **Lo conocen:** el browser (lo genera y lo usa para descifrar la respuesta final) y AutoFirma (lo recibe en la URL `afirma://...` como parámetro `key=`).
- **No lo conoce:** el servlet Tomcat. Solo ve blobs cifrados con DES-CBC, nunca la clave.

El `cipherKey` nunca se envía al servlet. Su único canal de transmisión es la URL `afirma://...` que el OS pasa directamente a la app nativa.

**Tipo de cifrado y por qué es una defensa pobre**

Se usa **DES-CBC** (Data Encryption Standard en modo Cipher Block Chaining). Es una defensa pobre por dos razones combinadas:

- **El algoritmo está roto:** DES tiene una clave de 56 bits efectivos, retirado por NIST en 2005. Hoy se rompe por fuerza bruta en segundos con hardware común.
- **La clave tiene entropía ridícula:** los 8 bytes de clave no son bytes aleatorios, son los caracteres ASCII de 8 dígitos decimales (`'0'`–`'9'`). Eso da solo `log2(10^8) ≈ 27 bits` de entropía real — el espacio de búsqueda es de 100 millones de valores, recorrible en milisegundos.

En la práctica, quien tenga el blob cifrado del servlet y el `cipherKey` de la URL puede descifrar el contenido de forma trivial.

---

### 9. ¿El servlet puede leer los datos firmados que almacena? ¿Por qué no?

No. Tanto el PDF subido (en `StorageService`) como la firma devuelta (en `RetrieveService`) están cifrados con DES-CBC usando el `cipherKey`. El servlet actúa como **buzón ciego**: recibe bytes cifrados, los almacena temporalmente y los entrega a quien pregunte con el `id` correcto —sin poder leer su contenido.

El cifrado/descifrado ocurre íntegramente en los dos extremos que conocen la clave: el browser y AutoFirma.

---

### 10. ¿Qué riesgos de seguridad tiene el modo con servidor intermedio frente al WebSocket local?

| Aspecto | WebSocket local | Servidor intermedio |
|---|---|---|
| PDF expuesto en red | No (todo local) | Sí, cifrado con DES-CBC (algorítmicamente débil por ser DES) |
| Datos accesibles en servidor | No | Servlet almacena blob cifrado temporalmente |
| Superficie de ataque | Mínima | Mayor: el servidor Tomcat es un punto intermedio |
| Privacidad del documento | Total | Parcial (servidor no puede leer, pero tiene custodia temporal) |

El riesgo principal del modo servidor es la debilidad de DES como algoritmo de cifrado. Hay tres razones concretas:

**1. Entropía real de la clave: ~27 bits**
El `cipherKey` es un número de 8 dígitos decimales (0–99,999,999), lo que da como mucho ~27 bits de entropía real, muy por debajo de los 56 bits que ya de por sí se consideran insuficientes hoy. Con hardware moderno, un ataque de fuerza bruta sobre 100 millones de valores posibles es trivial en milisegundos.

**2. DES está roto desde 1998**
En 1998 la EFF construyó "Deep Crack" por 250.000$ y rompió DES en 56 horas. Hoy con GPUs en la nube se rompe en segundos. Está formalmente retirado por NIST desde 2005.

**3. El `cipherKey` viaja en la URL del scheme**
```
afirma://sign?key=04729183&...
```
En algunos sistemas esa URL queda registrada en logs del OS, historial del gestor de URLs, etc. Si alguien obtiene el `cipherKey` y el blob cifrado del servlet, descifrar es trivial dado el punto 1.

**Por qué se acepta igualmente**

El protocolo es del Ministerio (no del proyecto) y tiene dos atenuantes:
- Los datos están cifrados en tránsito y en reposo en el servlet: alguien que solo monitoree la red entre browser y servlet no tiene la clave.
- La ventana de exposición es muy corta: el servlet borra los datos una vez recogidos.

El riesgo real requeriría comprometer simultáneamente el servlet (para el blob) y el log de URLs del OS (para la clave). No es trivial en la práctica, pero criptográficamente es indefendible por estándar actual. Se acepta como limitación del protocolo de AutoFirma, que es responsabilidad del Ministerio.

---

## Infraestructura y disponibilidad

### 11. ¿Qué es el servlet de Tomcat y por qué lo necesitamos?

Tomcat aloja los WARs oficiales del Ministerio que implementan el protocolo del servidor intermedio:

| WAR | Función |
|---|---|
| `afirma-signature-storage` (`StorageService`) | Buzón de entrada: almacena datos que sube el browser o AutoFirma |
| `afirma-signature-retriever` (`RetrieveService`) | Buzón de salida: entrega datos al browser o a AutoFirma |
| `afirma-server-triphase-signer` (opcional) | Calcula hashes (PRE) y ensambla la firma final (POST) en el modo trifásico |

Sin Tomcat, el modo móvil y el modo trifásico no funcionan.

---

### 13. ¿Qué ocurre si el servlet cae durante una firma en proceso?

El browser está haciendo **polling** al `RetrieveService` cada 3 segundos, con un máximo de 10 intentos. Si el servlet cae:
- Las peticiones de polling fallan con error de red o HTTP 5xx.
- Tras agotar los reintentos, `autoscript.js` llama al `errorCallback`.
- La SPA muestra un mensaje de error al usuario.
- **El backend nunca es notificado**: el fallo ocurre íntegramente en el cliente. La SPA nunca llega a hacer el `POST /firmar-spa/:token`, por lo que no se escribe ningún registro de error en la base de datos. La firma simplemente queda sin completar. El proceso debe reiniciarse manualmente por el usuario desde el principio.

---

## Modo trifásico y lotes

### 14. ¿Qué diferencia hay entre firma simple y firma trifásica? ¿Cuándo usaríamos cada una?

**Firma simple:** el documento completo (PDF) viaja hasta AutoFirma. AutoFirma firma el documento entero con la clave privada local y devuelve el PDF firmado completo.

**Firma trifásica:** se divide en tres fases:
- **PRE:** el servidor (`afirma-server-triphase-signer`) recibe el documento y el certificado del usuario, calcula el hash y los metadatos criptográficos, y los devuelve a AutoFirma.
- **FIRMA:** AutoFirma solo firma ese hash (unos pocos bytes) con la clave privada. El documento completo nunca llega a AutoFirma.
- **POST:** el servidor recibe el hash firmado y lo ensambla con el documento original para producir el PDF firmado final.

Se activa en este proyecto con `PUBLIC_TRIPHASE_SIGNING=true` + `PUBLIC_SERVLET_BASE_URL`. Es preferible con PDFs grandes o con lotes de documentos, porque reduce drásticamente el tráfico entre AutoFirma y el servidor.

---

### 15. En el modo trifásico, ¿el documento completo llega a AutoFirma? ¿Qué es lo único que firma?

**No**. El documento completo se queda en el servidor (`afirma-server-triphase-signer`). Lo único que viaja a AutoFirma son los **hashes criptográficos** de cada documento (unos pocos bytes), y lo único que AutoFirma firma es esos hashes con la clave privada del usuario.

---

## Operación y monitorización

### 16. ¿Cómo sabemos si una firma ha fallado? ¿Dónde se registra?

- **Logs:** solo se registra el fallo en el frontend (SPA) mediante el logger de desarrollo y el mensaje de error mostrado al usuario. El backend no recibe ninguna notificación si la firma falla en el cliente (cancelación, error en AutoFirma, timeout, etc.).
- **Estado en base de datos:** no se actualiza. El documento queda en estado pendiente; no pasa a `ERROR_NOTIFICACION` ni a error de firma PDF, por lo que el job de reintentos no puede actuar.
- **Métricas Prometheus:** solo se reflejan los intentos exitosos (cuando el PDF firmado llega al backend). Los fallos en la SPA no se contabilizan en Prometheus.
- **En el frontend:** la SPA muestra un `Alert` con el mensaje de error recibido de `autoscript.js` o del propio flujo React.

> **TODO:** Implementar una llamada al backend para registrar explícitamente los fallos de firma ocurridos en el cliente (por ejemplo, endpoint `POST /api/v1/sign/public/documento/error/:token` con el motivo del fallo). Así se podría:
> - Auditar intentos fallidos y cancelaciones.
> - Mostrar al usuario un historial realista de intentos.
> - Permitir que el job de reintentos actúe sobre fallos de cliente si es relevante.

**Sugerencia:**
- Añadir en la SPA una llamada a un endpoint de error cada vez que se capture un fallo en el flujo de firma (cancelación, error de AutoFirma, timeout, etc.).
- Registrar en la base de datos el estado `ERROR_FIRMA_CLIENTE` o similar, con el motivo y timestamp.
- Opcional: mostrar en la UI un botón de "Reintentar" que relance el flujo desde el backend si es posible.

---

### 17. ¿Qué pasa si el usuario cancela el diálogo de selección de certificado en AutoFirma?

AutoFirma devuelve a `autoscript.js` la señal `ERR-11:=...` (cancelación) o `CANCEL`. `autoscript.js` llama entonces al `errorCallback` con una excepción de tipo `AOCancelledOperationException`. En la SPA, esto se traduce en mostrar un `Alert` de error con un mensaje informativo al usuario y permitirle reintentar la firma sin recargar la página.

---

### 18. ¿Hay reintentos automáticos? ¿En qué parte del flujo?

Hay **dos niveles** de reintentos:

1. **AutoScript (nivel comunicación):** en modo WebSocket, `autoscript.js` reintenta la conexión hasta 15 veces cada 2 segundos antes de declarar que AutoFirma no está disponible. En modo polling del servidor intermedio, reintenta hasta 10 veces cada 3 segundos; si recibe `#WAIT`, reinicia el contador.

2. **Job de reintentos del backend (nivel negocio):** el `pdfSigningRetryScheduler` procesa periódicamente los documentos que quedaron en estado de error de firma PDF (p. ej. si el servicio externo `AplicacionValtecnic` estaba caído cuando se recibió el PDF firmado). Se ejecuta una vez al arrancar el servidor y luego cada `REINTENTO_FIRMAR_DOCUMENTO_MINUTOS` minutos (por defecto 15). Procesa los documentos fallidos de forma secuencial para no sobrecargar el servicio externo.

---

### 19. ¿Cómo funciona el job de reintentos (`pdfSigningRetryScheduler`)?

Al arrancar `glovalsign`, `startPdfSigningRetryJob()` lanza una primera ejecución inmediata y programa un `setInterval` con el intervalo configurado. Cada ciclo:

1. Consulta en base de datos los documentos con estado de error de firma PDF (`getDocumentsWithPdfSigningError`).
2. Por cada documento, llama a `retryPdfSigningForDocument`, que:
   - Reconstruye los parámetros necesarios (número de expediente, código de usuario, IP del servidor).
   - Llama a `pdfSigningService.signWithfirmaDocumentoPDF` para re-enviar al servicio externo.
   - Si tiene éxito, añade la evidencia de firma en base de datos y actualiza el estado a `FIRMADO`.
   - Si falla de nuevo, registra el error en logs (sin cambiar estado, para que el siguiente ciclo lo reintente).
3. Registra métricas de la ejecución (`jobEjecucionesTotal` con resultado `exito`/`fallo`, `jobUltimaEjecucionTimestamp`).
