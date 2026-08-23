import { NextResponse } from "next/server";
import { matchServices } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * "Which AI do I need?" — stage 1 matcher built purely on catalog data
 * (categories, tags, keywords, descriptions). No paid API required.
 *
 * Future AI stage: expand `task` into keywords with an LLM here, then pass the
 * enriched string to matchServices() — the rest of the pipeline stays the same.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { task?: string };
    const task = (body.task || "").trim();
    if (!task) {
      return NextResponse.json({ ok: false, error: "Task is required" }, { status: 400 });
    }

    const matches = await matchServices(task, 6);
    console.log(`[api/match] task="${task}" → ${matches.length} matches`);
    return NextResponse.json({ ok: true, data: matches });
  } catch (err: any) {
    console.error("[api/match] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
