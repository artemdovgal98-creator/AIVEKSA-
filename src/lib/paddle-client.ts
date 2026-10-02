"use client";

/**
 * Browser side of the Paddle checkout. The server decides the price id and
 * writes the order id / user id into custom data; the browser only opens the
 * overlay. Nothing here can activate a plan — that happens in the webhook.
 */

export interface PaddleCheckoutData {
  provider: string;
  orderId: string;
  priceId: string;
  clientToken: string;
  environment: "sandbox" | "production";
  customData: Record<string, string>;
  email?: string;
  successUrl: string;
}

declare global {
  interface Window {
    Paddle?: any;
  }
}

const SCRIPT_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";
let loading: Promise<any> | null = null;
let initializedToken: string | null = null;

function loadPaddle(): Promise<any> {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => (window.Paddle ? resolve(window.Paddle) : reject(new Error("Paddle.js unavailable")));
      script.onerror = () => {
        loading = null;
        reject(new Error("Paddle.js failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

export const paddleTxnKey = (orderId: string) => `aivexa_paddle_txn_${orderId}`;

export async function openPaddleCheckout(data: PaddleCheckoutData, locale: string, onClose?: () => void): Promise<void> {
  const Paddle = await loadPaddle();
  const eventCallback = (event: any) => {
    if (event?.name === "checkout.completed" && event?.data?.transaction_id) {
      // Lets the success page ask the server to re-check this transaction.
      try {
        sessionStorage.setItem(paddleTxnKey(data.orderId), String(event.data.transaction_id));
      } catch {
        /* storage unavailable (private mode) — the webhook still fulfils the order */
      }
      console.log("[paddle] checkout completed for order", data.orderId);
    }
    if (event?.name === "checkout.closed") onClose?.();
    if (event?.name === "checkout.error") console.error("[paddle] checkout error:", event?.error || event);
  };

  if (initializedToken !== data.clientToken) {
    if (data.environment === "sandbox") Paddle.Environment.set("sandbox");
    if (initializedToken === null) Paddle.Initialize({ token: data.clientToken, eventCallback });
    else Paddle.Update({ eventCallback });
    initializedToken = data.clientToken;
  } else {
    Paddle.Update({ eventCallback });
  }

  Paddle.Checkout.open({
    items: [{ priceId: data.priceId, quantity: 1 }],
    customData: data.customData,
    ...(data.email ? { customer: { email: data.email } } : {}),
    settings: {
      displayMode: "overlay",
      theme: "dark",
      locale: ["ru", "uk", "en"].includes(locale) ? locale : "en",
      successUrl: data.successUrl,
    },
  });
}
