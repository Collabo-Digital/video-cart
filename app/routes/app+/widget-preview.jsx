import fs from "fs";
import path from "path";
import { generatePreviewHTML } from "../../lib/utils/previewTemplate";

/**
 * Widget Preview Route
 * Serves the preview iframe with the widget bundle injected
 */
/**
 * widgets/vite.config.js:9 writes the bundle to extensions/video-cart/assets —
 * that is the only thing `cd widgets && npm run build` produces. public/widgets
 * was a hand-placed copy that nothing has refreshed since April, so this preview
 * was rendering a five-month-old widget while the storefront ran a current one.
 * Read the real build output.
 *
 * Relative segments, so path.resolve anchors this to the process working dir —
 * same as the line it replaces. Safe in production: the Dockerfile does
 * `COPY . .` with WORKDIR /app, .dockerignore excludes only
 * .cache/build/node_modules, and the extension asset is git-tracked, so it is
 * always on disk.
 */
const BUNDLE_PATH = path.resolve(
  "extensions", "video-cart", "assets", "bundle-video-cart.iife.js",
);

export const loader = async () => {

  let widgetScript = "";
  try {
    widgetScript = fs.readFileSync(BUNDLE_PATH, "utf-8");
  } catch (error) {
    console.error(`Widget bundle not found at ${BUNDLE_PATH}:`, error);
    widgetScript = "console.error('Widget bundle not found. Run: cd widgets && npm run build');";
  }

  // Generate HTML with injected widget
  const html = generatePreviewHTML(widgetScript);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
