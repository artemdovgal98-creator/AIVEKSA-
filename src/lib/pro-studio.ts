import "server-only";

/** AIVEXA PRO → AI Content Generator formats. Costs are in AIVEXA CREDITS, set on the server only. */
export const STUDIO_FORMATS = {
  article: { cost: 5, maxTokens: 2200, system: "You are a senior content writer and SEO editor.", task: (topic: string, extra: string) => `Write a complete, well-structured blog article about: "${topic}". Use a strong title, an intro, 4-6 sections with H2 headings (markdown ##), practical examples and a conclusion with a call to action. ${extra}` },
  campaign: { cost: 4, maxTokens: 1800, system: "You are a social media strategist.", task: (topic: string, extra: string) => `Create a multi-platform social campaign about: "${topic}". Provide separate ready-to-publish posts for Telegram, Instagram, TikTok (as a short video caption), X/Twitter and LinkedIn, each under a markdown ## heading with fitting tone, length and 3-6 hashtags. ${extra}` },
  video: { cost: 4, maxTokens: 1600, system: "You are a short-form video scriptwriter.", task: (topic: string, extra: string) => `Write a 45-60 second vertical video script about: "${topic}". Format: HOOK (first 3 seconds), then numbered scenes with on-screen text, voiceover and visual direction, and a final call to action. ${extra}` },
  email: { cost: 3, maxTokens: 1200, system: "You are an email marketing copywriter.", task: (topic: string, extra: string) => `Write a marketing email about: "${topic}". Give 3 subject line options, a preview text, the email body with short paragraphs and one clear call to action. ${extra}` },
  ads: { cost: 3, maxTokens: 1200, system: "You are a performance marketing copywriter.", task: (topic: string, extra: string) => `Write ad copy for: "${topic}". Provide 5 variants, each with a headline (max 40 chars), primary text (max 125 chars) and a call to action, plus 3 target audience angles. ${extra}` },
  plan: { cost: 5, maxTokens: 2000, system: "You are a content marketing planner.", task: (topic: string, extra: string) => `Create a 14-day content plan about: "${topic}". Markdown table with columns: Day, Platform, Format, Topic/Hook, Goal. After the table, add 5 tips to execute it. ${extra}` },
} as const;

export type StudioFormat = keyof typeof STUDIO_FORMATS;

export const STUDIO_TONES = ["friendly", "professional", "bold", "funny", "inspiring"] as const;
export type StudioTone = (typeof STUDIO_TONES)[number];
