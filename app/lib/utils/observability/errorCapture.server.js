import * as Sentry from "@sentry/node";

export function captureAppError(error, context = {}) {
  Sentry.withScope((scope) => {
    scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export function captureRouteError(
  error,
  { route, shop, userId, url, method, extras = {} } = {},
) {
  Sentry.withScope((scope) => {
    if (route) scope.setTag("route", route);
    if (shop) scope.setTag("shopify.shop", shop);
    if (userId) scope.setUser({ id: userId });
    if (url) scope.setExtra("url", url);
    if (method) scope.setExtra("method", method);

    if (error?.code) scope.setTag("error.code", error.code);
    if (error?.statusCode) {
      scope.setTag("error.status_code", String(error.statusCode));
    }

    for (const [key, value] of Object.entries(extras)) {
      scope.setExtra(key, value);
    }

    Sentry.captureException(error);
  });
}

export function captureAppEvent(message, level = "info", context = {}) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    scope.setExtras(context);
    Sentry.captureMessage(message);
  });
}

export function captureUnhandledError(error, { request } = {}) {
  Sentry.withScope((scope) => {
    if (request) {
      scope.setExtra("url", request.url);
      scope.setExtra("method", request.method);
    }
    scope.setLevel("fatal");
    Sentry.captureException(error);
  });
}
