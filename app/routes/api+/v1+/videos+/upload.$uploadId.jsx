/**
 * GET /api/v1/videos/upload/:uploadId
 * 
 * Returns upload status for a given upload ID.
 */


import { authenticate } from '../../../../config/shopify.server';
import { getUploadStatus } from '../../../../services/video/upload.service';
import { captureRouteError } from "~/lib/utils/observability/errorCapture";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);

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
    const uploadData = await getUploadStatus(uploadId, session.shop);

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
    captureRouteError(error, {
      route: "api.v1.videos.upload.$uploadId",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: 'UPLOAD_STATUS_FAILED',
      }),
      {
        // Ownership failures surface as 404, not 500.
        status: error.statusCode ?? 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
