import "server-only";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { appRouter } from "@/server/trpc/root";
import { cache } from "react";

const createServerContext = cache(async () => {
  const session = await auth();
  return { db: prisma, session, ip: "server" };
});

export const trpc = appRouter.createCaller(createServerContext);
