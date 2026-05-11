import { describe, expect, it } from "vitest";
import {
  randomVacancySearchPresetBadgeEmoji,
  vacancySearchPresetNameWithRandomBadge,
} from "../vacancySearchPresetNameBadge";

describe("vacancySearchPresetNameBadge", () => {
  it("empty name yields emoji and trailing space", () => {
    const s = vacancySearchPresetNameWithRandomBadge("");
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(/\s$/.test(s)).toBe(true);
  });

  it("respects maxLength", () => {
    const long = "a".repeat(100);
    const s = vacancySearchPresetNameWithRandomBadge(long, 80);
    expect(s.length).toBeLessThanOrEqual(80);
  });

  it("randomVacancySearchPresetBadgeEmoji returns one of the set", () => {
    const e = randomVacancySearchPresetBadgeEmoji();
    expect(e.length).toBeGreaterThan(0);
  });
});
