import { register } from "@shopify/web-pixels-extension";

register(({ analytics, settings }) => {  // ← Add 'settings' parameter here

  console.log('[Video Cart Pixel] Initializing...');
  // console.log('process.env.SHOPIFY_APP_URL glaobla ----->', process.env.SHOPIFY_APP_URL);
  console.log('settings global variable ----->', settings);

  // REQUIRED: Subscribe to at least one event
  analytics.subscribe("page_viewed", (event) => {
    console.log('[Video Cart Pixel] Active on:', event.context.document.location.href);
    // console.log('process.env.SHOPIFY_APP_URL ----->', process.env.SHOPIFY_APP_URL);
  });

  // Your tracking code for add to cart
  // analytics.subscribe("product_added_to_cart", async (event) => {
  //   const cartLine = event.data.cartLine;

  //   // Find tracking data
  //   const encodedTracking = cartLine.attributes?.find(
  //     attr => attr.key === '_tracking'
  //   )?.value;

  //   if (encodedTracking) {
  //     try {
  //       const decoded = atob(encodedTracking);
  //       const trackingData = JSON.parse(decoded);

  //       console.log('[Video Cart Pixel] Product added:', trackingData);

  //       // Get backend URL from settings or use hardcoded fallback
  //       const backendUrl = settings?.backend_url || 'https://your-actual-backend-url.com';

  //       // Send to backend
  //       fetch(`${backendUrl}/api/analytics/add-to-cart`, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({
  //           shop: event.context.document.location.hostname,
  //           event: 'video_add_to_cart',
  //           video_id: trackingData.video_id,
  //           widget_id: trackingData.widget_id,
  //           product_id: cartLine.merchandise.product.id,
  //           variant_id: cartLine.merchandise.id,
  //           timestamp: Date.now()
  //         })
  //       }).catch(err => console.error('[Video Cart Pixel] Send error:', err));

  //     } catch (error) {
  //       console.error('[Video Cart Pixel] Decode error:', error);
  //     }
  //   }
  // });

  analytics.subscribe("checkout_completed", async (event) => {
    const checkout = event.data.checkout;
    console.log('checkout ----->', checkout);

    // FIX: Use 'attributes' instead of 'properties' for line items
    const videoItems = checkout.lineItems
      .map(item => {
        const encodedTracking = item.properties?.find(
          attr => attr.key === '_tracking'
        )?.value;

        if (encodedTracking) {
          try {
            const decoded = atob(encodedTracking);
            const trackingData = JSON.parse(decoded);
            return {
              ...trackingData,
              product_id: item.variant.product.id,
              variant_id: item.variant.id,
              quantity: item.quantity,
              line_total: parseFloat(item.finalLinePrice.amount)
            };
          } catch (e) {
            console.error('[Video Cart Pixel] Decode error:', e);
            return null;
          }
        }
        return null;
      })
      .filter(item => item !== null);

    console.log('videoItems ----->', videoItems);
    // console.log('process.env.SHOPIFY_APP_URL ----->', process.env.SHOPIFY_APP_URL);
    console.log('settings ----->', settings);

    if (videoItems.length > 0) {
      try {
        // Get backend URL from settings or use hardcoded URL
        const backendUrl = settings?.apiBaseUrl || 'https://your-actual-backend-url.com';

        if (!backendUrl || backendUrl === 'https://your-actual-backend-url.com') {
          console.warn('[Video Cart Pixel] Conversion skipped: backend URL not configured.');
          return;
        }

        console.log('[Video Cart Pixel] Conversion:', videoItems);

        const url = `${backendUrl}/api/v1/analytics/conversion`;

        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop: event.context.document.location.hostname,
            order_id: checkout.order?.id,
            order_number: checkout.order?.orderNumber,
            items: videoItems,
            total_revenue: videoItems.reduce((sum, item) => sum + item.line_total, 0),
            timestamp: Date.now()
          }),
        });

        console.log('[Video Cart Pixel] Conversion sent successfully');

      } catch (e) {
        console.error('[Video Cart Pixel] Conversion error:', e);
      }
    }
  });

  console.log('[Video Cart Pixel] Ready');
});