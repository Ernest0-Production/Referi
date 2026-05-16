import { describe, it, expect } from "vitest";
import {
  dashboardApplicationDetailTrail,
  dashboardApplicationNewTrail,
  newPublicVacancyTrail,
  publicVacancyDetailTrail,
  publicVacancyEditTrail,
  registrationAgeGateTrail,
} from "@/lib/navBreadcrumbTrail";
import { hrefSignInOverlay } from "@/lib/signInOverlayParams";

describe("navBreadcrumbTrail", () => {
  describe("publicVacancyDetailTrail", () => {
    it("builds catalog root then vacancy title as current page", () => {
      expect(publicVacancyDetailTrail("Senior Rust")).toEqual([
        { label: "Рефералки", href: "/" },
        { label: "Senior Rust" },
      ]);
    });
  });

  describe("publicVacancyEditTrail", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    it("catalog → vacancy → Редактирование", () => {
      expect(publicVacancyEditTrail(id, "ACME")).toEqual([
        { label: "Рефералки", href: "/" },
        { label: "ACME", href: `/vacancies/${id}` },
        { label: "Редактирование" },
      ]);
    });
  });

  describe("newPublicVacancyTrail", () => {
    it("catalog then compose title", () => {
      expect(newPublicVacancyTrail()).toEqual([
        { label: "Рефералки", href: "/" },
        { label: "Разместить рефералку" },
      ]);
    });
  });

  describe("dashboardApplicationNewTrail", () => {
    const id = "11111111-2222-3333-4444-555555555555";

    it("from public vacancy: full chain with public detail link", () => {
      expect(dashboardApplicationNewTrail(id, "Beta", true)).toEqual([
        { label: "Рефералки", href: "/" },
        { label: "Beta", href: `/vacancies/${id}` },
        { label: "Попросить рефералку" },
      ]);
    });

    it("without public context: vacancy link then request step", () => {
      expect(dashboardApplicationNewTrail(id, "Beta", false)).toEqual([
        { label: "Beta", href: `/vacancies/${id}` },
        { label: "Попросить рефералку" },
      ]);
    });
  });

  describe("dashboardApplicationDetailTrail", () => {
    it("lists then current заявка", () => {
      expect(dashboardApplicationDetailTrail()).toEqual([
        { label: "Мои заявки", href: "/applications" },
        { label: "Заявка" },
      ]);
    });
  });

  describe("registrationAgeGateTrail", () => {
    it("login then age gate label", () => {
      expect(registrationAgeGateTrail()).toEqual([
        { label: "Вход", href: hrefSignInOverlay("/") },
        { label: "Платная регистрация" },
      ]);
    });
  });
});
