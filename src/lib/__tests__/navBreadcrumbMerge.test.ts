import { describe, it, expect } from "vitest";
import { mergeBreadcrumbTrails, withCurrentPageHrefRemoved } from "@/lib/navBreadcrumbMerge";
import type { NavBreadcrumbSegment } from "@/lib/navBreadcrumbTrail";

describe("withCurrentPageHrefRemoved", () => {
  it("returns empty as-is", () => {
    expect(withCurrentPageHrefRemoved([])).toEqual([]);
  });

  it("strips href only from last segment", () => {
    const trail: NavBreadcrumbSegment[] = [
      { label: "A", href: "/a" },
      { label: "B", href: "/b" },
      { label: "C", href: "/c" },
    ];
    expect(withCurrentPageHrefRemoved(trail)).toEqual([
      { label: "A", href: "/a" },
      { label: "B", href: "/b" },
      { label: "C" },
    ]);
  });

  it("single segment becomes current page without href", () => {
    expect(withCurrentPageHrefRemoved([{ label: "Only", href: "/only" }])).toEqual([
      { label: "Only" },
    ]);
  });
});

describe("mergeBreadcrumbTrails", () => {
  it("empty seed returns previous trail unchanged", () => {
    const prev: NavBreadcrumbSegment[] = [{ label: "Рефералки", href: "/" }, { label: "X" }];
    expect(mergeBreadcrumbTrails(prev, [])).toEqual(prev);
  });

  it("empty prev: takes seed and clears last href", () => {
    expect(
      mergeBreadcrumbTrails(
        [],
        [
          { label: "Рефералки", href: "/" },
          { label: "Title", href: "/vacancies/1" },
        ],
      ),
    ).toEqual([{ label: "Рефералки", href: "/" }, { label: "Title" }]);
  });

  it("common prefix then tail from seed", () => {
    const prev: NavBreadcrumbSegment[] = [
      { label: "Рефералки", href: "/" },
      { label: "Old", href: "/vacancies/old" },
      { label: "Deep" },
    ];
    const seed: NavBreadcrumbSegment[] = [
      { label: "Рефералки", href: "/" },
      { label: "New", href: "/vacancies/new" },
    ];
    expect(mergeBreadcrumbTrails(prev, seed)).toEqual([
      { label: "Рефералки", href: "/" },
      { label: "New" },
    ]);
  });

  it("j===0 and single-segment seed: appends to previous stack", () => {
    const prev: NavBreadcrumbSegment[] = [
      { label: "Рефералки", href: "/" },
      { label: "A", href: "/a" },
      { label: "B" },
    ];
    expect(mergeBreadcrumbTrails(prev, [{ label: "C", href: "/c" }])).toEqual([
      { label: "Рефералки", href: "/" },
      { label: "A", href: "/a" },
      { label: "B" },
      { label: "C" },
    ]);
  });

  it("when seed fully consumed as prefix of prev: normalizes to seed with last non-link", () => {
    const prev: NavBreadcrumbSegment[] = [
      { label: "Рефералки", href: "/" },
      { label: "T", href: "/vacancies/1" },
      { label: "Extra" },
    ];
    const seed: NavBreadcrumbSegment[] = [
      { label: "Рефералки", href: "/" },
      { label: "T", href: "/vacancies/1" },
    ];
    expect(mergeBreadcrumbTrails(prev, seed)).toEqual([
      { label: "Рефералки", href: "/" },
      { label: "T" },
    ]);
  });

  it("same label different href with single-segment seed: appends (stack forward)", () => {
    const prev: NavBreadcrumbSegment[] = [{ label: "X", href: "/1" }];
    const seed: NavBreadcrumbSegment[] = [{ label: "X", href: "/2" }];
    expect(mergeBreadcrumbTrails(prev, seed)).toEqual([{ label: "X", href: "/1" }, { label: "X" }]);
  });
});
