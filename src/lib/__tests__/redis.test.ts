import { describe, it, expect, vi, beforeEach } from "vitest";

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
      expect.any(String),
      expect.objectContaining({
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      }),
    );
  });

  it("uses REDIS_URL env variable when set", async () => {
    vi.stubEnv("REDIS_URL", "redis://custom-host:6380");
    const IORedis = (await import("ioredis")).default;
    vi.mocked(IORedis).mockClear();

    await import("../redis");

    expect(IORedis).toHaveBeenCalledWith("redis://custom-host:6380", expect.any(Object));
    vi.unstubAllEnvs();
  });

  it("defaults to localhost:6379 when REDIS_URL is undefined", async () => {
    vi.stubEnv("REDIS_URL", undefined as unknown as string);
    const IORedis = (await import("ioredis")).default;
    vi.mocked(IORedis).mockClear();

    await import("../redis");

    expect(IORedis).toHaveBeenCalledWith("redis://localhost:6379", expect.any(Object));
    vi.unstubAllEnvs();
  });
});
