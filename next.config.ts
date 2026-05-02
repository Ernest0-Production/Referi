import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { env } from "./src/env";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: !env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  authToken: env.SENTRY_AUTH_TOKEN,
  org: env.SENTRY_ORG,
  project: env.SENTRY_PROJECT,
});
