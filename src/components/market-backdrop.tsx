"use client";

import { usePathname } from "next/navigation";
import { COMPANIES } from "@/lib/brand/companies";

/**
 * The live market layer that sits behind every screen: ticker tape, candles,
 * a drawing price line, rising coins, and a news crawl.
 *
 * Design constraints that shape everything here:
 *  - It must never compete with the UI. Every layer is low-opacity, scaled by
 *    the `--backdrop-opacity` token so a theme can dial the whole thing down.
 *  - It must never intercept a click: the root is `fixed` + `pointer-events:
 *    none` + negative z-index.
 *  - It must not cause hydration mismatches, so every "random" value below is
 *    a fixed literal rather than Math.random(). This stays a server component.
 *  - Animation is transform/opacity only, so it composites on the GPU and
 *    doesn't thrash layout on a page that's already doing realtime work.
 *
 * All of it is switched off under prefers-reduced-motion (see globals.css).
 */

/** Deterministic pseudo-quotes for the tape. Display only — never game state. */
const QUOTES = [
  { t: "TSLA", p: "248.50", c: +2.41 },
  { t: "AAPL", p: "189.20", c: -0.87 },
  { t: "AMZN", p: "178.35", c: +1.12 },
  { t: "JPM", p: "201.77", c: +0.34 },
  { t: "NFLX", p: "612.40", c: -1.95 },
  { t: "CVS", p: "58.92", c: +3.08 },
];

const HEADLINES = [
  "Fed holds rates steady as inflation cools",
  "Chip demand lifts semiconductor index to record high",
  "Energy sector slips on weaker crude forecast",
  "Retail earnings beat expectations across the board",
  "Bond yields ease after softer jobs report",
];

/** Candle heights/directions — hand-tuned to look like a real session. */
const CANDLES = [
  { h: 38, w: 14, up: true },
  { h: 56, w: 22, up: true },
  { h: 30, w: 12, up: false },
  { h: 72, w: 30, up: true },
  { h: 44, w: 18, up: false },
  { h: 64, w: 26, up: true },
  { h: 34, w: 14, up: false },
  { h: 80, w: 34, up: true },
  { h: 48, w: 20, up: false },
  { h: 58, w: 24, up: true },
  { h: 36, w: 15, up: false },
  { h: 68, w: 28, up: true },
];

/** Coin glyph positions: left %, size, delay, duration. */
const COINS = [
  { left: 8, size: 26, delay: 0, dur: 19 },
  { left: 21, size: 16, delay: 5, dur: 24 },
  { left: 34, size: 32, delay: 11, dur: 17 },
  { left: 47, size: 18, delay: 2, dur: 27 },
  { left: 61, size: 24, delay: 8, dur: 21 },
  { left: 73, size: 14, delay: 14, dur: 25 },
  { left: 86, size: 30, delay: 4, dur: 18 },
  { left: 94, size: 20, delay: 9, dur: 23 },
];

function Tape({ reverse = false }: { reverse?: boolean }) {
  // Rendered twice so the strip can translate a full -50% and loop seamlessly.
  const row = [...QUOTES, ...COMPANIES.map((c) => ({ t: c.ticker, p: "", c: 0 }))];
  return (
    <div className={`mb-tape ${reverse ? "mb-tape-rev" : ""}`}>
      <div className="mb-tape-track">
        {[0, 1].map((copy) => (
          <div className="mb-tape-group" key={copy} aria-hidden="true">
            {row.map((q, i) => (
              <span className="mb-quote" key={`${copy}-${q.t}-${i}`}>
                <span className="mb-quote-t">{q.t}</span>
                {q.p && <span className="mb-quote-p">{q.p}</span>}
                {q.c !== 0 && (
                  <span className={q.c > 0 ? "mb-up" : "mb-down"}>
                    {q.c > 0 ? "▲" : "▼"} {Math.abs(q.c).toFixed(2)}%
                  </span>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketBackdrop() {
  const pathname = usePathname();
  // The two routes that render the board.
  const onBoard =
    pathname?.startsWith("/room/") || /^\/play\/[^/]+\/game/.test(pathname ?? "");
  if (onBoard) return null;

  return (
    <div className="market-backdrop" aria-hidden="true">
      {/* 1 — graph paper, drifting slowly upward */}
      <div className="mb-grid" />

      {/* 2 — ambient green/red wash */}
      <div className="mb-wash" />

      {/* 3 — ticker tapes, opposing directions at different speeds */}
      <div className="mb-tapes">
        <Tape />
        <Tape reverse />
      </div>

      {/* 4 — price line that draws itself, then resets */}
      <svg className="mb-line" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <path
          className="mb-line-path"
          d="M0 220 L100 190 L200 205 L300 150 L400 165 L500 110 L600 130 L700 80 L800 95 L900 55 L1000 70 L1100 30 L1200 45"
          fill="none"
          stroke="var(--c-tape-up)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
      </svg>

      {/* 5 — candlestick session along the bottom */}
      <div className="mb-candles">
        {CANDLES.map((c, i) => (
          <span
            key={i}
            className={`mb-candle ${c.up ? "mb-candle-up" : "mb-candle-down"}`}
            style={
              {
                "--h": `${c.h}px`,
                "--w": `${c.w}px`,
                "--d": `${i * 0.18}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* 6 — coins rising */}
      <div className="mb-coins">
        {COINS.map((c, i) => (
          <span
            key={i}
            className="mb-coin"
            style={
              {
                left: `${c.left}%`,
                "--size": `${c.size}px`,
                "--delay": `${c.delay}s`,
                "--dur": `${c.dur}s`,
              } as React.CSSProperties
            }
          >
            $
          </span>
        ))}
      </div>

      {/* 7 — news crawl along the very bottom */}
      <div className="mb-news">
        <div className="mb-news-track">
          {[0, 1].map((copy) => (
            <span className="mb-news-group" key={copy}>
              {HEADLINES.map((h, i) => (
                <span className="mb-headline" key={`${copy}-${i}`}>
                  <span className="mb-news-dot" />
                  {h}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
