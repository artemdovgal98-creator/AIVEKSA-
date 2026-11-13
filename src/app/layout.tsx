// src/app/layout.tsx
import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";
import { ScriptExecutor } from "@/components/ScriptExecutor";
import { DevToolsHandler } from "@/components/DevToolsHandler";
import { GlobalErrorCatcher } from "@/components/GlobalErrorCatcher";
import { TemporalLinkBanner } from "@/components/TemporalLinkBanner";
import { LanguageProvider } from "@/lib/i18n/context";
import { getServerDict } from "@/lib/i18n/server";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BottomNav } from "@/components/site/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { FavoritesProvider } from "@/components/site/FavoritesProvider";
import { TelegramMiniApp } from "@/components/site/TelegramMiniApp";
import { SiteCodeTags } from "@/components/site/SiteCodeTags";
import { parseSiteCode, type ParsedTag } from "@/lib/site-code";
import { getActiveSiteTags, tagsForRequest } from "@/lib/site-tags";
import { AdSlot } from "@/components/site/AdSlot";
import { getAdSlotsConfig } from "@/lib/ad-slots";
import { PwaServiceWorker } from "@/components/site/PwaServiceWorker";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getServerDict();
  return {
    metadataBase: new URL(appUrl),
    title: {
      default: t.seo.homeTitle,
      template: "%s · AIVEXA",
    },
    description: t.seo.homeDesc,
    applicationName: "AIVEXA",
    keywords: [
      "AI", "нейросети", "AI сервисы", "каталог AI", "искусственный интеллект",
      "AI tools", "нейромережі", "AI каталог", "генерация видео", "генерация изображений",
    ],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "AIVEXA",
      title: t.seo.homeTitle,
      description: t.seo.homeDesc,
      url: appUrl,
      locale: lang === "uk" ? "uk_UA" : lang === "en" ? "en_US" : "ru_RU",
    },
    twitter: {
      card: "summary_large_image",
      title: t.seo.homeTitle,
      description: t.seo.homeDesc,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0b16",
};

// SUPER IMPORTANT: NOT EDIT THE FOLLOWING 2 LINES TO FORCE NEXT.JS TO RENDER DYNAMICALLY
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await getServerDict();
  const pathname = (await headers()).get("x-pathname") || "";
  const isAdminPage = pathname.startsWith("/admin");

  // Admin-managed verification tags / widget scripts (Admin → System Settings → Integrations).
  // Never loaded on /admin/* pages.
  let headTags: ParsedTag[] = [];
  let bodyTags: ParsedTag[] = [];
  if (!isAdminPage) {
    const activeTags = await getActiveSiteTags().catch((err) => {
      console.error("[layout] site tags unavailable:", err);
      return [];
    });
    headTags = tagsForRequest(activeTags, "head", pathname).flatMap((tag) => parseSiteCode(tag.code));
    bodyTags = tagsForRequest(activeTags, "body", pathname).flatMap((tag) => parseSiteCode(tag.code));

    // Admin → Ads → "Код на всю страницу" (Social Bar): one site-wide script, same <meta>/<script>-only rule as Site Tags.
    const adSlots = await getAdSlotsConfig().catch((err) => {
      console.error("[layout] ad slots config unavailable:", err);
      return null;
    });
    if (adSlots?.socialBarCode) bodyTags = [...bodyTags, ...parseSiteCode(adSlots.socialBarCode)];
  }

  return (
    <html lang={lang} className="dark">
      <head>
        <SiteCodeTags tags={headTags} scope="head" />
      </head>
      <body className={`${unbounded.variable} ${manrope.variable} antialiased`}>
        <GlobalErrorCatcher />
        <ScriptExecutor />
        <DevToolsHandler />
        <PwaServiceWorker />
        {/* Boots the Telegram WebApp API when the site is opened as a Mini App. */}
        <TelegramMiniApp />
        {/* Development-preview only banner. Kept outside the page wrapper so it never covers content. */}
        <TemporalLinkBanner />
        <LanguageProvider initialLang={lang}>
          <FavoritesProvider>
            <div className="min-h-screen flex flex-col">
              <SiteHeader />
              {!isAdminPage && <AdSlot position="top" />}
              <main className="flex-1 pb-safe">{children}</main>
              {!isAdminPage && <AdSlot position="bottom" />}
              <SiteFooter />
              <BottomNav />
            </div>
            <Toaster position="top-center" richColors />
          </FavoritesProvider>
        </LanguageProvider>
        <SiteCodeTags tags={bodyTags} scope="body" />
      </body>
    </html>
  );
}
