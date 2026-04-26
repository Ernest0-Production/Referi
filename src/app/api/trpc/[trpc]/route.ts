import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/context";
import { checkRateLimit, RATE_LIMIT_RULES } from "@/lib/rateLimiter";
import { auth } from "@/lib/auth";

async function handler(req: Request) {
  if (process.env.FEATURE_RATE_LIMITING === "true") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    // Use user-level limit if authenticated, IP-level otherwise
    const session = await auth();
    const rule = session?.user?.id
      ? RATE_LIMIT_RULES.authedApi(session.user.id)
      : RATE_LIMIT_RULES.publicApi(ip);

    const result = await checkRateLimit(rule);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({ error: "Too Many Requests", retryAfter: result.resetAt.toISOString() }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "Retry-After": Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        },
      );
    }
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
          }
        : undefined,
  });
}

export { handler as GET, handler as POST };
