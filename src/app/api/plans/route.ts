import { NextResponse } from "next/server";
import { getActivePlans } from "@/lib/access";
import { isPaymentsConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Public list of paid plans. The main AI catalog is free and is never a plan. */
export async function GET() {
  try {
    const plans = await getActivePlans();
    const data = plans.map((plan) => ({
      _id: plan._id,
      name: plan.name,
      slug: plan.slug,
      price: Number(plan.price) || 0,
      currency: plan.currency || "usd",
      duration_days: Number(plan.duration_days) || 30,
      description: plan.description || "",
      features: String(plan.features || "").split("\n").map((line) => line.trim()).filter(Boolean),
      ai_credits: Number(plan.ai_credits) || 0,
    }));
    return NextResponse.json({ ok: true, data: { plans: data, paymentsConfigured: await isPaymentsConfigured() } });
  } catch (err: any) {
    console.error("[api/plans] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
