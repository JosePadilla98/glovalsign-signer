# `AppAfirmaWebSocketClient` vs `AppAfirmaJSSocket`

Ambas clases viven en `/public/vendor/autoscript.js` y resuelven el mismo problema: comunicar el navegador con AutoFirma nativo en `localhost` sin pasar por ningún servidor intermedio. La diferencia está en **el protocolo que usan para esa comunicación local**.

---

## 1. Cuándo se elige cada una (`cargarAppAfirma`)

```js
// autoscript.js líneas 849-879
if (forceWSMode || Platform.isIOS() || Platform.isAndroid()) {
    clienteFirma = new AppAfirmaJSWebService(...)  // servidor intermedio — fuera de este análisis
}
else if (isWebSocketsSupported() && !Platform.isInternetExplorer() && !Platform.isFirefox60orLower()) {
    clienteFirma = new AppAfirmaWebSocketClient(...)  // ← CASO NORMAL (Chrome, Edge, Firefox ≥61, Safari ≥11)
}
else if (!Platform.isInternetExplorer10orLower() && !Platform.isSafari10()) {
    clienteFirma = new AppAfirmaJSSocket(...)         // ← FALLBACK (Firefox 49-60, IE 11, etc.)
}
else {
    clienteFirma = new AppAfirmaJSWebService(...)     // servidor intermedio
}
```

---

## 2. Tabla comparativa

| | `AppAfirmaWebSocketClient` | `AppAfirmaJSSocket` |
|---|---|---|
| **Protocolo de transporte** | WebSocket Secure (`wss://`) | HTTPS + XHR (`https://`) |
| **Versión de protocolo AutoFirma** | `v=4` | `v=1` |
| **URL scheme de lanzamiento** | `afirma://websocket?ports=...` | `afirma://service?ports=...` |
| **Endpoint local** | `wss://127.0.0.1:<PORT>` | `https://127.0.0.1:<PORT>/afirma` |
| **Tipo de conexión** | Persistente y bidireccional | Sin estado — cada mensaje es una petición HTTP independiente |
| **Estado de conexión** | Variable `connected` (boolean) + objeto `ws` (WebSocket activo) | Variable `connection` (boolean) + `port` (puerto fijado al conectar) |
| **Envío del eco** | `ws.send("echo=-idsession=<id>@EOF")` | `httpRequest.send("echo=-idsession=<id>@EOF")` como POST |
| **Recepción de respuesta** | Evento `ws.onmessage` | Callback `httpRequest.onreadystatechange` |
| **Límite de tamaño de mensaje** | Sin límite práctico (WebSocket gestiona mensajes grandes) | Sí — fragmenta la URL si supera `URL_MAX_SIZE` |
| **Tamaños de fragmentación** | N/A | IE: 12 000 chars · Firefox: ~458 KB · Otros: ~1 MB |
| **Protocolo de fragmentación** | N/A | Envía fragmentos `fragment=@N@TOTAL@<data>@EOF` → espera `MORE_DATA_NEED` → envía `firm=` → recoge resultado con `send=@part@totalParts@EOF` |
| **Detección de cierre inesperado** | `ws.onclose` — AutoFirma cierra el socket y el browser lo sabe inmediatamente | No hay evento de cierre; se detecta porque la siguiente petición HTTP falla |
| **Reintento por puerto** | Abre WebSockets en paralelo en todos los puertos candidatos; el primero en hacer `onopen` gana | Semáforo (`semaphore.locked`) para que solo un puerto procese la respuesta |
| **Reutilización de puertos** | Cada operación puede usar puertos nuevos | Una vez encontrado el puerto, se reutiliza en operaciones posteriores (`port` persiste) |
| **Navegadores soportados** | Chrome, Edge, Firefox ≥ 61, Safari ≥ 11 | Firefox 49–60, IE 11, y navegadores sin soporte WebSocket completo |

---

## 3. Flujo de comunicación en detalle

### `AppAfirmaWebSocketClient` (WebSocket persistente)

```
Browser                                AutoFirma
   │                                       │
   │── afirma://websocket?ports=X,Y&v=4 ──▶│  (URL scheme, SO lanza la app)
   │                                       │
   │  [espera AUTOFIRMA_LAUNCHING_TIME]    │
   │                                       │
   │── new WebSocket("wss://127.0.0.1:X") ▶│
   │◀─────────────── onopen ───────────────│  (conexión establecida)
   │                                       │
   │── ws.send("echo=-idsession=X@EOF") ──▶│  (comprueba que está listo)
   │◀─────── onmessage (respuesta eco) ────│
   │                                       │
   │── ws.send(<URL completa de la op>) ──▶│  (envía la operación real)
   │◀──── onmessage (<cert>|<firma>) ──────│  (resultado)
   │                                       │
   │  successCallback(firma, cert)         │
```

La conexión WebSocket **permanece abierta** entre mensajes. Si AutoFirma se cierra antes de responder, `ws.onclose` dispara inmediatamente y `autoscript.js` llama al `errorCallback` con `java.lang.InterruptedException`.

---

### `AppAfirmaJSSocket` (HTTPS sin estado)

```
Browser                                AutoFirma
   │                                       │
   │── afirma://service?ports=X,Y&v=1 ───▶│  (URL scheme, SO lanza la app)
   │                                       │
   │  [espera AUTOFIRMA_LAUNCHING_TIME]    │
   │                                       │
   │── POST https://127.0.0.1:X/afirma    │
   │   body: "echo=-idsession=X@EOF"  ───▶│  (eco por HTTP)
   │◀──── 200 OK, body: Base64("OK") ─────│
   │                                       │
   │  Si URL ≤ URL_MAX_SIZE:               │
   │── POST /afirma                        │
   │   body: "cmd=<URL_B64>idsession=X@EOF"▶│  (operación directa)
   │◀──── 200 OK, body: Base64(<resultado>)│
   │                                       │
   │  Si URL > URL_MAX_SIZE:               │
   │── POST /afirma                        │
   │   body: "fragment=@1@N@<trozo1>@EOF"▶│
   │◀──── Base64("MORE_DATA_NEED") ────────│
   │── POST fragment=@2@N@<trozo2>@EOF ──▶│
   │         ...                           │
   │── POST "firm=idsession=X@EOF"  ──────▶│  (ejecuta la operación)
   │◀──── Base64(<resultado_parte_1>) ─────│
   │── POST "send=@1@N@idsession=X@EOF" ──▶│  (recoge fragmentos de respuesta)
   │◀──── Base64(<resultado_parte_N>) ─────│
   │                                       │
   │  successCallback(firma, cert)         │
```

Cada flecha es una petición HTTP **independiente**. No hay conexión persistente: si AutoFirma cae entre dos peticiones, la siguiente simplemente falla con `status=0` y el cliente reintenta.

---

## 4. Por qué existe `AppAfirmaJSSocket` si ya existe `AppAfirmaWebSocketClient`

`AppAfirmaJSSocket` nació como solución a dos problemas concretos que tenía el WebSocket en su momento:

1. **Firefox 49–60 en entornos VDI**: las conexiones WebSocket a `wss://127.0.0.1` desde páginas HTTPS eran bloqueadas o daban resultados inconsistentes en algunas configuraciones corporativas con proxies SSL.
2. **IE 11**: aunque soporta WebSocket, tiene limitaciones con conexiones locales en ciertos modos de seguridad de zona.

En ambos casos, el navegador sí permitía peticiones HTTPS a `127.0.0.1` (con el certificado autofirmado de AutoFirma aceptado por el usuario), por lo que el modo socket HTTP resultó más fiable.

**Hoy** (2026), Firefox ≥ 61 y Chrome/Edge modernos usan siempre `AppAfirmaWebSocketClient`. `AppAfirmaJSSocket` es un fallback que prácticamente no se activa en navegadores actuales.

---

## 5. Implicación práctica para este proyecto

En `glovalsign-signer`, `initAutoFirma()` llama a `AutoScript.cargarAppAfirma(servletBaseUrl)` sin configurar `forceWSMode`. Por tanto:

- **Usuarios de Chrome/Edge/Firefox ≥ 61 en desktop** → `AppAfirmaWebSocketClient` (conexión directa, sin fragmentación, detección inmediata de cierre).
- **Usuarios de Firefox 49–60 o IE 11** → `AppAfirmaJSSocket` (peticiones HTTP, con posible fragmentación si el PDF es grande).
- **Usuarios de móvil** → `AppAfirmaJSWebService` (servidor intermedio, fuera de este análisis).

El comportamiento desde el punto de vista del código de la SPA (`signPdfWithAutoFirma`) es idéntico en ambos casos: la diferencia es completamente interna a `autoscript.js`.
