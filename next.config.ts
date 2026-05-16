import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { env } from "./src/env";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/vacancy", destination: "/vacancies/new", permanent: true },
      { source: "/vacancy/:path*", destination: "/vacancies/new", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: !env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  authToken: env.SENTRY_AUTH_TOKEN,
  org: env.SENTRY_ORG,
  project: env.SENTRY_PROJECT,
});
