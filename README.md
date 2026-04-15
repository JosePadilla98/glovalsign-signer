# Glovalsign Signer (SPA)

SPA React construida con [Rsbuild](https://rsbuild.rs) para gestionar el proceso de firma de documentos con certificado digital (P12/PFX) directamente en el navegador.

El usuario accede a esta aplicación mediante un enlace recibido por email. Visualiza el documento, adjunta su certificado digital, firma el PDF en el navegador y lo envía al backend sin que la clave privada salga del dispositivo.

## Setup

```bash
npm install
```

## Arrancar en desarrollo

```bash
npm run dev
```

El dev server arrancará en [http://localhost:3001](http://localhost:3001) (o el siguiente puerto libre si el 3001 está ocupado).

Las peticiones a `/api` son redirigidas automáticamente al backend según la variable `BACKEND_URL`.

## Build de producción

```bash
npm run build
```

Los artefactos se generan en `dist/`. Sirve esa carpeta con cualquier servidor web estático (nginx, etc.) y configura el proxy `/api` → backend en el servidor.

## Preview del build

```bash
npm run preview
```

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto (ya incluido en `.gitignore`):

| Variable                   | Ejemplo de valor        | Descripción                                                                                                                    |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `BACKEND_URL`              | `http://localhost:3000` | URL del backend Glovalsign. Solo usada en desarrollo por el proxy del dev server.                                              |
| `PUBLIC_SIGNATURE_LENGTH`  | `32768`                 | Tamaño del placeholder de firma PKCS#7 en bytes. Aumentar si aparece *"Signature exceeds placeholder length"*. Por defecto: `32768` (32 KB). |

> **Nota:** En producción no existe proxy. El servidor web (nginx, etc.) debe encargarse de redirigir `/api` al backend.

## Flujo de uso

1. El firmante recibe un email con un enlace del tipo `https://<SPA_URL>/firmar/<token>`.
2. La SPA valida el token contra el backend y muestra los metadatos del documento.
3. El firmante visualiza el PDF en el paso 1.
4. En el paso 2, adjunta su certificado P12/PFX, introduce la contraseña y firma el PDF en el navegador.
5. El PDF firmado se envía al backend (`POST /api/v1/sign/public/certificado-digital/firmar-spa/:token`).
6. Se muestra la página de éxito y el backend envía el email de confirmación.

## Recursos

- [Documentación de Rsbuild](https://rsbuild.rs)

