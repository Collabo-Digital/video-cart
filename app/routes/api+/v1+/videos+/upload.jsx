/**
 * POST /api/v1/videos/upload
 * 
 * Creates a new Mux upload URL for client-side video upload.
 */


import { authenticate } from '../../../../config/shopify.server';
import { createUploadUrl } from '../../../../services/video/upload.service';

export const action = async ({ request }) => {
  await authenticate.admin(request);

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
    const uploadData = await createUploadUrl();
    
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
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: 'UPLOAD_CREATION_FAILED',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
