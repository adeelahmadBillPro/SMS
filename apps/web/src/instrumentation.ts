import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook — runs once per runtime (nodejs | edge) at boot.
 * Sentry is error-only for P0 (no performance tracing, no session replay yet).
 * No-op when SENTRY_DSN is empty.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const common = {
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0,
    enabled: true,
  } as const;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(common);
    return;
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(common);
    return;
  }
}

// Surface server-side render / route errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
