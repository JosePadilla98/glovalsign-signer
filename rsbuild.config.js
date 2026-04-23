// @ts-check
import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const { publicVars, rawPublicVars } = loadEnv({ prefixes: ['PUBLIC_'] });
const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

// URL del servidor Tomcat con los WARs del servidor intermedio de AutoFirma.
// Solo necesario para probar la firma desde móvil en local.
// Ejemplo: AUTOFIRMA_SERVICES_TARGET=http://localhost:8081
const autofirmaServicesTarget = process.env.AUTOFIRMA_SERVICES_TARGET;

/** @type {import('@rsbuild/core').ProxyConfig} */
const proxy = {
  '/api': {
    target: backendUrl,
    changeOrigin: true,
  },
};

// Si está configurado el target de los servlets de AutoFirma, proxificar sus rutas
// para que el navegador los vea como same-origin y AutoScript funcione sin CORS.
if (autofirmaServicesTarget) {
  proxy['/afirma-signature-storage'] = {
    target: autofirmaServicesTarget,
    changeOrigin: true,
  };
  proxy['/afirma-signature-retriever'] = {
    target: autofirmaServicesTarget,
    changeOrigin: true,
  };
}

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: 'Glovalsign - Firma de documentos',
    favicon: './public/favicon.png',
    meta: {
      viewport: 'width=device-width, initial-scale=1.0',
      description: 'Plataforma segura de firma digital de documentos',
    },
  },
  output: {
    filename: {
      js: '[name].[contenthash:8].js',
      css: '[name].[contenthash:8].css',
    },
  },
  server: {
    proxy,
  },
});

