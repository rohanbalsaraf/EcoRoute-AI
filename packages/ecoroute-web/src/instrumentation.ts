import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (DSN && DSN.startsWith("http")) {
      Sentry.init({
        dsn: DSN,
        tracesSampleRate: 1.0,
        debug: false,
      });
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    if (DSN && DSN.startsWith("http")) {
      Sentry.init({
        dsn: DSN,
        tracesSampleRate: 1.0,
        debug: false,
      });
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
