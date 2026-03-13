// /**
//  * POST /api/v1/videos/import-social
//  *
//  * Import an Instagram/TikTok post URL into Mux. Validates input, delegates to service.
//  */

// import { authenticate } from '../../../../config/shopify.server';
// import { importSocialVideo } from '../../../../services/video/social-import.service';

// const VALID_SOURCES = ['instagram', 'tiktok'];

// function jsonResponse(body, status = 200) {
//   return new Response(JSON.stringify(body), {
//     status,
//     headers: { 'Content-Type': 'application/json' },
//   });
// }

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);

//   if (request.method !== 'POST') {
//     return jsonResponse({ error: 'Method not allowed' }, 405);
//   }

//   try {
//     const body = await request.json().catch(() => ({}));
//     const { source, url } = body;

//     if (!url || typeof url !== 'string' || !url.trim()) {
//       return jsonResponse(
//         { success: false, error: 'URL is required', code: 'INVALID_INPUT' },
//         400
//       );
//     }
//     const normalizedSource = source === 'tiktok' ? 'tiktok' : 'instagram';
//     if (!VALID_SOURCES.includes(normalizedSource)) {
//       return jsonResponse(
//         { success: false, error: 'Source must be instagram or tiktok', code: 'INVALID_INPUT' },
//         400
//       );
//     }

//     const data = await importSocialVideo({ source: normalizedSource, url: url.trim(), shopDomain: session.shop });
//     return jsonResponse({ success: true, data });
//   } catch (error) {
//     console.error('Import social error:', error);
//     return jsonResponse(
//       {
//         success: false,
//         error: error.message || 'Import failed',
//         code: error.code || 'IMPORT_FAILED',
//       },
//       error.statusCode || 500
//     );
//   }
// };


import { authenticate } from '../../../../config/shopify.server';
import { importSocialVideo } from '../../../../services/video/social-import.service';
import * as ShopModel from '../../../../models/shop.server';
import * as VideoModel from '../../../../models/video.server';

const VALID_SOURCES = ['instagram', 'tiktok'];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { source, url } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return jsonResponse(
        { success: false, error: 'URL is required', code: 'INVALID_INPUT' },
        400,
      );
    }
    const normalizedSource = source === 'tiktok' ? 'tiktok' : 'instagram';
    if (!VALID_SOURCES.includes(normalizedSource)) {
      return jsonResponse(
        { success: false, error: 'Source must be instagram or tiktok', code: 'INVALID_INPUT' },
        400,
      );
    }

    const shopData = await ShopModel.findByDomain(session.shop);
    const uploadLimit = shopData?.planLimits?.videoUploadLimit ?? 0;
    const currentCount = await VideoModel.count(session.shop);
    const remaining = Math.max(0, uploadLimit - currentCount);

    if (remaining <= 0) {
      return jsonResponse({
        success: false,
        error: 'You have reached your video upload limit. Please upgrade your plan.',
        code: 'UPLOAD_LIMIT_REACHED',
        remaining: 0,
      }, 403);
    }

    const data = await importSocialVideo({ source: normalizedSource, url: url.trim(), shopDomain: session.shop });
    return jsonResponse({ success: true, data, remaining: remaining - 1 });
  } catch (error) {
    console.error('Import social error:', error);
    return jsonResponse({
      success: false,
      error: error.message || 'Import failed',
      code: error.code || 'IMPORT_FAILED',
    }, error.statusCode || 500);
  }
};