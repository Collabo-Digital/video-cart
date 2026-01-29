/**
 * POST /api/v1/videos/import-social
 *
 * Import an Instagram/TikTok post URL into Mux. Validates input, delegates to service.
 */

import { authenticate } from '../../../../config/shopify.server';
import { importSocialVideo } from '../../../../services/video/social-import.service';

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

    const data = await importSocialVideo({ source: normalizedSource, url: url.trim() });
    return jsonResponse({ success: true, data });
  } catch (error) {
    console.error('Import social error:', error);
    return jsonResponse(
      {
        success: false,
        error: error.message || 'Import failed',
        code: error.code || 'IMPORT_FAILED',
      },
      error.statusCode || 500
    );
  }
};

