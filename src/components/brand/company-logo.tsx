"use client";

import { useState } from "react";
import type { Company } from "@/lib/brand/companies";

/**
 * Renders a company's logo at a fixed size, falling back to a monogram tile in
 * the brand accent when the asset file isn't present yet. Client component
 * because the fallback depends on the image's load result.
 *
 * Deliberately not <Image>: these are small, fixed-size marks rendered many
 * times per screen, and a plain <img> with explicit dimensions avoids the
 * optimizer round-trip for what are already tiny SVGs.
 */
export function CompanyLogo({
  company,
  size = 24,
  className = "",
}: {
  company: Company;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: `${company.accent}1f`,
        color: company.accent,
      }}
      aria-hidden="true"
    >
      {failed ? (
        <span className="font-semibold" style={{ fontSize: size * 0.5 }}>
          {company.monogram}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={company.logo}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

/**
 * The oversized, very low-opacity brand mark that sits behind a stock tile
 * (§5). Recognisable but never competing with the numbers — absolutely
 * positioned, clipped by the tile, inert to pointer events. Renders nothing
 * when the asset is missing rather than showing a giant monogram.
 */
export function CompanyWatermark({
  company,
  className = "",
}: {
  company: Company;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -right-4 -bottom-4 select-none opacity-[0.07] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={company.logo}
        alt=""
        width={96}
        height={96}
        className="h-24 w-24 object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
