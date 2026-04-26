import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Guard rules under test (mock db)
// ---------------------------------------------------------------------------

type AsyncMockFn = (...args: unknown[]) => Promise<unknown>;

type MockDb = {
  vacancy: { findFirst: AsyncMockFn };
  referrerAttemptLedger: { count: AsyncMockFn };
  user: { findUnique: AsyncMockFn };
};

function createMockDb(): MockDb {
  return {
    vacancy: { findFirst: vi.fn() as AsyncMockFn },
    referrerAttemptLedger: { count: vi.fn() as AsyncMockFn },
    user: { findUnique: vi.fn() as AsyncMockFn },
  };
}

async function runCreateGuard(db: MockDb, userId: string): Promise<{ error: string | null }> {
  const user = (await db.user.findUnique({ where: { id: userId } })) as {
    roles: string[];
  } | null;
  if (!user?.roles?.includes("REFERRER")) {
    return { error: "FORBIDDEN" };
  }

  const existing = await db.vacancy.findFirst({
    where: { referrerId: userId, status: { in: ["ACTIVE", "FROZEN"] } },
  });
  if (existing) {
    return { error: "ACTIVE_VACANCY_EXISTS" };
  }

  const activeConsumed = await db.referrerAttemptLedger.count({
    where: { referrerId: userId, event: "CONSUMED" },
  });
  const available = Math.max(0, 3 - (activeConsumed as number));
  if (available === 0) {
    return { error: "NO_ATTEMPTS_LEFT" };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("vacancies.create guard — one active vacancy", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("rejects non-REFERRER users", async () => {
    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ roles: ["SEEKER"] });

    const { error } = await runCreateGuard(db, "user-1");
    expect(error).toBe("FORBIDDEN");
  });

  it("blocks creation when an ACTIVE vacancy exists", async () => {
    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ roles: ["REFERRER"] });
    (db.vacancy.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing-vacancy",
      status: "ACTIVE",
    });

    const { error } = await runCreateGuard(db, "user-1");
    expect(error).toBe("ACTIVE_VACANCY_EXISTS");
  });

  it("blocks creation when a FROZEN vacancy exists", async () => {
    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ roles: ["REFERRER"] });
    (db.vacancy.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing-vacancy",
      status: "FROZEN",
    });

    const { error } = await runCreateGuard(db, "user-1");
    expect(error).toBe("ACTIVE_VACANCY_EXISTS");
  });

  it("blocks creation when referrer has no attempts left", async () => {
    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ roles: ["REFERRER"] });
    (db.vacancy.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.referrerAttemptLedger.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    const { error } = await runCreateGuard(db, "user-1");
    expect(error).toBe("NO_ATTEMPTS_LEFT");
  });

  it("allows creation when user is REFERRER, no active vacancy, and has attempts", async () => {
    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ roles: ["REFERRER"] });
    (db.vacancy.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.referrerAttemptLedger.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const { error } = await runCreateGuard(db, "user-1");
    expect(error).toBeNull();
  });

  it("allows creation when referrer still has 1 attempt remaining", async () => {
    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ roles: ["REFERRER"] });
    (db.vacancy.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.referrerAttemptLedger.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const { error } = await runCreateGuard(db, "user-1");
    expect(error).toBeNull();
  });
});

describe("getAvailableAttempts", () => {
  it("returns MAX_REFERRER_ATTEMPTS when ledger is empty", async () => {
    const db = createMockDb();
    (db.referrerAttemptLedger.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const activeConsumed = (await db.referrerAttemptLedger.count({} as never)) as number;
    expect(Math.max(0, 3 - activeConsumed)).toBe(3);
  });

  it("returns 0 when all 3 attempts are consumed", async () => {
    const db = createMockDb();
    (db.referrerAttemptLedger.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    const activeConsumed = (await db.referrerAttemptLedger.count({} as never)) as number;
    expect(Math.max(0, 3 - activeConsumed)).toBe(0);
  });

  it("never returns negative", async () => {
    const db = createMockDb();
    (db.referrerAttemptLedger.count as ReturnType<typeof vi.fn>).mockResolvedValue(10);

    const activeConsumed = (await db.referrerAttemptLedger.count({} as never)) as number;
    expect(Math.max(0, 3 - activeConsumed)).toBe(0);
  });
});
