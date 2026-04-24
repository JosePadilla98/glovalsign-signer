# Glovalsign Signer (SPA)

SPA React construida con [Rsbuild](https://rsbuild.rs) para gestionar el proceso de firma de documentos PDF con **AutoFirma** (aplicación oficial del Ministerio de Hacienda).

El usuario recibe un enlace por email, visualiza el documento y lo firma con su certificado digital usando AutoFirma. La firma ocurre en el dispositivo del usuario: la clave privada nunca sale de él.

---

## Índice

- [Arquitectura general](#arquitectura-general)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Flujo de uso completo](#flujo-de-uso-completo)
- [Canales de firma](#canales-de-firma)
- [Setup y desarrollo](#setup-y-desarrollo)
- [Probar desde móvil (Cloudflare Tunnel + Tomcat)](#probar-desde-móvil-cloudflare-tunnel--tomcat)
- [Variables de entorno](#variables-de-entorno)
- [Firma trifásica vs firma simple](#firma-trifásica-vs-firma-simple)
- [Referencia de archivos clave](#referencia-de-archivos-clave)

---

## Arquitectura general

```
Usuario (navegador)
  │
  │  /firmar/:token  (enlace del email)
  ▼
┌─────────────────────────────────────────────┐
│  glovalsign-signer  (este repo)             │
│  React + Rsbuild  :3000                     │
│                                             │
│  /api  ──────────────────────────────────►  │──► glovalsign (backend Node.js :4000)
│  /afirma-signature-storage  ─────────────►  │──► Tomcat :8081 (WAR intermedio)
│  /afirma-signature-retriever ────────────►  │──► Tomcat :8081 (WAR intermedio)
│  /afirma-server-triphase-signer ─────────►  │──► Tomcat :8081 (WAR trifásico)
└─────────────────────────────────────────────┘
         │ Cloudflare Tunnel (para pruebas móvil)
         ▼
  Dispositivo móvil
  Android Chrome + AutoFirma App
```

En **escritorio** el proxy a Tomcat no se usa: AutoFirma Desktop se comunica directamente con el navegador vía WebSocket local.

En **móvil** el proxy a Tomcat es necesario porque el navegador no puede abrir WebSockets locales. Los WARs actúan como intermediarios.

---

## Estructura del proyecto

```
glovalsign-signer/
├── public/
│   ├── favicon.png
│   └── vendor/
│       ├── autoscript.js          # Librería oficial AutoFirma (Ministerio). No modificar.
│       └── pdf.worker.min.mjs     # Worker de PDF.js para renderizado de PDFs en canvas.
├── src/
│   ├── index.js                   # Punto de entrada React
│   ├── App.jsx                    # Raíz: lee el token de la URL y renderiza el flujo
│   ├── api/
│   │   └── signing.js             # Cliente HTTP al backend Glovalsign (/api/v1/sign)
│   ├── components/
│   │   ├── Alert.jsx              # Banner de error/aviso reutilizable
│   │   ├── AutofirmaInstallModal.jsx # Modal con instrucciones de instalación de AutoFirma
│   │   ├── Footer.jsx
│   │   ├── Header.jsx
│   │   ├── PdfViewer.jsx          # Visor PDF basado en PDF.js (canvas). Funciona en móvil.
│   │   ├── Spinner.jsx
│   │   └── Steps.jsx              # Indicador de pasos del flujo (Revisar / Firmar)
│   ├── pages/
│   │   ├── SigningFlow.jsx        # Orquestador: carga la solicitud y decide qué paso mostrar
│   │   ├── DocumentViewer.jsx     # Paso 1: muestra PDF + datos del firmante
│   │   ├── AutofirmaSigningStep.jsx # Paso 2: carga autoscript, lanza firma, sube resultado
│   │   ├── SuccessPage.jsx        # Pantalla final tras firma exitosa
│   │   └── ErrorPage.jsx          # Pantalla de error genérica (token inválido, etc.)
│   └── utils/
│       ├── autofirma.js           # Wrapper sobre window.AutoScript (init, sign, helpers)
│       └── router.js              # Extrae el token de la URL (/firmar/:token)
├── .env                           # Variables por defecto (committeadas, sin secretos)
├── .env.local                     # Overrides locales (en .gitignore)
├── rsbuild.config.js              # Config Rsbuild: proxy dev server
└── servlet/                       # Infraestructura Tomcat para el canal móvil (ver abajo)
    ├── build.sh                   # Compila los 3 WARs desde clienteafirma (GitHub)
    ├── docker-compose.yml         # Levanta Tomcat con los 3 WARs
    └── wars/                      # WARs compilados (en .gitignore)
```

---

## Flujo de uso completo

```
1. Glovalsign (backend) genera un token y envía email al firmante
          │
          │  Email: "https://<dominio>/firmar/<token>"
          ▼
2. Firmante abre el enlace en el navegador
          │
          ▼
3. App.jsx  →  getTokenFromUrl()  →  SigningFlow(token)
          │
          ▼
4. SigningFlow llama a GET /api/v1/sign/public/documento/solicitud/:token
   Recibe: { nombreFirmante, nombreDocumento, ... }
          │
          ▼
5. PASO 1 — DocumentViewer
   Muestra datos del firmante y PdfViewer (PDF.js canvas) con el documento
   El PDF se descarga de GET /api/v1/sign/public/documento/ver/:token
          │
          │  Usuario pulsa "Continuar"
          ▼
6. PASO 2 — AutofirmaSigningStep
   a. Carga /vendor/autoscript.js dinámicamente
   b. Llama a initAutoFirma(servletBaseUrl)  →  AutoScript.cargarAppAfirma()
   c. Descarga el PDF del backend como ArrayBuffer → convierte a Base64
   d. Llama a signPdfWithAutoFirma(base64Pdf)  →  AutoScript.sign()
        │  escritorio: AutoFirma Desktop firma vía WebSocket local
        │  móvil:      AutoFirma App firma vía intent:// + WARs intermedios
   e. Recibe el PDF firmado en Base64 → convierte a Uint8Array
   f. POST /api/v1/sign/public/autofirma/firmar/:token  (multipart/form-data)
          │
          ▼
7. SuccessPage — firma completada
```

---

## Canales de firma

### Escritorio (Windows / macOS / Linux)

AutoFirma Desktop expone un servidor WebSocket local en `127.0.0.1:63xxx`. AutoScript se conecta directamente. Los WARs de Tomcat **no intervienen**.

- No requiere `PUBLIC_SERVLET_BASE_URL`
- No requiere Tomcat
- No requiere ngrok

### Móvil (Android / iOS)

AutoFirma App no puede comunicarse por WebSocket con el navegador. El protocolo usa un servidor intermedio:

```
Navegador móvil
  │
  │  POST /afirma-signature-storage/StorageService  (sube PDF cifrado)
  ▼
Tomcat (StorageService WAR)  →  guarda fichero en /tmp/afirma/<id>
  │
  │  Android abre intent://sign?fileid=<id>&rtservlet=<url>...
  ▼
AutoFirma App
  │  descarga PDF (firma simple) o solo el hash (firma trifásica)
  │  firma con el certificado del usuario
  │  sube el PDF firmado a StorageService
  ▼
Navegador móvil (polling)
  │  GET /afirma-signature-retriever/RetrieveService?op=get&id=<id>
  │  cada ~4 segundos hasta recibir el PDF firmado
  ▼
submitSignedDocument() → backend Glovalsign
```

---

## Setup y desarrollo

### Instalar dependencias

```bash
npm install
```

### Arrancar en modo escritorio

```bash
npm run dev
```

El dev server arranca en [http://localhost:3000](http://localhost:3000) (o el siguiente puerto libre).
Las peticiones a `/api` se redirigen al backend según `BACKEND_URL`.

No hace falta Tomcat ni ngrok para probar la firma en escritorio.

### Build de producción

```bash
npm run build
```

Los artefactos se generan en `dist/`. Sirve esa carpeta con nginx y configura el proxy `/api` → backend en el servidor.

### Preview del build

```bash
npm run preview
```

---

## Probar desde móvil (Cloudflare Tunnel + Tomcat)

Para firmar desde un móvil Android/iOS hacen falta tres piezas corriendo a la vez: Tomcat con los WARs, el dev server de React, y un túnel HTTPS público.

### Paso 1 — Compilar los WARs (solo la primera vez)

```bash
./servlet/build.sh
```

Requiere Docker. Clona el repo `ctt-gob-es/clienteafirma` y compila los 3 WARs con Maven. Resultado en `servlet/wars/`.

### Paso 2 — Levantar Tomcat

```bash
cd servlet && docker compose up -d
```

Verifica que los WARs responden:

```bash
curl "http://localhost:8081/afirma-signature-storage/StorageService?op=check"
# Debe devolver texto plano con HTTP 200
```

### Paso 3 — Arrancar el backend

```bash
cd glovalsign && npm run dev
```

### Paso 4 — Abrir el túnel Cloudflare

Desde la raíz del workspace SIGNER:

```bash
./tunnel.sh
```

El script lanza un [Quick Tunnel de Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) apuntando a `localhost:3000`, espera a que aparezca la URL `*.trycloudflare.com` y actualiza automáticamente `PUBLIC_SERVLET_BASE_URL` en este `.env` y `SPA_URL` en `glovalsign/.env`.

> Requiere `cloudflared` instalado: `curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ~/.local/bin/cloudflared && chmod +x ~/.local/bin/cloudflared`

### Paso 5 — Arrancar el dev server

**Después** de que el túnel haya actualizado el `.env`:

```bash
npm run dev
# Debe arrancar en :3000
```

### Paso 6 — Abrir en el móvil

Abre `https://<url-tunel>.trycloudflare.com/firmar/<token>` en Chrome de Android (o Safari en iOS).

> **Por qué HTTPS**: Chrome en Android bloquea los `intent://` (que abren AutoFirma App) desde páginas no HTTPS. Sin un túnel HTTPS o un host real, la firma móvil no funciona.

### Para detener

```bash
# Ctrl+C en el terminal de tunnel.sh
docker compose -f servlet/docker-compose.yml down
# Ctrl+C en los terminales del dev server y del backend
```

> **Nota**: La URL del túnel cambia cada vez que lo relanzas. El script `tunnel.sh` la actualiza automáticamente en ambos `.env`; recuerda reiniciar el dev server y el backend tras relanzarlo.

---

## Variables de entorno

Crea `.env.local` en la raíz del proyecto para sobreescribir los valores de `.env` (ya incluido en `.gitignore`).

| Variable | Ejemplo | Descripción |
|---|---|---|
| `BACKEND_URL` | `http://localhost:4000` | URL del backend Glovalsign. Solo usada por el proxy del dev server. Sin efecto en producción. |
| `AUTOFIRMA_SERVICES_TARGET` | `http://localhost:8081` | URL de Tomcat. El dev server proxifica `/afirma-*` hacia esta URL. Sin efecto en producción. |
| `PUBLIC_SERVLET_BASE_URL` | `https://xxxx.trycloudflare.com` | Origen de los WARs tal como lo ve el navegador. Se pasa a `AutoScript.cargarAppAfirma()`. En producción es el dominio público donde están los WARs. Actualizado automáticamente por `tunnel.sh`. |
| `PUBLIC_TRIPHASE_SIGNING` | `false` | `true` activa firma trifásica (solo hash viaja al móvil). Requiere el WAR `afirma-server-triphase-signer`. Ver sección siguiente. |

> En producción no existe el proxy del dev server. El servidor web (nginx, etc.) debe encargarse de redirigir `/afirma-*` a Tomcat y `/api` al backend.

---

## Firma trifásica vs firma simple

Hay dos modos de firma en móvil, controlados por `PUBLIC_TRIPHASE_SIGNING`:

| | Firma simple (`false`) | Firma trifásica (`true`) |
|---|---|---|
| WARs necesarios | 2 (`storage` + `retriever`) | 3 (+ `triphase-signer`) |
| Qué viaja al móvil | PDF completo | Solo el hash (~100 bytes) |
| PDFs grandes | Lento (2 viajes del PDF por el túnel) | Rápido |
| Complejidad | Menor | Mayor |

### Cómo funciona internamente

**Firma simple** (`PUBLIC_TRIPHASE_SIGNING=false`):
```
SIGN_PARAMS = "format=PAdES"
AutoFirma App descarga el PDF completo, lo firma localmente y lo redeposita.
```

**Firma trifásica** (`PUBLIC_TRIPHASE_SIGNING=true`):
```
SIGN_PARAMS = "format=PAdES\nserverUrl=<PUBLIC_SERVLET_BASE_URL>/afirma-server-triphase-signer/SignatureService"
PRE:  servidor extrae el hash del PDF y lo manda al dispositivo
SIGN: AutoFirma App firma solo el hash (sin necesitar el PDF)
POST: servidor inserta la firma en el documento original
```

---

## Referencia de archivos clave

### `src/utils/autofirma.js`

Wrapper sobre `window.AutoScript`. Funciones exportadas:

- `isAutoScriptLoaded()` — comprueba si autoscript.js está disponible en `window`
- `initAutoFirma(servletBaseUrl)` — llama a `AutoScript.cargarAppAfirma()` con la URL base de los WARs
- `signPdfWithAutoFirma(base64Pdf)` — lanza `AutoScript.sign()` y devuelve una `Promise<string>` con el PDF firmado en Base64
- `isNotInstalledError(err)` — devuelve `true` si el error indica que AutoFirma no está instalado o no responde (usado para mostrar el modal de instalación)
- `arrayBufferToBase64(buffer)` / `base64ToUint8Array(base64)` — helpers de conversión

El modo trifásico se activa automáticamente en este archivo según las vars de entorno `PUBLIC_TRIPHASE_SIGNING` y `PUBLIC_SERVLET_BASE_URL`.

### `src/components/PdfViewer.jsx`

Visor PDF basado en PDF.js canvas. Compatible con móvil (los iframes de PDF no funcionan en Chrome Android). Usa el worker servido localmente desde `public/vendor/pdf.worker.min.mjs` (copiado de `node_modules/pdfjs-dist/build/`).

### `src/api/signing.js`

Cliente HTTP al backend. Endpoints usados:

| Función | Método | Endpoint |
|---|---|---|
| `getSolicitud(token)` | GET | `/api/v1/sign/public/documento/solicitud/:token` |
| `getDocumentViewUrl(token)` | — | `/api/v1/sign/public/documento/ver/:token` (URL directa) |
| `submitSignedDocument(token, bytes)` | POST | `/api/v1/sign/public/autofirma/firmar/:token` |

### `rsbuild.config.js`

Configura el proxy del dev server. Rutas proxificadas:
- `/api` → `BACKEND_URL` (siempre)
- `/afirma-signature-storage`, `/afirma-signature-retriever`, `/afirma-server-triphase-signer` → `AUTOFIRMA_SERVICES_TARGET` (solo si está definida)

### `servlet/build.sh`

Compila los 3 WARs usando Maven en Docker (sin necesitar Maven ni JDK locales). Clona `ctt-gob-es/clienteafirma` en `servlet/.cache/` y copia los WARs resultantes a `servlet/wars/`.

### `servlet/docker-compose.yml`

Levanta Tomcat 9.0 (JDK 11) con los 3 WARs montados como volúmenes read-only. Puerto `8081:8080`. Incluye healthcheck que verifica los 3 endpoints `?op=check`.

---

## Recursos

- [Documentación de Rsbuild](https://rsbuild.rs)
- [AutoFirma — Portal Firma Electrónica](https://firmaelectronica.gob.es/Home/Descargas.html)
- [clienteafirma (GitHub oficial)](https://github.com/ctt-gob-es/clienteafirma)

