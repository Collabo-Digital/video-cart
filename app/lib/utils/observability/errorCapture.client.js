export function captureAppError(_error, _context = {}) {}

export function captureRouteError(
  _error,
  { route: _route, shop: _shop, userId: _userId, url: _url, method: _method, extras: _extras } = {},
) {}

export function captureAppEvent(_message, _level = "info", _context = {}) {}

export function captureUnhandledError(_error, { request: _request } = {}) {}
