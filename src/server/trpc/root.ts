import { router } from "./trpc";
import { vacanciesRouter } from "./routers/vacancies";
import { applicationsRouter } from "./routers/applications";
import { moderationRouter, reportsRouter } from "./routers/moderation";

export const appRouter = router({
  vacancies: vacanciesRouter,
  applications: applicationsRouter,
  moderation: moderationRouter,
  reports: reportsRouter,
  // payments: paymentsRouter,         // Phase 4 (separate router)
  // subscriptions: subscriptionsRouter, // Phase 4
});

export type AppRouter = typeof appRouter;
