import * as Sentry from "@sentry/node";

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

export async function traceLoader(routeName, request, fn) {
  return traceOperation(
    `loader.${routeName}`,
    {
      "http.route": routeName,
      "http.method": request.method,
      "http.url": request.url,
    },
    fn,
  );
}

export async function traceAction(routeName, request, fn) {
  return traceOperation(
    `action.${routeName}`,
    {
      "http.route": routeName,
      "http.method": request.method,
    },
    fn,
  );
}

export async function traceShopifyCall(operationName, shop, fn) {
  return traceOperation(
    `shopify.${operationName}`,
    {
      "shopify.operation": operationName,
      "shopify.shop": shop,
    },
    fn,
  );
}
