/**
 * POST /webhooks/mux
 * 
 * Handles Mux webhook events for video processing.
 */


import { handleMuxWebhook } from '../../services/mux/webhook.service';

export const action = async ({ request }) => {
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
    await handleMuxWebhook(request);
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Mux webhook error:', error?.message, error?.stack);
    return new Response(
      JSON.stringify({
        error: error.message || 'Webhook processing failed',
        received: true,
      }),
      {
        status: error.message?.includes('signature') || error.message?.includes('secret') ? 401 : 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
