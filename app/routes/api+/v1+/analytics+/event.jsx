/**
 * POST /api/v1/analytics/event
 *
 * Record an analytics event (impression, view, click, purchase).
 * Callable from storefront widget; optional shop param validates feed belongs to shop.
 */

import { recordEvent, EVENT_TYPES } from '../../../../services/analytics/analytics.service.server';
import { getFeedById } from '../../../../services/feed/feed.service.server';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { feedId, videoId, eventType, watchTimeSeconds, salesAmount, revenueAmount, orderCount, shop } = body;

    if (!feedId || !eventType) {
      return new Response(
        JSON.stringify({ success: false, error: 'feedId and eventType are required' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
      return new Response(
        JSON.stringify({ success: false, error: `eventType must be one of: ${Object.values(EVENT_TYPES).join(', ')}` }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (shop) {
      try {
        await getFeedById(feedId, shop);
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Feed not found or access denied' }),
          { status: 404, headers: JSON_HEADERS }
        );
      }
    }

    await recordEvent({
      feedId,
      videoId: videoId || undefined,
      eventType,
      watchTimeSeconds: watchTimeSeconds ?? 0,
      salesAmount: salesAmount ?? 0,
      revenueAmount: revenueAmount ?? 0,
      orderCount: orderCount ?? 1,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error('Analytics event error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to record event' }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
