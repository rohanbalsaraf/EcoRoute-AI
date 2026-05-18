import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN && DSN.startsWith("http")) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 1.0,
    debug: false,
  });
}
