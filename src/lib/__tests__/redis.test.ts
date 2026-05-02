import { describe, it, expect, vi, beforeEach } from "vitest";
import { env } from "@/env";

vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    url: string,
    opts: Record<string, unknown>,
  ) {
    this.url = url;
    this.options = opts;
    this.status = "connecting";
  }),
}));

describe("Redis client", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear the globalThis cache so a fresh instance is created each test
    (globalThis as Record<string, unknown>).redis = undefined;
  });

  it("creates a Redis client with required BullMQ settings", async () => {
    const IORedis = (await import("ioredis")).default;
    vi.mocked(IORedis).mockClear();

    await import("../redis");

    expect(IORedis).toHaveBeenCalledWith(
      env.REDIS_URL,
      expect.objectContaining({
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      }),
    );
  });
});
