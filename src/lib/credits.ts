import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { CREDIT_TRANSACTION_TYPES, type CreditAccountRecord, type CreditTransactionType } from "@/lib/types";

/**
 * AIVEXA Credits — a server-side ledger, separate from subscriptions.
 *
 * Invariants:
 *  - the balance can never go negative;
 *  - every change is written to ai_credit_transactions (with the balance after it);
 *  - a failed operation is never charged (see `withCredits`).
 */

export class InsufficientCreditsError extends Error {
  constructor(public balance: number, public required: number) {
    super(`Insufficient credits: balance ${balance}, required ${required}`);
    this.name = "InsufficientCreditsError";
  }
}

export async function getCreditAccount(userId: string): Promise<CreditAccountRecord | null> {
  const result = await totalumSdk.crud.query("ai_credit_accounts", { _filter: { user: userId }, _limit: 1 });
  if (result.errors) {
    console.error("[credits] account lookup failed:", result.errors);
    throw new Error("Credit account lookup failed");
  }
  return (((result.data || []) as unknown as CreditAccountRecord[])[0]) || null;
}

async function ensureAccount(userId: string): Promise<CreditAccountRecord> {
  const existing = await getCreditAccount(userId);
  if (existing) return existing;
  const created = await totalumSdk.crud.createRecord("ai_credit_accounts", { user: userId, balance: 0 });
  if (created.errors) {
    console.error("[credits] account create failed:", created.errors);
    throw new Error("Credit account create failed");
  }
  console.log("[credits] account created for", userId);
  return (await getCreditAccount(userId)) as CreditAccountRecord;
}

export async function getBalance(userId: string): Promise<number> {
  const account = await getCreditAccount(userId);
  return Math.max(Number(account?.balance) || 0, 0);
}

export interface CreditChange {
  userId: string;
  /** Positive = credit, negative = debit. Integer credits only. */
  amount: number;
  type: CreditTransactionType;
  referenceId?: string;
  description?: string;
}

/** Applies one ledger entry. Throws InsufficientCreditsError instead of going negative. */
export async function applyCreditChange(change: CreditChange): Promise<{ balance: number; transactionId: string }> {
  const amount = Math.trunc(Number(change.amount));
  if (!change.userId) throw new Error("userId is required");
  if (!Number.isFinite(amount) || amount === 0) throw new Error("amount must be a non-zero integer");
  if (!CREDIT_TRANSACTION_TYPES.includes(change.type)) throw new Error("invalid transaction type");

  const account = await ensureAccount(change.userId);
  const before = Math.max(Number(account.balance) || 0, 0);
  const after = before + amount;
  if (after < 0) throw new InsufficientCreditsError(before, -amount);

  const updated = await totalumSdk.crud.editRecordById("ai_credit_accounts", account._id, { balance: after });
  if (updated.errors) {
    console.error("[credits] balance update failed:", updated.errors);
    throw new Error("Balance update failed");
  }

  const tx = await totalumSdk.crud.createRecord("ai_credit_transactions", {
    user: change.userId,
    amount,
    type: change.type,
    balance_after: after,
    reference_id: change.referenceId || "",
    description: (change.description || "").slice(0, 250),
  });
  if (tx.errors) {
    // Never leave an unlogged balance change behind — roll the balance back.
    console.error("[credits] transaction log failed, rolling back:", tx.errors);
    await totalumSdk.crud.editRecordById("ai_credit_accounts", account._id, { balance: before });
    throw new Error("Credit transaction log failed");
  }

  console.log(`[credits] ${change.type} ${amount > 0 ? "+" : ""}${amount} for ${change.userId} → ${after}`);
  return { balance: after, transactionId: String((tx.data as any)?.insertedId || (tx.data as any)?._id || "") };
}

/**
 * Runs a paid operation. Credits are reserved first (so two parallel calls
 * cannot both spend the same balance) and automatically refunded when the
 * operation fails — a failed operation never costs the user anything.
 */
export async function withCredits<T>(
  userId: string,
  cost: number,
  referenceId: string,
  description: string,
  operation: () => Promise<T>
): Promise<T> {
  const debit = await applyCreditChange({ userId, amount: -Math.abs(cost), type: "usage", referenceId, description });
  try {
    return await operation();
  } catch (err) {
    console.error("[credits] operation failed, refunding", cost, "credits to", userId, err);
    await applyCreditChange({
      userId,
      amount: Math.abs(cost),
      type: "refund",
      referenceId: debit.transactionId || referenceId,
      description: `Refund: ${description}`,
    });
    throw err;
  }
}
