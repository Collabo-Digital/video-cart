// instrumentation.server.js
process.loadEnvFile('.env');
import * as Sentry from '@sentry/node';
import { PrismaInstrumentation } from '@prisma/instrumentation';

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Performance tracing — 1.0 = capture 100% of transactions
    // Lower this in production (e.g. 0.2 = 20%)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Sentry handles OTel internally — add Prisma on top
    openTelemetryInstrumentations: [
        new PrismaInstrumentation(),
    ],

    // Integrations Sentry auto-enables for Node:
    // http, express, mongodb, fetch — all covered out of the box
    integrations: [
        Sentry.httpIntegration(),
        Sentry.mongoIntegration(),
    ],
});