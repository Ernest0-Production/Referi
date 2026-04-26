import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const session = await auth();

  const ip =
    opts.req.headers.get("x-forwarded-for") ?? opts.req.headers.get("x-real-ip") ?? "unknown";

  return {
    db: prisma,
    ip,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
