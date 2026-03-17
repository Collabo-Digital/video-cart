// app/utils/errorCapture.js

import * as Sentry from '@sentry/node';

// Capture any application error with extra context
export function captureAppError(error, context = {}) {
    Sentry.withScope((scope) => {
        scope.setExtras(context);
        Sentry.captureException(error);
    });
}

// Capture errors thrown inside Remix loaders/actions
// Proposed signature
export function captureRouteError(error, {
    route,
    shop,
    userId,
    url,
    method,
    extras = {},
} = {}) {

    Sentry.withScope((scope) => {
        if (route) scope.setTag('route', route);
        if (shop) scope.setTag('shopify.shop', shop);
        if (userId) scope.setUser({ id: userId });
        if (url) scope.setExtra('url', url);
        if (method) scope.setExtra('method', method);

        if (error?.code) scope.setTag('error.code', error.code);
        if (error?.statusCode) scope.setTag('error.status_code', String(error.statusCode));

        Object.entries(extras).forEach(([key, value]) => {
            scope.setExtra(key, value);
        });

        Sentry.captureException(error);
    });
}

// Log an intentional non-error event (e.g. a warning or audit log)
export function captureAppEvent(message, level = 'info', context = {}) {
    Sentry.withScope((scope) => {
        scope.setLevel(level);
        scope.setExtras(context);
        Sentry.captureMessage(message);
    });
}

// Top-level unhandled error boundary (use in entry.server.jsx)
export function captureUnhandledError(error, { request } = {}) {
    Sentry.withScope((scope) => {
        if (request) {
            scope.setExtra('url', request.url);
            scope.setExtra('method', request.method);
        }
        scope.setLevel('fatal');
        Sentry.captureException(error);
    });
}