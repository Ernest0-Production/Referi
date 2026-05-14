import { describe, it, expect } from "vitest";
import {
  buildVacancyCatalogLoginReturnHref,
  findMatchingVacancySearchPresetId,
  flatParamsForPresetSave,
  isVacancyCatalogFlatBaseline,
  isVacancyFlatMatchingPresetParams,
  mergeVacancyListFlat,
  normalizedPresetParamsRecord,
  parseCsvEnumParam,
  parseVacancyListSpecialtyCsvParam,
  peelOpenVacancyPresetSaveFromSearchParamsInput,
  presetParamsFromJson,
  vacancyCatalogHasPresetSaveFields,
  vacancyListFlatToSearchParams,
  VACANCY_LIST_GRADE_VALUES,
} from "@/lib/vacancyListQuery";
import type { VacancyListFlatSearchParams } from "@/lib/vacancyListQuery";

describe("vacancy catalog filters & presets (vacancyListQuery)", () => {
  describe("parseVacancyListSpecialtyCsvParam", () => {
    it("maps legacy MOBILE to iOS and Android in stable order", () => {
      expect(parseVacancyListSpecialtyCsvParam("MOBILE")).toEqual(["IOS_MOBILE", "ANDROID_MOBILE"]);
    });

    it("parses comma list and filters unknown tokens", () => {
      expect(parseVacancyListSpecialtyCsvParam("QA,UNKNOWN,DATA")).toEqual(["QA", "DATA"]);
    });
  });

  describe("parseCsvEnumParam", () => {
    it("returns undefined for empty", () => {
      expect(parseCsvEnumParam("", VACANCY_LIST_GRADE_VALUES)).toBeUndefined();
    });

    it("preserves canonical order from allowed list", () => {
      expect(parseCsvEnumParam("SENIOR,JUNIOR", VACANCY_LIST_GRADE_VALUES)).toEqual([
        "JUNIOR",
        "SENIOR",
      ]);
    });
  });

  describe("mergeVacancyListFlat", () => {
    it("merges patch and resets page to 1 when page omitted", () => {
      const current: VacancyListFlatSearchParams = { page: "3", query: "rust" };
      expect(mergeVacancyListFlat(current, { grade: "MIDDLE" })).toEqual({
        page: "1",
        query: "rust",
        grade: "MIDDLE",
      });
    });

    it("explicit page in patch is kept", () => {
      expect(
        mergeVacancyListFlat({ page: "1", sort: "new" }, { page: "2", specialty: "QA" }),
      ).toEqual({ page: "2", sort: "new", specialty: "QA" });
    });

    it("undefined patch value removes key", () => {
      expect(
        mergeVacancyListFlat(
          { query: "x", grade: "LEAD", page: "1" },
          { grade: undefined, query: "y" },
        ),
      ).toEqual({ page: "1", query: "y" });
    });
  });

  describe("vacancyListFlatToSearchParams", () => {
    it("omits empty optional fields", () => {
      const q = vacancyListFlatToSearchParams({
        page: "1",
        query: "",
        specialty: "   ",
      });
      expect([...q.keys()].sort()).toEqual(["page"]);
      expect(q.get("page")).toBe("1");
    });

    it("includes trimmed query and filters", () => {
      const q = vacancyListFlatToSearchParams({
        query: "  go  ",
        specialty: "BACKEND,QA",
        salaryFrom: "100",
        salaryCurrency: "USD",
        page: "2",
      });
      expect(q.get("query")).toBe("go");
      expect(q.get("specialty")).toBe("BACKEND,QA");
      expect(q.get("salaryFrom")).toBe("100");
      expect(q.get("salaryCurrency")).toBe("USD");
      expect(q.get("page")).toBe("2");
    });
  });

  describe("flatParamsForPresetSave & vacancyCatalogHasPresetSaveFields", () => {
    it("includes salary only with valid currency", () => {
      expect(flatParamsForPresetSave({ salaryFrom: "500", salaryCurrency: "RUB" })).toEqual({
        salaryFrom: "500",
        salaryCurrency: "RUB",
      });
      expect(flatParamsForPresetSave({ salaryFrom: "500", salaryCurrency: "XXX" })).toEqual({
        salaryFrom: "500",
      });
    });

    it("normalizes specialty via parse pipeline", () => {
      expect(flatParamsForPresetSave({ specialty: "MOBILE" })).toEqual({
        specialty: "IOS_MOBILE,ANDROID_MOBILE",
      });
    });

    it("vacancyCatalogHasPresetSaveFields false for baseline empty", () => {
      expect(vacancyCatalogHasPresetSaveFields({})).toBe(false);
      expect(vacancyCatalogHasPresetSaveFields({ page: "1" })).toBe(false);
    });

    it("vacancyCatalogHasPresetSaveFields true when any savable field set", () => {
      expect(vacancyCatalogHasPresetSaveFields({ query: "a" })).toBe(true);
      expect(vacancyCatalogHasPresetSaveFields({ sort: "salary_desc" })).toBe(true);
    });
  });

  describe("isVacancyCatalogFlatBaseline", () => {
    it("true for empty or page 1 only", () => {
      expect(isVacancyCatalogFlatBaseline({})).toBe(true);
      expect(isVacancyCatalogFlatBaseline({ page: "1" })).toBe(true);
    });

    it("false when savable filters present", () => {
      expect(isVacancyCatalogFlatBaseline({ workFormat: "REMOTE" })).toBe(false);
    });

    it("false when page not first", () => {
      expect(isVacancyCatalogFlatBaseline({ page: "2" })).toBe(false);
    });
  });

  describe("presetParamsFromJson", () => {
    it("ignores invalid json shapes", () => {
      expect(presetParamsFromJson(null)).toEqual({});
      expect(presetParamsFromJson([])).toEqual({});
      expect(presetParamsFromJson("x")).toEqual({});
    });

    it("drops salaryCurrency without salaryFrom", () => {
      expect(presetParamsFromJson({ salaryCurrency: "EUR" })).toEqual({});
    });

    it("reads string fields", () => {
      expect(
        presetParamsFromJson({
          grade: "MIDDLE",
          query: "react",
          sort: "new",
          salaryFrom: "200000",
          salaryCurrency: "RUB",
        }),
      ).toEqual({
        grade: "MIDDLE",
        query: "react",
        sort: "new",
        salaryFrom: "200000",
        salaryCurrency: "RUB",
      });
    });
  });

  describe("preset equality & matching (duplicates / reflection)", () => {
    it("isVacancyFlatMatchingPresetParams: same fields after normalization", () => {
      const flat: VacancyListFlatSearchParams = {
        specialty: "ANDROID_MOBILE,IOS_MOBILE",
        grade: "SENIOR,MIDDLE",
        query: "x",
      };
      const presetJson = {
        specialty: "MOBILE",
        grade: "MIDDLE,SENIOR",
        query: "x",
      };
      expect(isVacancyFlatMatchingPresetParams(flat, presetJson)).toBe(true);
    });

    it("isVacancyFlatMatchingPresetParams false when flat differs", () => {
      expect(
        isVacancyFlatMatchingPresetParams({ query: "a" }, { query: "b" }),
      ).toBe(false);
    });

    it("findMatchingVacancySearchPresetId returns first id with equal normalized params", () => {
      const params = { grade: "LEAD", workFormat: "HYBRID" };
      const norm = normalizedPresetParamsRecord(params);
      const presets = [
        { id: "first", params: { grade: "LEAD", workFormat: "OFFICE" } },
        { id: "dup-a", params: { workFormat: "HYBRID", grade: "LEAD" } },
        { id: "dup-b", params: norm },
      ];
      expect(findMatchingVacancySearchPresetId(params, presets)).toBe("dup-a");
    });

    it("normalizedPresetParamsRecord matches flatParamsForPresetSave output shape", () => {
      const flat: VacancyListFlatSearchParams = {
        specialty: "QA",
        sort: "salary_desc",
        salaryFrom: "100",
        salaryCurrency: "USD",
      };
      expect(normalizedPresetParamsRecord(flat)).toEqual(flatParamsForPresetSave(flat));
    });
  });

  describe("peelOpenVacancyPresetSaveFromSearchParamsInput", () => {
    it("detects truthy flags and strips key", () => {
      const raw = { openVacancyPresetSave: "1", query: "job" };
      const { params, openVacancyPresetSave } =
        peelOpenVacancyPresetSaveFromSearchParamsInput(raw);
      expect(openVacancyPresetSave).toBe(true);
      expect(params).toEqual({ query: "job" });
    });

    it("false for absent or false-like", () => {
      expect(
        peelOpenVacancyPresetSaveFromSearchParamsInput({ openVacancyPresetSave: "0" })
          .openVacancyPresetSave,
      ).toBe(false);
      expect(
        peelOpenVacancyPresetSaveFromSearchParamsInput({}).openVacancyPresetSave,
      ).toBe(false);
    });
  });

  describe("buildVacancyCatalogLoginReturnHref", () => {
    it("appends openVacancyPresetSave and preserves filters", () => {
      const href = buildVacancyCatalogLoginReturnHref({
        query: "devops",
        grade: "MIDDLE",
      });
      expect(href.startsWith("/?")).toBe(true);
      const u = new URL(href, "http://localhost");
      expect(u.searchParams.get("openVacancyPresetSave")).toBe("1");
      expect(u.searchParams.get("query")).toBe("devops");
      expect(u.searchParams.get("grade")).toBe("MIDDLE");
    });
  });
});
