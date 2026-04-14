/**
 * Application error with stable code and origin for tracing.
 * Throw this in models/services; routes map it to apiError() and captureRouteError().
 */
export class AppError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'AppError';
        this.code = options.code ?? 'APP_ERROR';
        this.statusCode = options.statusCode ?? 500;
        this.origin = {
            route: options.route ?? 'unknown',
            layer: options.layer ?? 'service',
        };
    }
}