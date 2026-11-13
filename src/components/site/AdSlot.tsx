import { getAdSlotsConfig } from "@/lib/ad-slots";
import { viewerHasNoAds } from "@/components/site/AdBanner";

/**
 * Site-wide top/bottom ad network zone (Admin → Ads). The code (e.g. Adsterra
 * 300x250 / 320x50) runs inside a sandboxed iframe: these network snippets
 * rely on `document.write`, which would erase the real page if it ran there
 * directly after hydration. `overflow-hidden` + a capped width keep a
 * misbehaving ad from ever causing horizontal scroll.
 */
export async function AdSlot({ position }: { position: "top" | "bottom" }) {
  if (await viewerHasNoAds()) return null;
  const config = await getAdSlotsConfig();
  const enabled = position === "top" ? config.topEnabled : config.bottomEnabled;
  const code = (position === "top" ? config.topCode : config.bottomCode).trim();
  const maxHeight = position === "top" ? config.topMaxHeight : config.bottomMaxHeight;
  if (!enabled || !code) return null;

  const doc = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:transparent;}</style></head><body>${code}</body></html>`;

  console.log(`[ad-slot] rendering ${position} network ad code`);

  return (
    <div className="mx-auto flex w-full max-w-[340px] justify-center overflow-hidden px-4 py-2">
      <iframe
        srcDoc={doc}
        title={`ad-${position}`}
        scrolling="no"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{ width: "100%", maxWidth: 320, height: maxHeight, border: 0 }}
      />
    </div>
  );
}
