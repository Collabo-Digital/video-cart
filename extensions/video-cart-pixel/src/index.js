import { register } from "@shopify/web-pixels-extension";

register(({ analytics, browser, settings }) => {  // ← Add 'settings' parameter here

  console.log('[Video Cart Pixel] Initializing...');
  // console.log('process.env.SHOPIFY_APP_URL glaobla ----->', process.env.SHOPIFY_APP_URL);
  console.log('settings global variable ----->', settings);
  console.log('https://johnny-cottages-advance-bookmark.trycloudflare.com/ ----->');

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


  analytics.subscribe("checkout_completed", (event) => {
    const checkout = event.data.checkout;
    // const backendUrl = settings?.apiBaseUrl || 'https://video-cart.vercel.app';
    const backendUrl = 'https://hypothetical-mineral-example-thou.trycloudflare.com';

    console.log('checkout ----->', checkout);

    Promise.all([
      browser.localStorage.getItem('vdcrt_atc_products'),
    ]).then(([storedData]) => {
      if (!storedData) return;

      const atcProducts = JSON.parse(storedData);
      if (!atcProducts || atcProducts.length === 0) return;

      const videoItems = checkout.lineItems
        .map(item => {
          const productId = item.variant?.product?.id;
          const matched = atcProducts.find(
            (atc) => String(atc.product_id) === String(productId)
          );

          if (matched) {
            return {
              video_id: matched.video_id,
              widget_id: matched.widget_id,
              source: matched.source,
              quantity: matched.quantity || item.quantity,
              product_id: productId,
              variant_id: item.variant?.id,
              line_total: parseFloat(item.finalLinePrice.amount),
            };
          }
          return null;
        })
        .filter(Boolean);

      if (videoItems.length === 0) return;


      if (!backendUrl) return;

      fetch(`${backendUrl}/api/v1/analytics/conversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: event.context.document.location.hostname,
          order_id: checkout.order?.id,
          order_number: checkout.order?.orderNumber,
          currency: checkout.currencyCode,
          items: videoItems,
          total_revenue: videoItems.reduce((sum, item) => sum + item.line_total, 0),
          timestamp: Date.now(),
        }),
        keepalive: true,
      })
        .then(() => {
          console.log('[Video Cart Pixel] Conversion sent successfully');
        })
        .catch((e) => {
          console.error('[Video Cart Pixel] Conversion error:', e);
        })
        .finally(async () => {
          // Selective cleanup: drop entries for products in THIS order (they
          // served their purpose) and entries older than the attribution
          // window; keep the rest so a later purchase still attributes.
          try {
            const raw = await browser.localStorage.getItem('vdcrt_atc_products');
            const all = raw ? JSON.parse(raw) : [];
            const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
            const orderedIds = new Set(videoItems.map((i) => String(i.product_id)));
            const keep = all.filter(
              (a) => !orderedIds.has(String(a.product_id)) && Date.now() - (a.timestamp || 0) < THIRTY_DAYS
            );
            if (keep.length) {
              await browser.localStorage.setItem('vdcrt_atc_products', JSON.stringify(keep));
            } else {
              await browser.localStorage.removeItem('vdcrt_atc_products');
            }
          } catch {
            // best effort — worst case behaves like the old full wipe did
          }
        });
    });

  });

  console.log('[Video Cart Pixel] Ready');
});