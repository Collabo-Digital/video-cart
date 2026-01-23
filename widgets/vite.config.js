import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [devtools(), solidPlugin()],
  build: {
    outDir: '../public/widgets',
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
