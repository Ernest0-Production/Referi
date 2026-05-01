import { describe, it, expect, vi, afterEach } from "vitest";
import { subscriptionGrantsProFeatures } from "@/server/repositories/applicationRepository";

describe("subscriptionGrantsProFeatures", () => {
  const frozenNow = new Date("2026-06-15T12:00:00.000Z");

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for ACTIVE with period end in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(frozenNow);
    expect(
      subscriptionGrantsProFeatures({
        status: "ACTIVE",
        currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("returns false when period has ended", () => {
    vi.useFakeTimers();
    vi.setSystemTime(frozenNow);
    expect(
      subscriptionGrantsProFeatures({
        status: "ACTIVE",
        currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("returns false for CANCELLED even if period end is future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(frozenNow);
    expect(
      subscriptionGrantsProFeatures({
        status: "CANCELLED",
        currentPeriodEnd: new Date("2027-01-01T00:00:00.000Z"),
      }),
    ).toBe(false);
  });
});
