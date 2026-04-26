import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { vacanciesRouter } from "./routers/vacancies";
import { applicationsRouter } from "./routers/applications";
import { moderationRouter, reportsRouter } from "./routers/moderation";
import { paymentsRouter } from "./routers/payments";
import { subscriptionsRouter } from "./routers/subscriptions";

export const appRouter = router({
  auth: authRouter,
  vacancies: vacanciesRouter,
  applications: applicationsRouter,
  moderation: moderationRouter,
  reports: reportsRouter,
  payments: paymentsRouter,
  subscriptions: subscriptionsRouter,
});

export type AppRouter = typeof appRouter;
