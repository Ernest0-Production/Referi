import { admin } from "./admin";
import { applications } from "./applications";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { payAuth } from "./payAuth";
import { server } from "./server";
import { site } from "./site";
import { vacancies } from "./vacancies";

export const ru = {
  common,
  site,
  applications,
  vacancies,
  dashboard,
  admin,
  payAuth,
  server,
} as const;

export type RuMessages = typeof ru;
