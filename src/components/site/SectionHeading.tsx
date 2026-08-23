import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
  accent = "blue",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  accent?: "blue" | "violet" | "cyan";
}) {
  const dot =
    accent === "violet"
      ? "bg-[color:var(--neon-violet)]"
      : accent === "cyan"
      ? "bg-[color:var(--neon-cyan)]"
      : "bg-[color:var(--neon-blue)]";

  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dot} animate-pulse-glow`} />
          <h2 className="font-display text-xl font-bold text-white sm:text-2xl">{title}</h2>
        </div>
        {subtitle && <p className="mt-1.5 text-sm text-foreground/55">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground/70 transition-colors hover:text-white"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
