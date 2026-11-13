import "server-only";

/**
 * Payment provider contract. Billing logic (orders, subscriptions, credits)
 * lives in `src/lib/billing.ts` and only talks to providers through this
 * interface, so a provider can be swapped or added without touching it.
 */

export type ProviderConfigStatus = "ENABLED" | "DISABLED" | "NOT CONFIGURED" | "INVALID CONFIGURATION";

export interface CheckoutRequest {
  orderId: string;
  userId: string;
  email?: string;
  amount: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

/** What the browser needs to reach the provider's payment page. Contains no secrets. */
export interface CheckoutSession {
  provider: string;
  orderId: string;
  /** Hosted payment page — the browser is redirected here. */
  paymentUrl: string;
}

/** Normalised view of a provider payment/invoice. */
export interface ProviderTransaction {
  id: string;
  status: string;
  paid: boolean;
  currency: string;
  /** Amount in major units (e.g. dollars), matches `order.amount`. */
  amount: number;
  customData: Record<string, string>;
  subscriptionId: string | null;
  origin: string | null;
  billingPeriodEndsAt: string | null;
}

export interface VerifiedWebhook {
  eventId: string;
  eventType: string;
  occurredAt: string;
  data: any;
}

export interface PaymentProvider {
  readonly name: string;
  configStatus(): Promise<ProviderConfigStatus>;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  getPaymentStatus(transactionId: string): Promise<string>;
  getTransaction(transactionId: string): Promise<ProviderTransaction>;
  /** Returns the parsed event only if the signature is valid, otherwise null. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook | null>;
  refundPayment(transactionId: string, reason: string): Promise<{ id: string; status: string }>;
  cancelSubscription(subscriptionId: string): Promise<{ status: string; effectiveAt: string | null }>;
}
