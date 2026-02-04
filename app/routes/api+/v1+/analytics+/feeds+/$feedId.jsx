/**
 * GET /api/v1/analytics/feeds/:feedId
 *
 * Returns aggregated feed analytics and per-video breakdown for a date range.
 * Query: startDate, endDate (ISO date strings). Admin auth required.
 */

import { authenticate } from '../../../../../config/shopify.server';
import { getFeedById } from '../../../../../services/feed/feed.service.server';
import { getFeedAnalytics } from '../../../../../services/analytics/analytics.service.server';

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const loader = async ({ request, params }) => {
  try {
    const { session } = await authenticate.admin(request);
    const { feedId } = params;
    const url = new URL(request.url);
    const startDate = parseDate(url.searchParams.get('startDate'));
    const endDate = parseDate(url.searchParams.get('endDate'));

    if (!feedId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Feed ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await getFeedById(feedId, session.shop);

    const start = startDate || (() => { const d = new Date(); d.setDate(1); return d; })();
    const end = endDate || new Date();
    if (end < start) {
      return new Response(
        JSON.stringify({ success: false, error: 'endDate must be >= startDate' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { feed, videos } = await getFeedAnalytics(feedId, start, end);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          feed: {
            ...feed,
            sales: Number(feed.sales),
          },
          videos: videos.map((v) => ({
            ...v,
            sales: Number(v.sales),
          })),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    if (err.message === 'Feed not found') {
      return new Response(
        JSON.stringify({ success: false, error: 'Feed not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    console.error('Analytics feed loader error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to load analytics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
