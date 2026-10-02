import React from "react";
import type { ParsedTag } from "@/lib/site-code";

const PROP_NAMES: Record<string, string> = {
  charset: "charSet",
  crossorigin: "crossOrigin",
  referrerpolicy: "referrerPolicy",
  nomodule: "noModule",
  "http-equiv": "httpEquiv",
  fetchpriority: "fetchPriority",
  class: "className",
};

function toProps(attrs: Record<string, string | true>): Record<string, string | boolean> {
  const props: Record<string, string | boolean> = {};
  for (const [name, value] of Object.entries(attrs)) props[PROP_NAMES[name] || name] = value === true ? (name.startsWith("data-") ? "" : true) : value;
  return props;
}

/** Renders admin-provided <meta>/<script> tags as real elements so they execute on page load. */
export function SiteCodeTags({ tags, scope }: { tags: ParsedTag[]; scope: string }) {
  return (
    <>
      {tags.map((tag, index) =>
        tag.kind === "meta" ? (
          <meta key={`${scope}-${index}`} {...toProps(tag.attrs)} />
        ) : (
          <script
            key={`${scope}-${index}`}
            {...toProps(tag.attrs)}
            {...(tag.inline ? { dangerouslySetInnerHTML: { __html: tag.inline } } : {})}
          />
        )
      )}
    </>
  );
}
