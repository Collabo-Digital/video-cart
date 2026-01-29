/**
 * POST /api/v1/videos/resolve-social
 *
 * Resolve an Instagram/TikTok post URL into preview + direct URL (no Mux import). Thin route.
 */

import { authenticate } from '../../../../config/shopify.server';
import { resolveSocialUrl } from '../../../../services/video/social-import.service';

const VALID_SOURCES = ['instagram', 'tiktok'];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const action = async ({ request }) => {
  await authenticate.admin(request);

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { source, url } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return jsonResponse(
        { success: false, error: 'URL is required', code: 'INVALID_INPUT' },
        400
      );
    }
    const normalizedSource = source === 'tiktok' ? 'tiktok' : 'instagram';
    if (!VALID_SOURCES.includes(normalizedSource)) {
      return jsonResponse(
        { success: false, error: 'Source must be instagram or tiktok', code: 'INVALID_INPUT' },
        400
      );
    }

    const data = await resolveSocialUrl({ source: normalizedSource, url: url.trim() });
    return jsonResponse({ success: true, data });
  } catch (error) {
    console.error('Resolve social error:', error);
    return jsonResponse(
      {
        success: false,
        error: error.message || 'Resolve failed',
        code: error.code || 'RESOLVE_FAILED',
      },
      error.statusCode || 400
    );
  }
};

