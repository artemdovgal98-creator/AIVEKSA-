import Link from "next/link";
import { Coins, Crown, User } from "lucide-react";
import { getCurrentDbUser, getSessionUser } from "@/lib/admin-auth";
import { getActiveSubscription, planOf } from "@/lib/access";
import { getBalance } from "@/lib/credits";

interface ProfileBarText {
  profileHello: string;
  profileFree: string;
  profileProUntil: string;
  profileCredits: string;
  profileOpen: string;
  profileGetPro: string;
}

/**
 * Compact profile card at the very top of the home page (signed-in users only):
 * avatar, name, current plan and AI-credit balance — all read from the database.
 */
export async function HomeProfileBar({ text }: { text: ProfileBarText }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.id) return null;

  const [user, subscription, credits] = await Promise.all([
    getCurrentDbUser(),
    getActiveSubscription(sessionUser.id).catch((err) => {
      console.error("[home-profile] subscription lookup failed:", err);
      return null;
    }),
    getBalance(sessionUser.id).catch((err) => {
      console.error("[home-profile] balance lookup failed:", err);
      return null;
    }),
  ]);
  if (!user) return null;

  const photos = ((user as any).photos || []) as { url?: string }[];
  const avatar = photos.find((photo) => photo?.url)?.url || sessionUser.image || "";
  const name = (user.name || sessionUser.name || user.email || "").trim();
  const initials = name ? name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") : "";
  const plan = planOf(subscription);
  const isPro = Boolean(subscription && plan);
  console.log(`[home-profile] user ${user._id} pro=${isPro} credits=${credits ?? "N/A"}`);

  return (
    <div className="relative mx-auto max-w-4xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="glass-strong animate-fade-up flex min-w-0 items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4">
        <Link href="/profile" className="relative shrink-0" aria-label={text.profileOpen}>
          {avatar ? (
            <img src={avatar} alt={name || "Avatar"} className="h-12 w-12 rounded-full border border-white/15 object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4c6fff] to-[#a855f7] font-display text-sm font-bold text-white">
              {initials || <User className="h-5 w-5" />}
            </span>
          )}
          {isPro && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 shadow">
              <Crown className="h-3 w-3 text-black" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-white sm:text-base">
            {text.profileHello}
            {name ? `, ${name}` : ""} 👋
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
            {isPro ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                <Crown className="h-3 w-3" />
                {text.profileProUntil} {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : "N/A"}
              </span>
            ) : (
              <span className="text-foreground/55">{text.profileFree}</span>
            )}
            <span className="inline-flex items-center gap-1 text-foreground/70">
              <Coins className="h-3 w-3 text-amber-300" />
              {credits ?? "N/A"} {text.profileCredits}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isPro && (
            <Link
              href="/pro"
              className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-3 py-2 text-xs font-bold text-white sm:inline-flex"
            >
              <Crown className="h-3.5 w-3.5" />
              {text.profileGetPro}
            </Link>
          )}
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            <User className="h-3.5 w-3.5" />
            {text.profileOpen}
          </Link>
        </div>
      </div>
    </div>
  );
}
