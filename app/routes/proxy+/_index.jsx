/**
 * App Proxy Root Handler
 * URL: /proxy (proxied from /apps/video-widget)
 */

import { authenticate } from "../../config/shopify.server";

export const loader = async ({ request }) => {
  try {
    const { liquid } = await authenticate.public.appProxy(request);
    
    // Return a simple response to verify proxy is working
    return liquid(`
      <div style="padding: 20px; background: #f0f0f0; border-radius: 8px;">
        <h3>Video Cart App Proxy is Active</h3>
        <p>Shop: {{ shop.name }}</p>
        <p>Domain: {{ shop.permanent_domain }}</p>
      </div>
    `);
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response("Proxy Error: " + error.message, { status: 500 });
  }
};