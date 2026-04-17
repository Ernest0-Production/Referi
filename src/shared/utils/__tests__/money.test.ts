import { describe, it, expect } from "vitest";
import { calculateCommission, formatRubles, kopecksToString } from "../money";

describe("calculateCommission", () => {
  it("calculates 10% commission on 100 000 ₽", () => {
    const { commission, netPayout } = calculateCommission(10_000_00n);
    expect(commission).toBe(1_000_00n);
    expect(netPayout).toBe(9_000_00n);
  });

  it("rounds commission down (floor)", () => {
    // 199 kopecks * 10% = 19.9 → floor to 19
    const { commission, netPayout } = calculateCommission(199n);
    expect(commission).toBe(19n);
    expect(netPayout).toBe(180n);
  });

  it("handles zero amount", () => {
    const { commission, netPayout } = calculateCommission(0n);
    expect(commission).toBe(0n);
    expect(netPayout).toBe(0n);
  });

  it("commission + netPayout = amount", () => {
    const amount = 50_000_00n;
    const { commission, netPayout } = calculateCommission(amount);
    expect(commission + netPayout).toBe(amount);
  });
});

describe("kopecksToString", () => {
  it("converts bigint to string", () => {
    expect(kopecksToString(10_000n)).toBe("10000");
  });

  it("returns null for null input", () => {
    expect(kopecksToString(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(kopecksToString(undefined)).toBeNull();
  });
});

describe("formatRubles", () => {
  it("formats 10000 kopecks as 100 ₽", () => {
    const result = formatRubles(10_000n);
    expect(result).toContain("100");
    expect(result).toContain("₽");
  });
});
