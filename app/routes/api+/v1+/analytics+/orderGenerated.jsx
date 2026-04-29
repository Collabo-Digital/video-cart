import { authenticate } from "../../../../config/shopify.server.js";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  // Allow the Shopify storefront / checkout origin
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle CORS preflight and accidental GETs
export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: JSON_HEADERS,
    });
  }

  // For GET or other methods, just return empty 204 with CORS headers
  return new Response(null, {
    status: 204,
    headers: JSON_HEADERS,
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: JSON_HEADERS });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (!session.shop) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: JSON_HEADERS });
    }

    const order = body?.order || null;
    console.log('order ----->', order);

    
    return Response.json(
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    if (err.message === "Feed not found") {
      return Response.json(
        { success: false, error: "Feed not found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }
    console.error("Conversion API error:", err);
    return Response.json(
      { success: false, error: err.message || "Failed to record conversion" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
