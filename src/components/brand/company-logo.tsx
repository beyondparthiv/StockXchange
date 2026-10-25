"use client";

import { useState } from "react";
import type { Company } from "@/lib/brand/companies";

/**
 * Renders a company's logo at a fixed size, falling back to a monogram tile in
 * the brand accent.
 *
 * Two things make the fallback fiddlier than it looks:
 *
 *  - `company.logo` is null until a real asset is added, and in that case no
 *    <img> is rendered at all. Pointing at a missing file would fire a 404 for
 *    every logo on every page — dozens per render of the game board.
 *  - When an <img> IS rendered, it is server-rendered, so a broken src fires
 *    its `error` event before React hydrates and `onError` never runs. The ref
 *    callback catches that case by inspecting the element on attach: a decoded
 *    image has a non-zero naturalWidth, a broken one does not.
 *
 * Deliberately not <Image>: these are small, fixed-size marks rendered many
 * times per screen, and a plain <img> avoids the optimizer round-trip for what
 * are already tiny SVGs.
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
  const showImage = Boolean(company.logo) && !failed;

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
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0) setFailed(true);
          }}
          src={company.logo as string}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-semibold leading-none"
          style={{ fontSize: Math.max(9, Math.round(size * 0.46)) }}
        >
          {company.monogram}
        </span>
      )}
    </span>
  );
}

/**
 * The oversized, very low-opacity brand mark behind a stock tile. Recognisable,
 * but never competing with the numbers — absolutely positioned, clipped by the
 * tile, inert to pointer events. Renders nothing when there is no asset rather
 * than showing a giant monogram.
 */
export function CompanyWatermark({
  company,
  className = "",
}: {
  company: Company;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!company.logo || failed) return null;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -right-4 -bottom-4 select-none opacity-[0.07] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={(el) => {
          if (el && el.complete && el.naturalWidth === 0) setFailed(true);
        }}
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
