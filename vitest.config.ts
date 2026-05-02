import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const vitestEnv = {
  DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
  REDIS_URL: "redis://127.0.0.1:6379",
  NEXTAUTH_SECRET: "0123456789abcdef0123456789abcdef",
  NEXTAUTH_URL: "http://localhost:3000",
  GITHUB_ID: "vitest-github-oauth-id",
  GITHUB_SECRET: "vitest-github-oauth-secret",
  GITHUB_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
  NEXT_PUBLIC_URL: "http://localhost:3000",
  YOOKASSA_SHOP_ID: "",
  YOOKASSA_SECRET_KEY: "",
  YOOKASSA_PAYOUT_MOCK_WALLET: "vitest_mock_payout_wallet",
  FEATURE_REAL_PAYMENTS: "false",
  FEATURE_RATE_LIMITING: "false",
  ENABLE_BULLMQ_WORKERS: "false",
} as const;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    env: { ...vitestEnv },
  },
});
