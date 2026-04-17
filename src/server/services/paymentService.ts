/**
 * PaymentProvider abstraction — spec/spec-data-payments-escrow.md
 * First implementation: YookassaPaymentProvider (Phase 4)
 * Testing: MockPaymentProvider
 */

export interface CreatePaymentOptions {
  idempotencyKey: string;
  amountKopecks: bigint;
  description: string;
  metadata: Record<string, string>;
  capture: boolean;
  returnUrl: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  confirmationUrl: string;
  status: "pending";
}

export interface CaptureOptions {
  idempotencyKey: string;
  paymentId: string;
  amountKopecks: bigint;
}

export interface RefundOptions {
  idempotencyKey: string;
  paymentId: string;
  amountKopecks: bigint;
  description: string;
}

export interface RefundResult {
  refundId: string;
  status: "succeeded" | "pending";
}

export interface PayoutOptions {
  idempotencyKey: string;
  amountKopecks: bigint;
  description: string;
  savedPaymentMethodId: string;
  metadata: { referrerId: string; applicationId: string };
}

export interface PayoutResult {
  payoutId: string;
  status: "pending" | "succeeded";
}

export type PaymentStatus =
  | "pending"
  | "waiting_for_capture"
  | "succeeded"
  | "canceled";

export interface PaymentProvider {
  createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult>;
  capturePayment(options: CaptureOptions): Promise<void>;
  refundPayment(options: RefundOptions): Promise<RefundResult>;
  createPayout(options: PayoutOptions): Promise<PayoutResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}

// ─────────────────────────────────────────────
// MockPaymentProvider — for tests and development
// ─────────────────────────────────────────────

const mockStorage = new Map<string, { status: PaymentStatus }>();

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(
    options: CreatePaymentOptions,
  ): Promise<CreatePaymentResult> {
    const paymentId = `mock_${options.idempotencyKey}`;
    mockStorage.set(paymentId, { status: "waiting_for_capture" });
    return {
      paymentId,
      confirmationUrl: `http://localhost:3000/pay/mock?paymentId=${paymentId}`,
      status: "pending",
    };
  }

  async capturePayment(options: CaptureOptions): Promise<void> {
    mockStorage.set(options.paymentId, { status: "succeeded" });
  }

  async refundPayment(options: RefundOptions): Promise<RefundResult> {
    mockStorage.set(options.paymentId, { status: "canceled" });
    return {
      refundId: `refund_${options.idempotencyKey}`,
      status: "succeeded",
    };
  }

  async createPayout(options: PayoutOptions): Promise<PayoutResult> {
    return {
      payoutId: `payout_${options.idempotencyKey}`,
      status: "succeeded",
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return mockStorage.get(paymentId)?.status ?? "pending";
  }
}

// ─────────────────────────────────────────────
// YookassaPaymentProvider — real implementation
// ─────────────────────────────────────────────

export class YookassaPaymentProvider implements PaymentProvider {
  private readonly baseUrl = "https://api.yookassa.ru/v3";
  private readonly shopId: string;
  private readonly secretKey: string;

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID ?? "";
    this.secretKey = process.env.YOOKASSA_SECRET_KEY ?? "";
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString("base64")}`;
  }

  private async request<T>(
    path: string,
    method: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: this.authHeader,
    };
    if (idempotencyKey) {
      headers["Idempotence-Key"] = idempotencyKey;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`YooKassa API error ${res.status}: ${error}`);
    }

    return res.json() as Promise<T>;
  }

  async createPayment(
    options: CreatePaymentOptions,
  ): Promise<CreatePaymentResult> {
    const response = await this.request<{
      id: string;
      confirmation: { confirmation_url: string };
    }>(
      "/payments",
      "POST",
      {
        amount: {
          value: (Number(options.amountKopecks) / 100).toFixed(2),
          currency: "RUB",
        },
        capture: options.capture,
        confirmation: { type: "redirect", return_url: options.returnUrl },
        description: options.description,
        metadata: options.metadata,
      },
      options.idempotencyKey,
    );

    return {
      paymentId: response.id,
      confirmationUrl: response.confirmation.confirmation_url,
      status: "pending",
    };
  }

  async capturePayment(options: CaptureOptions): Promise<void> {
    await this.request(
      `/payments/${options.paymentId}/capture`,
      "POST",
      {
        amount: {
          value: (Number(options.amountKopecks) / 100).toFixed(2),
          currency: "RUB",
        },
      },
      options.idempotencyKey,
    );
  }

  async refundPayment(options: RefundOptions): Promise<RefundResult> {
    const response = await this.request<{ id: string; status: string }>(
      "/refunds",
      "POST",
      {
        payment_id: options.paymentId,
        amount: {
          value: (Number(options.amountKopecks) / 100).toFixed(2),
          currency: "RUB",
        },
        description: options.description,
      },
      options.idempotencyKey,
    );

    return {
      refundId: response.id,
      status: response.status === "succeeded" ? "succeeded" : "pending",
    };
  }

  async createPayout(options: PayoutOptions): Promise<PayoutResult> {
    const response = await this.request<{ id: string; status: string }>(
      "/payouts",
      "POST",
      {
        amount: {
          value: (Number(options.amountKopecks) / 100).toFixed(2),
          currency: "RUB",
        },
        payout_destination_data: {
          type: "yoo_money",
          account_number: options.savedPaymentMethodId,
        },
        description: options.description,
        metadata: options.metadata,
      },
      options.idempotencyKey,
    );

    return {
      payoutId: response.id,
      status: response.status === "succeeded" ? "succeeded" : "pending",
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const response = await this.request<{ status: string }>(
      `/payments/${paymentId}`,
      "GET",
    );
    return response.status as PaymentStatus;
  }
}

// Factory — returns real or mock based on feature flag
export function createPaymentProvider(): PaymentProvider {
  if (process.env.FEATURE_REAL_PAYMENTS === "true") {
    return new YookassaPaymentProvider();
  }
  return new MockPaymentProvider();
}

export const paymentProvider = createPaymentProvider();
