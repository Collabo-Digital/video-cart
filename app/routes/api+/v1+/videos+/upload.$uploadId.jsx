/**
 * GET /api/v1/videos/upload/:uploadId
 * 
 * Returns upload status for a given upload ID.
 */


import { authenticate } from '../../../../config/shopify.server';
import { getUploadStatus } from '../../../../services/video/upload.service';

export const loader = async ({ request, params }) => {
  await authenticate.admin(request);

  const { uploadId } = params;

  if (!uploadId) {
    return new Response(
      JSON.stringify({ error: 'Upload ID is required' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    const uploadData = await getUploadStatus(uploadId);

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
    console.error('Upload status error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: 'UPLOAD_STATUS_FAILED',
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
