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
  priceId: string;
  successUrl: string;
}

/** What the browser needs to open the provider's checkout. Contains no secrets. */
export interface CheckoutSession {
  provider: string;
  orderId: string;
  priceId: string;
  /** Public client-side token (designed by the provider to be exposed). */
  clientToken: string;
  environment: "sandbox" | "production";
  customData: Record<string, string>;
  email?: string;
  successUrl: string;
}

/** Normalised view of a provider transaction. */
export interface ProviderTransaction {
  id: string;
  status: string;
  paid: boolean;
  currency: string;
  /** Unit prices in minor units, keyed by price id. */
  items: { priceId: string; unitAmountMinor: number; quantity: number }[];
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
