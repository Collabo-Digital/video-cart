import fs from "fs";
import path from "path";
import { generatePreviewHTML } from "../../lib/utils/previewTemplate";

/**
 * Widget Preview Route
 * Serves the preview iframe with the widget bundle injected
 */
export const loader = async () => {

  let widgetScript = "";
  try {
    const widgetPath = path.resolve("public", "widgets", "bundle-video-cart.iife.js");
    widgetScript = fs.readFileSync(widgetPath, "utf-8");
  } catch (error) {
    console.error("Widget bundle not found:", error);
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
