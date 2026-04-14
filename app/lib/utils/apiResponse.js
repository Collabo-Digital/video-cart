/**
 * Standard API response helpers.
 * Use for all /api/* routes so payload shape and error origin are consistent.
 */

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};

/**
 * Success response
 * @param {unknown} data - Response body
 * @param {{ route?: string, requestId?: string, status?: number }} options
 */
export function apiSuccess(data, options = {}) {
    const { route, requestId, status = 200 } = options;
    const body = {
        success: true,
        data,
        ...(route || requestId ? { meta: { route, requestId } } : {}),
    };
    return new Response(JSON.stringify(body), {
        status,
        headers: DEFAULT_HEADERS,
    });
}

/**
 * Error response — always include origin so you know where it came from
 * @param {string|Error} error - Message or Error instance
 * @param {{ route: string, layer?: string, code?: string, statusCode?: number, requestId?: string }} options
 */
export function apiError(error, options = {}) {
    const {
        route = 'unknown',
        layer = 'route',
        code = 'UNKNOWN_ERROR',
        statusCode = 500,
        requestId,
    } = options;

    const message = typeof error === 'string' ? error : (error?.message || 'An error occurred');
    const body = {
        success: false,
        error: message,
        code,
        origin: { route, layer },
        statusCode,
        ...(requestId ? { requestId } : {}),
    };

    return new Response(JSON.stringify(body), {
        status: statusCode,
        headers: DEFAULT_HEADERS,
    });
}