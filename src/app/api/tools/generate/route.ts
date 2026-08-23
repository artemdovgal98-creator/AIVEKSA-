import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ToolId = "ideas" | "prompts" | "improve" | "names" | "descriptions" | "posts" | "hashtags";

const LANG_NAME: Record<string, string> = {
  ru: "Russian",
  uk: "Ukrainian",
  en: "English",
};

const PROMPTS: Record<ToolId, (topic: string, lang: string) => { system: string; user: string; maxTokens: number }> = {
  ideas: (topic, lang) => ({
    system: `You are a creative strategist. Always answer in ${lang}. Return a plain numbered list, no intro, no markdown headings.`,
    user: `Give 10 concrete, original ideas (content, product or project ideas) about: "${topic}". One line each, max 15 words per idea.`,
    maxTokens: 700,
  }),
  prompts: (topic, lang) => ({
    system: `You are a prompt engineer. Always answer in ${lang}. Return a plain numbered list of ready-to-paste prompts, no intro.`,
    user: `Write 7 high quality AI prompts for the task: "${topic}". Each prompt must be self-contained, specific, and mention style, format and constraints.`,
    maxTokens: 900,
  }),
  improve: (topic, lang) => ({
    system: `You are a professional editor. Always answer in ${lang}. Return only the rewritten text, nothing else.`,
    user: `Rewrite this text so it is clearer, more convincing and free of filler, keeping the original meaning and tone:\n\n${topic}`,
    maxTokens: 1200,
  }),
  names: (topic, lang) => ({
    system: `You are a brand naming expert. Always answer in ${lang}. Return a plain numbered list, name — short explanation.`,
    user: `Generate 12 memorable names for: "${topic}". Mix short brandable words, compound words and descriptive names.`,
    maxTokens: 700,
  }),
  descriptions: (topic, lang) => ({
    system: `You are a conversion copywriter. Always answer in ${lang}. Return three clearly separated variants: short, medium, long.`,
    user: `Write product/service descriptions for: "${topic}". Variant 1: up to 20 words. Variant 2: up to 60 words. Variant 3: up to 150 words with benefits.`,
    maxTokens: 900,
  }),
  posts: (topic, lang) => ({
    system: `You are a social media manager. Always answer in ${lang}. Return 3 ready-to-publish posts separated by a line with "---".`,
    user: `Write 3 social media posts about: "${topic}". Each with a strong hook, 2-4 short paragraphs, a call to action and 3-5 relevant hashtags at the end.`,
    maxTokens: 1100,
  }),
  hashtags: (topic, lang) => ({
    system: `You are a social media growth specialist. Always answer in ${lang}. Return only hashtags separated by spaces, no explanations.`,
    user: `Generate 30 relevant hashtags for a post about: "${topic}". Mix high volume, medium and niche hashtags.`,
    maxTokens: 400,
  }),
};

/**
 * Free AIVEXA text tools, powered by the AI model built into the Totalum SDK.
 * No third-party API key required from the site owner.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { tool?: ToolId; input?: string; lang?: string };
    const tool = body.tool as ToolId;
    const input = (body.input || "").trim().slice(0, 4000);
    const lang = LANG_NAME[body.lang || "ru"] || LANG_NAME.ru;

    if (!tool || !PROMPTS[tool]) {
      return NextResponse.json({ ok: false, error: "Unknown tool" }, { status: 400 });
    }
    if (!input) {
      return NextResponse.json({ ok: false, error: "Input is required" }, { status: 400 });
    }

    const { system, user, maxTokens } = PROMPTS[tool](input, lang);
    console.log(`[api/tools] generating with tool="${tool}" lang="${lang}"`);

    const result = await totalumSdk.openai.createChatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      model: "gpt-4.1-mini",
      max_tokens: maxTokens,
      temperature: 0.8,
    });

    if (result.errors) console.error("[api/tools] sdk errors:", result.errors);
    const text = result?.data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.error("[api/tools] empty completion payload:", JSON.stringify(result?.data)?.slice(0, 500));
      return NextResponse.json({ ok: false, error: "Empty AI response" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, data: { text } });
  } catch (err: any) {
    console.error("[api/tools] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
