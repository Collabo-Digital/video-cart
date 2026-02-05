// const CART_ADD_PATH = 'cart/add.js';

import { encodeTrackingData } from "./encryption";

// /** Line item property keys sent to Shopify (visible in cart/order). */
// export const CART_ITEM_ATTRIBUTES = {
//     WIDGET_ID: '_widget_id',  // Hidden from customer view
//     VIDEO_ID: '_video_id',    // Hidden from customer view
// };
// /**
//  * Add one or more line items to the Shopify cart via the Cart Ajax API.
//  * Must run on the storefront (window.Shopify.routes.root available).
//  *
//  * @param {Array<{ id: number, quantity: number, properties?: Record<string, string> }>} items - Variant id, quantity, and optional line item properties per line
//  * @returns {Promise<object>} - Resolves with the JSON response from /cart/add.js
//  */
// export function addToCart(items) {
//     const root = typeof window !== 'undefined' && window.Shopify?.routes?.root;
//     if (!root) {
//         return Promise.reject(new Error('Shopify cart API is not available (missing window.Shopify.routes.root).'));
//     }

//     const formData = {
//         items: items.map(({ id, quantity, properties = {} }) => {
//             const item = { id: Number(id), quantity: Number(quantity) || 1 };
//             const stringProps = Object.fromEntries(
//                 Object.entries(properties).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
//             );
//             if (Object.keys(stringProps).length) item.properties = stringProps;
//             return item;
//         }),
//     };

//     console.log("addToCart formData ----->", formData);

//     return fetch(root + CART_ADD_PATH, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//     })
//         .then((response) => response.json())
//         .then((data) => {
//             if (data.status && data.status !== 200) {
//                 return Promise.reject(new Error(data.description || 'Cart add failed'));
//             }
//             return data;
//         })
//         .catch((error) => {
//             console.error('Shopify addToCart error:', error);
//             throw error;
//         });
// }

// utils/cart.js

const CART_ADD_PATH = 'cart/add.js';

/** Line item property keys sent to Shopify */
export const CART_ITEM_ATTRIBUTES = {
    TRACKING: '_tracking',  // Hidden from customer view, contains encoded JSON
};

/**
 * Add one or more line items to the Shopify cart via the Cart Ajax API.
 * Automatically encodes tracking properties into _tracking attribute.
 *
 * @param {Array<{ id: number, quantity: number, properties?: Record<string, any> }>} items
 * @returns {Promise<object>}
 */
export function addToCart(items) {
    const root = typeof window !== 'undefined' && window.Shopify?.routes?.root;
    if (!root) {
        return Promise.reject(new Error('Shopify cart API is not available (missing window.Shopify.routes.root).'));
    }

    const formData = {
        items: items.map(({ id, quantity, properties = {} }) => {
            const item = { id: Number(id), quantity: Number(quantity) || 1 };

            // Extract tracking-related properties
            const { _video_id, _widget_id, timestamp, source, ...otherProps } = properties;

            console.log("properties ----->", properties);

            // Build final properties object
            const finalProperties = {};

            // If tracking data exists, encode it
            if (_video_id || _widget_id) {
                const trackingData = {
                    video_id: _video_id,
                    widget_id: _widget_id,
                    timestamp: timestamp || Date.now(),
                    source: source || 'shoppable_video'
                };

                const encodedTracking = encodeTrackingData(trackingData);

                if (encodedTracking) {
                    finalProperties[CART_ITEM_ATTRIBUTES.TRACKING] = encodedTracking;
                } else {
                    console.warn('Failed to encode tracking data');
                }
            }

            // Add any other non-tracking properties as strings
            Object.entries(otherProps).forEach(([key, value]) => {
                if (value != null) {
                    finalProperties[key] = String(value);
                }
            });

            // Only add properties if we have any
            if (Object.keys(finalProperties).length > 0) {
                item.properties = finalProperties;
            }

            return item;
        }),
    };

    console.log("addToCart formData ----->", formData);

    return fetch(root + CART_ADD_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.status && data.status !== 200) {
                return Promise.reject(new Error(data.description || 'Cart add failed'));
            }
            return data;
        })
        .catch((error) => {
            console.error('Shopify addToCart error:', error);
            throw error;
        });
}