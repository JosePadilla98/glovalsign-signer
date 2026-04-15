// @ts-check
import { defineConfig, loadEnv, rspack } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

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
  tools: {
    rspack: {
      plugins: [
        new rspack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        }),
      ],
    },
  },
});
