/**
 * Company brand registry.
 * ----------------------
 * One source of truth for every tradable company's visual identity: ticker,
 * legal name, brand accent, and logo asset path. The market tiles, order panel,
 * signal cards, portfolio rows, and news feed all read from here, so adding or
 * restyling a company is a single-line change — no component edits.
 *
 * Logo assets are NOT bundled: company logos are trademarks and are not ours to
 * redistribute. Drop an SVG at the `logo` path below and <CompanyLogo> picks it
 * up automatically (see public/logos/README.md). Until then it renders a clean
 * monogram in the brand accent — never a substitute icon or emoji.
 *
 * `accent` is used sparingly: a hairline border, a low-opacity watermark,
 * a small identity dot. It is never the tile's fill. Green and red stay
 * reserved for market direction.
 */

export type Company = {
  /** Exchange ticker — the primary identifier throughout the UI. */
  ticker: string;
  /** Full legal name, shown under the ticker. */
  name: string;
  /** Short name for tight spots (notifications, activity log). */
  shortName: string;
  /** Brand accent, used at low opacity only. */
  accent: string;
  /** Path under /public. Absent file falls back to a monogram. */
  logo: string;
  /** Monogram shown while/if no logo asset exists. */
  monogram: string;
};

export const COMPANIES: Company[] = [
  {
    ticker: "TSLA",
    name: "Tesla, Inc.",
    shortName: "Tesla",
    accent: "#cc0000",
    logo: "/logos/tsla.svg",
    monogram: "T",
  },
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    shortName: "Apple",
    accent: "#8e8e93",
    logo: "/logos/aapl.svg",
    monogram: "A",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    shortName: "Amazon",
    accent: "#ff9900",
    logo: "/logos/amzn.svg",
    monogram: "A",
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    shortName: "JPMorgan",
    accent: "#0f4c81",
    logo: "/logos/jpm.svg",
    monogram: "J",
  },
  {
    ticker: "NFLX",
    name: "Netflix, Inc.",
    shortName: "Netflix",
    accent: "#e50914",
    logo: "/logos/nflx.svg",
    monogram: "N",
  },
  {
    ticker: "CVS",
    name: "CVS Health Corporation",
    shortName: "CVS Health",
    accent: "#c8102e",
    logo: "/logos/cvs.svg",
    monogram: "C",
  },
];

const BY_TICKER = new Map(COMPANIES.map((c) => [c.ticker, c]));

/** Look up a company by ticker. Returns undefined for unknown tickers so
 *  callers can decide whether that's a bug or an IPO'd late entrant. */
export function getCompany(ticker: string): Company | undefined {
  return BY_TICKER.get(ticker.toUpperCase());
}

/**
 * The first `count` companies, matching GameConfig.companies. Keeps the market
 * roster derived from one ordered list rather than duplicated per screen.
 */
export function companiesForGame(count: number): Company[] {
  return COMPANIES.slice(0, count);
}
