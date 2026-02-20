/**
 * GET /api/v1/videos/list
 *
 * Lists videos with pagination. Returns video id, video name, video upload id,
 * and associated widgets (id, widgetId, name).
 * Query params: page (default 1), perPage (default 20, max 100), search (optional, filter by name).
 */

import { authenticate } from '../../../../config/shopify.server';
import * as VideoModel from '../../../../models/video.server';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    if (!session) {
      return jsonResponse(
        { success: false, error: 'Unauthorized' },
        401
      );
    }
  } catch (err) {
    return jsonResponse(
      { success: false, error: 'Unauthorized' },
      401
    );
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? String(DEFAULT_PAGE), 10));
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, parseInt(url.searchParams.get('perPage') ?? String(DEFAULT_PER_PAGE), 10))
  );
  const search = url.searchParams.get('search') ?? '';

  const { videos, total } = await VideoModel.findAllPaginatedWithWidgets({
    page,
    perPage,
    search,
    shopDomain: session.shop,
  });

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return jsonResponse({
    success: true,
    data: {
      videos,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    },
  });
};
