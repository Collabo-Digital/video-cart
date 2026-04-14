export async function traceOperation(_name, _attributes, fn) {
  return await fn(undefined);
}

export async function traceLoader(_routeName, _request, fn) {
  return await fn(undefined);
}

export async function traceAction(_routeName, _request, fn) {
  return await fn(undefined);
}

export async function traceShopifyCall(_operationName, _shop, fn) {
  return await fn(undefined);
}
