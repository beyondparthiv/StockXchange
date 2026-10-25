import { getMarketEmblems } from "@/lib/brand/emblems";

/**
 * Bull and bear watermarks behind the trading floor.
 *
 * These are head emblems paired with a trend arrow, not full-body figures.
 * That is a deliberate limit: a full charging-bull illustration drawn as raw
 * path data reads as a blob at any size, whereas horns, ears and a muzzle stay
 * legible even at watermark opacity. The arrow carries the bull/bear-market
 * meaning before the animal's shape resolves.
 *
 * To use a proper illustration instead, drop an SVG at the path named in
 * `lib/brand/emblems.ts` — it takes over with no component change, exactly
 * like the company logos. See public/emblems/README.md.
 *
 * Server component: pure markup and CSS, no state, no randomness. Inert
 * (`pointer-events: none`) and behind the board on a negative z-index.
 */

function BullEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 170 140"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* rising trend line, behind the head */}
      <g opacity="0.4">
        <path d="M4 126 L44 92 L68 110 L116 56 L128 66 L70 132 L46 114 L14 140 Z" />
        <path d="M100 34 L152 30 L146 82 L128 60 L116 46 Z" />
      </g>

      <g transform="translate(25 22)">
        {/* horns: thin crescents sweeping out and up to a point */}
        <path d="M43 30 C32 29 17 22 7 7 C14 19 25 26 41 23 Z" />
        <path d="M77 30 C88 29 103 22 113 7 C106 19 95 26 79 23 Z" />
        {/* ears, tucked under the horns */}
        <ellipse cx="34" cy="40" rx="8" ry="5" transform="rotate(-20 34 40)" opacity="0.75" />
        <ellipse cx="86" cy="40" rx="8" ry="5" transform="rotate(20 86 40)" opacity="0.75" />
        {/* head, tapering to the muzzle */}
        <path d="M44 24 C50 19 70 19 76 24 C82 35 80 50 74 62 C70 74 64 82 60 82 C56 82 50 74 46 62 C40 50 38 35 44 24 Z" />
        <ellipse cx="60" cy="70" rx="11" ry="9" opacity="0.55" />
        <circle cx="56" cy="70" r="2" opacity="0.9" />
        <circle cx="64" cy="70" r="2" opacity="0.9" />
        <circle cx="50" cy="42" r="3" opacity="0.5" />
        <circle cx="70" cy="42" r="3" opacity="0.5" />
      </g>
    </svg>
  );
}

function BearEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 170 140"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* falling trend line, behind the head */}
      <g opacity="0.4">
        <path d="M4 20 L44 54 L68 36 L116 90 L128 80 L70 14 L46 32 L14 6 Z" />
        <path d="M100 112 L152 116 L146 64 L128 86 L116 100 Z" />
      </g>

      <g transform="translate(25 22)">
        {/* round ears */}
        <circle cx="31" cy="28" r="16" opacity="0.9" />
        <circle cx="89" cy="28" r="16" opacity="0.9" />
        {/* head */}
        <path d="M60 19 C83 19 95 37 95 57 C95 78 80 92 60 92 C40 92 25 78 25 57 C25 37 37 19 60 19 Z" />
        {/* muzzle */}
        <ellipse cx="60" cy="71" rx="17" ry="13" opacity="0.55" />
        <ellipse cx="60" cy="63" rx="6.5" ry="4.5" opacity="0.9" />
        <circle cx="46" cy="49" r="3.4" opacity="0.5" />
        <circle cx="74" cy="49" r="3.4" opacity="0.5" />
      </g>
    </svg>
  );
}

export function BullBearBackdrop() {
  const { bull, bear } = getMarketEmblems();

  return (
    <div className="bullbear" aria-hidden="true">
      <div className="bullbear-bull">
        {bull ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bull} alt="" className="h-full w-full object-contain" />
        ) : (
          <BullEmblem className="h-full w-full" />
        )}
      </div>
      <div className="bullbear-bear">
        {bear ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bear} alt="" className="h-full w-full object-contain" />
        ) : (
          <BearEmblem className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
