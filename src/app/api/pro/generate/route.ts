import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { hasAccess } from "@/lib/access";
import { InsufficientCreditsError, getBalance, withCredits } from "@/lib/credits";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { STUDIO_FORMATS, STUDIO_TONES, type StudioFormat } from "@/lib/pro-studio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** AIVEXA PRO, or any plan that includes the content generator rule. */
async function canUseStudio(user: { _id: string }) {
  return (await hasAccess(user, "pro")) || (await hasAccess(user, "content_generator"));
}

const LANG_NAME: Record<string, string> = { ru: "Russian", uk: "Ukrainian", en: "English" };

/** GET — formats with their credit cost + the caller's access and balance. */
export async function GET() {
  try {
    const user = await getCurrentDbUser();
    const pro = user ? await canUseStudio(user) : false;
    const balance = user ? await getBalance(user._id) : 0;
    const formats = Object.entries(STUDIO_FORMATS).map(([id, format]) => ({ id, cost: format.cost }));
    return NextResponse.json({ ok: true, data: { signedIn: Boolean(user), pro, balance, formats } });
  } catch (err: any) {
    console.error("[api/pro/generate] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * POST { format, topic, tone, lang, details } — AIVEXA PRO AI Content Generator.
 * Access and cost are decided here (never by the browser). Credits are reserved
 * before the AI call and refunded automatically if generation fails.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sign in required", code: "AUTH_REQUIRED" }, { status: 401 });
    if (!(await canUseStudio(user))) {
      return NextResponse.json({ ok: false, error: "AIVEXA PRO required", code: "PRO_REQUIRED" }, { status: 403 });
    }
    if (!rateLimit(`studio:${user._id}:${clientIp(request)}`, 10, 60_000)) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const format = String(body.format || "") as StudioFormat;
    const spec = STUDIO_FORMATS[format];
    if (!spec) return NextResponse.json({ ok: false, error: "Unknown format" }, { status: 400 });
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 500) : "";
    if (topic.length < 3) return NextResponse.json({ ok: false, error: "Topic is required" }, { status: 400 });
    const details = typeof body.details === "string" ? body.details.trim().slice(0, 1500) : "";
    const tone = STUDIO_TONES.includes(body.tone as any) ? String(body.tone) : "friendly";
    const lang = LANG_NAME[String(body.lang || "ru")] || LANG_NAME.ru;

    console.log(`[api/pro/generate] ${user._id} format=${format} cost=${spec.cost}`);
    const text = await withCredits(user._id, spec.cost, `studio:${format}`, `AI Studio: ${format}`, async () => {
      const result = await totalumSdk.openai.createChatCompletion({
        messages: [
          { role: "system", content: `${spec.system} Always answer in ${lang}. Tone: ${tone}. Use clean markdown. No preamble.` },
          { role: "user", content: spec.task(topic, details ? `Extra requirements: ${details}` : "") },
        ],
        model: "gpt-4.1-2025-04-14",
        max_tokens: spec.maxTokens,
        temperature: 0.8,
      });
      if (result.errors) console.error("[api/pro/generate] sdk errors:", result.errors);
      const content = result?.data?.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty AI response");
      return content as string;
    });

    const balance = await getBalance(user._id);
    return NextResponse.json({ ok: true, data: { text, cost: spec.cost, balance } });
  } catch (err: any) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { ok: false, error: "Not enough AI credits", code: "NO_CREDITS", data: { balance: err.balance, required: err.required } },
        { status: 402 }
      );
    }
    console.error("[api/pro/generate] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
