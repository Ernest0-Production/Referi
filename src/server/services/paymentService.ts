/**
 * PaymentProvider — обычные платежи ЮKassa + безопасная сделка (Safe deal) для эскроу по заявкам.
 */

import { env } from "@/env";

export interface CreatePaymentOptions {
  idempotencyKey: string;
  amountKopecks: bigint;
  description: string;
  metadata: Record<string, string>;
  capture: boolean;
  returnUrl: string;
  savePaymentMethod?: boolean;
}

export interface CreatePaymentResult {
  paymentId: string;
  confirmationUrl: string;
  status: "pending";
}

export interface CreatePaymentWithSavedMethodOptions {
  idempotencyKey: string;
  amountKopecks: bigint;
  description: string;
  metadata: Record<string, string>;
  paymentMethodId: string;
}

export interface CreatePaymentWithSavedMethodResult {
  paymentId: string;
  status: PaymentStatus;
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

export interface RefundDealOptions extends RefundOptions {
  dealId: string;
  refundSettlementKopecks: bigint;
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

export interface CreateSafeDealOptions {
  idempotencyKey: string;
  description: string;
  metadata: Record<string, string>;
}

export interface CreateSafeDealResult {
  dealId: string;
}

export interface CreateDealPaymentOptions {
  idempotencyKey: string;
  dealId: string;
  amountKopecks: bigint;
  payoutSettlementKopecks: bigint;
  description: string;
  metadata: Record<string, string>;
  returnUrl: string;
}

export interface CreateDealPayoutOptions {
  idempotencyKey: string;
  dealId: string;
  amountKopecks: bigint;
  description: string;
  yooMoneyWallet: string;
  metadata: Record<string, string>;
}

export type PaymentStatus = "pending" | "waiting_for_capture" | "succeeded" | "canceled";

export interface PaymentProvider {
  createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult>;
  createPaymentWithSavedMethod(
    options: CreatePaymentWithSavedMethodOptions,
  ): Promise<CreatePaymentWithSavedMethodResult>;
  capturePayment(options: CaptureOptions): Promise<void>;
  refundPayment(options: RefundOptions): Promise<RefundResult>;
  refundDealPayment(options: RefundDealOptions): Promise<RefundResult>;
  createPayout(options: PayoutOptions): Promise<PayoutResult>;
  createSafeDeal(options: CreateSafeDealOptions): Promise<CreateSafeDealResult>;
  createDealPayment(options: CreateDealPaymentOptions): Promise<CreatePaymentResult>;
  createDealPayout(options: CreateDealPayoutOptions): Promise<PayoutResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}

function kopecksToAmountString(kopecks: bigint): string {
  return (Number(kopecks) / 100).toFixed(2);
}

const mockStorage = new Map<string, { status: PaymentStatus }>();
const mockDeals = new Map<string, { id: string }>();

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult> {
    const paymentId =
      options.metadata.type === "subscription" && options.metadata.userId
        ? `mock_sub:${options.metadata.userId}:${options.idempotencyKey}`
        : `mock_${options.idempotencyKey}`;
    const status: PaymentStatus = options.capture ? "succeeded" : "waiting_for_capture";
    mockStorage.set(paymentId, { status });
    return {
      paymentId,
      confirmationUrl: `${env.NEXT_PUBLIC_URL}/pay/mock?paymentId=${paymentId}`,
      status: "pending",
    };
  }

  async createPaymentWithSavedMethod(
    options: CreatePaymentWithSavedMethodOptions,
  ): Promise<CreatePaymentWithSavedMethodResult> {
    const uid = options.metadata.userId ?? "unknown";
    const paymentId = `mock_sub_renew:${uid}:${options.idempotencyKey}`;
    mockStorage.set(paymentId, { status: "succeeded" });
    return { paymentId, status: "succeeded" };
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

  async refundDealPayment(options: RefundDealOptions): Promise<RefundResult> {
    return this.refundPayment(options);
  }

  async createPayout(options: PayoutOptions): Promise<PayoutResult> {
    return {
      payoutId: `payout_${options.idempotencyKey}`,
      status: "succeeded",
    };
  }

  async createSafeDeal(options: CreateSafeDealOptions): Promise<CreateSafeDealResult> {
    const dealId = `mock_deal_${options.idempotencyKey}`;
    mockDeals.set(dealId, { id: dealId });
    return { dealId };
  }

  async createDealPayment(options: CreateDealPaymentOptions): Promise<CreatePaymentResult> {
    const paymentId = `mock_${options.idempotencyKey}`;
    mockStorage.set(paymentId, { status: "waiting_for_capture" });
    return {
      paymentId,
      confirmationUrl: `${env.NEXT_PUBLIC_URL}/pay/mock?paymentId=${paymentId}`,
      status: "pending",
    };
  }

  async createDealPayout(options: CreateDealPayoutOptions): Promise<PayoutResult> {
    return {
      payoutId: `payout_deal_${options.idempotencyKey}`,
      status: "succeeded",
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return mockStorage.get(paymentId)?.status ?? "pending";
  }
}

export class YookassaPaymentProvider implements PaymentProvider {
  private readonly baseUrl = "https://api.yookassa.ru/v3";
  private readonly shopId: string;
  private readonly secretKey: string;

  constructor() {
    this.shopId = env.YOOKASSA_SHOP_ID.trim();
    this.secretKey = env.YOOKASSA_SECRET_KEY.trim();
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

  async createSafeDeal(options: CreateSafeDealOptions): Promise<CreateSafeDealResult> {
    const response = await this.request<{ id: string }>(
      "/deals",
      "POST",
      {
        type: "safe_deal",
        fee_moment: "payment_succeeded",
        description: options.description,
        metadata: options.metadata,
      },
      options.idempotencyKey,
    );
    return { dealId: response.id };
  }

  async createDealPayment(options: CreateDealPaymentOptions): Promise<CreatePaymentResult> {
    const response = await this.request<{
      id: string;
      confirmation: { confirmation_url: string };
    }>(
      "/payments",
      "POST",
      {
        amount: {
          value: kopecksToAmountString(options.amountKopecks),
          currency: "RUB",
        },
        capture: true,
        confirmation: { type: "redirect", return_url: options.returnUrl },
        description: options.description,
        metadata: options.metadata,
        deal: {
          id: options.dealId,
          settlements: [
            {
              type: "payout",
              amount: {
                value: kopecksToAmountString(options.payoutSettlementKopecks),
                currency: "RUB",
              },
            },
          ],
        },
      },
      options.idempotencyKey,
    );

    return {
      paymentId: response.id,
      confirmationUrl: response.confirmation.confirmation_url,
      status: "pending",
    };
  }

  async createDealPayout(options: CreateDealPayoutOptions): Promise<PayoutResult> {
    const response = await this.request<{ id: string; status: string }>(
      "/payouts",
      "POST",
      {
        amount: {
          value: kopecksToAmountString(options.amountKopecks),
          currency: "RUB",
        },
        payout_destination_data: {
          type: "yoo_money",
          account_number: options.yooMoneyWallet,
        },
        description: options.description,
        metadata: options.metadata,
        deal: {
          id: options.dealId,
        },
      },
      options.idempotencyKey,
    );

    return {
      payoutId: response.id,
      status: response.status === "succeeded" ? "succeeded" : "pending",
    };
  }

  async refundDealPayment(options: RefundDealOptions): Promise<RefundResult> {
    const response = await this.request<{ id: string; status: string }>(
      "/refunds",
      "POST",
      {
        payment_id: options.paymentId,
        amount: {
          value: kopecksToAmountString(options.amountKopecks),
          currency: "RUB",
        },
        description: options.description,
        deal: {
          id: options.dealId,
          refund_settlements: [
            {
              type: "payout",
              amount: {
                value: kopecksToAmountString(options.refundSettlementKopecks),
                currency: "RUB",
              },
            },
          ],
        },
      },
      options.idempotencyKey,
    );

    return {
      refundId: response.id,
      status: response.status === "succeeded" ? "succeeded" : "pending",
    };
  }

  async createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult> {
    const body: Record<string, unknown> = {
      amount: {
        value: kopecksToAmountString(options.amountKopecks),
        currency: "RUB",
      },
      capture: options.capture,
      confirmation: { type: "redirect", return_url: options.returnUrl },
      description: options.description,
      metadata: options.metadata,
    };
    if (options.savePaymentMethod) {
      body.save_payment_method = true;
    }

    const response = await this.request<{
      id: string;
      confirmation: { confirmation_url: string };
    }>("/payments", "POST", body, options.idempotencyKey);

    return {
      paymentId: response.id,
      confirmationUrl: response.confirmation.confirmation_url,
      status: "pending",
    };
  }

  async createPaymentWithSavedMethod(
    options: CreatePaymentWithSavedMethodOptions,
  ): Promise<CreatePaymentWithSavedMethodResult> {
    const body = {
      amount: {
        value: kopecksToAmountString(options.amountKopecks),
        currency: "RUB",
      },
      capture: true,
      payment_method_id: options.paymentMethodId,
      description: options.description,
      metadata: options.metadata,
    };

    const response = await this.request<{ id: string; status: string }>(
      "/payments",
      "POST",
      body,
      options.idempotencyKey,
    );

    return {
      paymentId: response.id,
      status: response.status as PaymentStatus,
    };
  }

  async capturePayment(options: CaptureOptions): Promise<void> {
    await this.request(
      `/payments/${options.paymentId}/capture`,
      "POST",
      {
        amount: {
          value: kopecksToAmountString(options.amountKopecks),
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
          value: kopecksToAmountString(options.amountKopecks),
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
          value: kopecksToAmountString(options.amountKopecks),
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
    const response = await this.request<{ status: string }>(`/payments/${paymentId}`, "GET");
    return response.status as PaymentStatus;
  }
}

export function createPaymentProvider(): PaymentProvider {
  if (env.FEATURE_REAL_PAYMENTS === "true") {
    return new YookassaPaymentProvider();
  }
  return new MockPaymentProvider();
}

export const paymentProvider = createPaymentProvider();

export async function refundEscrowOrThrow(params: {
  idempotencyKey: string;
  escrow: {
    yookassaPaymentId: string;
    yookassaDealId: string | null;
    amountKopecks: bigint;
    netPayoutKopecks: bigint;
  };
  description: string;
}): Promise<RefundResult> {
  const { escrow } = params;
  if (escrow.yookassaDealId) {
    return paymentProvider.refundDealPayment({
      idempotencyKey: params.idempotencyKey,
      paymentId: escrow.yookassaPaymentId,
      amountKopecks: escrow.amountKopecks,
      description: params.description,
      dealId: escrow.yookassaDealId,
      refundSettlementKopecks: escrow.netPayoutKopecks,
    });
  }
  return paymentProvider.refundPayment({
    idempotencyKey: params.idempotencyKey,
    paymentId: escrow.yookassaPaymentId,
    amountKopecks: escrow.amountKopecks,
    description: params.description,
  });
}
