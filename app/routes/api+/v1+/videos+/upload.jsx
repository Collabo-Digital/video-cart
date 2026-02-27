/**
 * POST /api/v1/videos/upload
 * 
 * Creates a new Mux upload URL for client-side video upload.
 */


import { authenticate } from '../../../../config/shopify.server';
import { createUploadUrl } from '../../../../services/video/upload.service';

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    let body = {};
    try {
      body = await request.json().catch(() => ({}));
    } catch (error) {
      console.error('Error parsing request body:', error);
      // Fallback body already set above
    }
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : null;

    const uploadData = await createUploadUrl({ fileName: fileName || undefined, shopDomain: session.shop });

    return new Response(
      JSON.stringify({
        success: true,
        data: uploadData,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
  } catch (error) {
    console.error('Upload creation error:', error);
    const status = error.statusCode === 409 ? 409 : 500;
    const code = error.code || 'UPLOAD_CREATION_FAILED';

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code,
      }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
