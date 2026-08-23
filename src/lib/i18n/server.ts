import { cookies } from "next/headers";
import { dictionaries } from "./dictionaries";
import type { Lang } from "@/lib/types";

export const LANG_COOKIE = "aivexa_lang";

/** Reads the visitor language from the cookie set by the client LanguageProvider. */
export async function getServerLang(): Promise<Lang> {
  try {
    const store = await cookies();
    const value = store.get(LANG_COOKIE)?.value;
    if (value === "ru" || value === "uk" || value === "en") return value;
  } catch (err) {
    console.error("[i18n] could not read language cookie:", err);
  }
  return "ru";
}

export async function getServerDict() {
  const lang = await getServerLang();
  return { lang, t: dictionaries[lang] };
}
