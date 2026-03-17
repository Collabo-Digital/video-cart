// app/utils/tracing.js

import * as Sentry from '@sentry/node';

// General purpose — use anywhere
export async function traceOperation(name, attributes, fn) {
    return Sentry.startSpan({ name, attributes }, async (span) => {
        try {
            return await fn(span);
        } catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}

// Specific to Remix loaders
export async function traceLoader(routeName, request, fn) {
    return traceOperation(
        `loader.${routeName}`,
        {
            'http.route': routeName,
            'http.method': request.method,
            'http.url': request.url,
        },
        fn
    );
}

// Specific to Remix actions
export async function traceAction(routeName, request, fn) {
    return traceOperation(
        `action.${routeName}`,
        {
            'http.route': routeName,
            'http.method': request.method,
        },
        fn
    );
}

// Specific to Shopify API calls
export async function traceShopifyCall(operationName, shop, fn) {
    return traceOperation(
        `shopify.${operationName}`,
        {
            'shopify.operation': operationName,
            'shopify.shop': shop,
        },
        fn
    );
}