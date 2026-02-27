import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteCompression from 'vite-plugin-compression';
import purgecss from 'vite-plugin-purgecss';


// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the Vite server.
// The CLI will eventually stop passing in HOST,
// so we can remove this workaround after the next major release.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost")
  .hostname;
let hmrConfig;

if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT) || 8002,
    clientPort: 443,
  };
}

export default defineConfig({
  server: {
    allowedHosts: [host],
    cors: {
      preflightContinue: true,
    },
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      // See https://vitejs.dev/config/server-options.html#server-fs-allow for more information
      allow: ["app", "node_modules"],
    },
  },
  plugins: [reactRouter(), tsconfigPaths(), purgecss({
    content: [
      './app/**/*.{js,jsx,ts,tsx}',
      './app/**/*.html',
    ],
    safelist: {
      // Safelist Polaris classes - they use dynamic class names
      standard: [
        /^Polaris/,
        /^p[0-9]/,
        /^m[0-9]/,
        /^w[0-9]/,
        /^h[0-9]/,
        /^flex/,
        /^grid/,
        /^hidden/,
        /^block/,
        /^inline/,
        /^relative/,
        /^absolute/,
        /^fixed/,
        /^sticky/,
        /^z-[0-9]/,
        /^opacity-/,
        /^bg-/,
        /^text-/,
        /^border-/,
        /^rounded-/,
        /^shadow-/,
        /^hover:/,
        /^focus:/,
        /^active:/,
        /^transition/,
        /^transform/,
        /^scale-/,
        /^rotate-/,
        /^translate-/,
      ],
      // Keep all classes that contain these patterns (Polaris uses data attributes)
      deep: [/\[data-polaris/],
      // Keep all keyframes
      greedy: [/^@keyframes/, /^@media/],
    },
    // Fonts and other assets
    fontFace: true,
    keyframes: true,
  }), viteCompression({ algorithm: 'brotliCompress' })],
  build: {
    assetsInlineLimit: 0,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_debugger: true,
        dead_code: true,
        unused: true,
        passes: 3,
      },
    },
    rollupOptions: {
      output: {
        // Organize assets by type
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash].[ext]`
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash].[ext]`
          }
          return `assets/[name]-[hash].[ext]`
        }
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  },
  optimizeDeps: {
    include: ["@shopify/app-bridge-react"],
    exclude: ["@shopify/polaris-viz", "@shopify/polaris-viz-core"],
  },
  ssr: {
    noExternal: [],
    external: ["@shopify/polaris-viz", "@shopify/polaris-viz-core"],
  },
});
