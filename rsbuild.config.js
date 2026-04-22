// @ts-check
import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const { publicVars, rawPublicVars } = loadEnv({ prefixes: ['PUBLIC_'] });
const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

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
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});

