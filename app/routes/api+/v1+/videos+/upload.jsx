// /**
//  * POST /api/v1/videos/upload
//  * 
//  * Creates a new Mux upload URL for client-side video upload.
//  */


// import { authenticate } from '../../../../config/shopify.server';
// import { createUploadUrl } from '../../../../services/video/upload.service';

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);

//   if (request.method !== 'POST') {
//     return new Response(
//       JSON.stringify({ error: 'Method not allowed' }),
//       {
//         status: 405,
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       }
//     );
//   }

//   try {
//     let body = {};
//     try {
//       body = await request.json().catch(() => ({}));
//     } catch (error) {
//       console.error('Error parsing request body:', error);
//       // Fallback body already set above
//     }
//     const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : null;

//     const uploadData = await createUploadUrl({ fileName: fileName || undefined, shopDomain: session.shop });

//     return new Response(
//       JSON.stringify({
//         success: true,
//         data: uploadData,
//       }),
//       {
//         status: 200,
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       }
//     );
    
//   } catch (error) {
//     console.error('Upload creation error:', error);
//     const status = error.statusCode === 409 ? 409 : 500;
//     const code = error.code || 'UPLOAD_CREATION_FAILED';

//     return new Response(
//       JSON.stringify({
//         success: false,
//         error: error.message,
//         code,
//       }),
//       {
//         status,
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       }
//     );
//   }
// };


import { authenticate } from '../../../../config/shopify.server';
import { createUploadUrl } from '../../../../services/video/upload.service';
import * as ShopModel from '../../../../models/shop.server';
import * as VideoModel from '../../../../models/video.server';
import { VIDEO_CONFIG } from '../../../../lib/constants/video';
import { captureRouteError } from "../../../../lib/utils/observability/errorCapture.server";

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
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
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

    let body = {};
    try {
      body = await request.json().catch(() => ({}));
    } catch (_) {}
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : null;

    // Enforce the size cap server-side, before a Mux upload URL is spent.
    // Note: the size is client-declared (the bytes go browser -> Mux directly,
    // never through us), so this stops honest oversized uploads rather than a
    // determined attacker. Mux-side limits are the backstop for that.
    const fileSize = Number(body?.fileSize);
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return jsonResponse({
        success: false,
        error: 'fileSize is required',
        code: 'FILE_SIZE_REQUIRED',
      }, 400);
    }
    if (fileSize > VIDEO_CONFIG.MAX_SIZE_BYTES) {
      return jsonResponse({
        success: false,
        error: `File size must be less than ${VIDEO_CONFIG.MAX_SIZE_MB}MB`,
        code: 'FILE_TOO_LARGE',
      }, 413);
    }

    const uploadData = await createUploadUrl({ fileName: fileName || undefined, shopDomain: session.shop });

    return jsonResponse({ success: true, data: uploadData, remaining: remaining - 1 });
  } catch (error) {
    console.error('Upload creation error:', error);
    captureRouteError(error, {
      route: "api.v1.videos.upload",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });
    const status = error.statusCode === 409 ? 409 : 500;
    return jsonResponse({
      success: false,
      error: error.message,
      code: error.code || 'UPLOAD_CREATION_FAILED',
    }, status);
  }
};