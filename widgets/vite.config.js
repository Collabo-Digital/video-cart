import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [devtools(), solidPlugin(), cssInjectedByJsPlugin()],
  build: {
    outDir: '../extensions/video-cart/assets',
    emptyOutDir: true,
    target: 'esnext',

    lib: {
      entry: './src/main.jsx',
      name: 'StorefrontWidgets',
      fileName: 'bundle-video-cart',
      formats: ['iife'],
    },

    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'assets/[name][extname]',
      },
    },

    minify: 'terser',
    terserOptions: {
      compress: {
        // drop_console: true,
        // drop_debugger: true,
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
    },

    reportCompressedSize: true,
    chunkSizeWarningLimit: 50,
  },

  server: {
    port: 3000,
    open: '/index.html',
  },
});
