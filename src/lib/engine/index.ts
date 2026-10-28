/**
 * The price & news engine, in TypeScript.
 *
 * This is a port of price-engine/ (FastAPI + numpy). The Python service is
 * still the reference implementation and keeps its test suite, but it
 * cannot be reached from a Vercel deployment without hosting a second
 * service — and when it is unreachable the game silently degrades: prices
 * nudge along a fallback path but signals and news never refresh, so every
 * day deals the same cards. Running the engine in-process removes that
 * whole class of failure, along with the cold starts and the CORS.
 *
 * The rules are unchanged from the Python version; only the language and
 * the random number generator differ, so a game seeded here will not match
 * a game seeded there. Within this implementation it is still fully
 * deterministic: same (gameId, day, round) always gives the same market.
 *
 * THE NUMBERS HERE ARE DEFAULTS, NOT REQUIREMENTS. See the comments.
 */

import type { Cents } from "@/lib/game/state";

/* ------------------------------------------------------------------ types */

export type EngineCompany = {
  ticker: string;
  name: string;
  shortName: string;
  initialPrice: Cents;
  /** Per-round standard deviation of return, as a fraction of price. */
  volatility: number;
  /** Per-round expected return, as a fraction of price. */
  drift: number;
};

export type EngineQuote = {
  ticker: string;
  initial: Cents;
  lastRound: Cents;
  current: Cents;
  frozen: boolean;
};

export type EngineSignal = { id: string; ticker: string; delta: Cents };

export type EngineNews = {
  id: string;
  day: number;
  ticker: string | null;
  headline: string;
  /** Server-side only — never returned to the client. */
  truthful: boolean;
};

/* -------------------------------------------------------------- constants */

/** Price floor. A company at zero can never recover and is dead weight. */
export const MIN_PRICE = 100; // $1

/**
 * Return clamp in standard deviations. Unclipped, a normal eventually
 * produces a 6-sigma move, and a company losing 30% in one round for no
 * visible reason reads as a bug rather than as drama.
 */
const SIGMA_CLIP = 2.5;

/** Eight signals plus two specials makes ten cards on the table. */
export const SIGNALS_PER_ROUND = 8;

/** Signals round to the nearest dollar so cards read "+$4", not "+$3.87". */
const SIGNAL_STEP = 100;

/**
 * Signal honesty. Roughly one card in six lies outright and most of the
 * rest are directionally useful but numerically soft. If every signal were
 * accurate the game would be "read the cards, buy the positive ones" —
 * pricing the uncertainty is the whole point. Must sum to 1.
 */
const ACCURATE_RATE = 0.55;
const VAGUE_RATE = 0.3;

/** Chance a headline points the same way as the real move. */
const TRUTHFUL_RATE = 0.75;

const NEWS_PER_DAY = 3;

/* -------------------------------------------------------------------- rng */

/**
 * Deterministic generator seeded on (gameId, day, round, purpose).
 *
 * Separate streams per purpose so that changing how many news items are
 * generated cannot shift the prices. Hashed rather than combined
 * arithmetically, so adjacent rounds do not get adjacent — and therefore
 * correlated — seeds.
 */
function seedFrom(gameId: string, day: number, round: number, purpose: string) {
  const key = `${gameId}|${day}|${round}|${purpose}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough for a game, and reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Box–Muller, clamped by the caller. */
    normal() {
      let u = next();
      let v = next();
      if (u < 1e-12) u = 1e-12;
      if (v < 1e-12) v = 1e-12;
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    between(lo: number, hi: number) {
      return lo + next() * (hi - lo);
    },
    pick<T>(items: T[]): T {
      return items[Math.floor(next() * items.length) % items.length];
    },
  };
}

/* ------------------------------------------------------------------ roster */

/**
 * Volatilities are hand-set so the board has a spread of temperaments —
 * something sleepy to park cash in, something that can make or ruin a round
 * — rather than six instruments that all feel the same. TUNE FREELY.
 */
export function defaultCompanies(): EngineCompany[] {
  return [
    { ticker: "TSLA", name: "Tesla, Inc.", shortName: "Tesla", initialPrice: 9_500, volatility: 0.065, drift: 0.004 },
    { ticker: "AAPL", name: "Apple Inc.", shortName: "Apple", initialPrice: 8_000, volatility: 0.035, drift: 0.003 },
    { ticker: "AMZN", name: "Amazon.com, Inc.", shortName: "Amazon", initialPrice: 7_200, volatility: 0.045, drift: 0.003 },
    { ticker: "JPM", name: "JPMorgan Chase & Co.", shortName: "JPMorgan", initialPrice: 8_800, volatility: 0.025, drift: 0.002 },
    { ticker: "NFLX", name: "Netflix, Inc.", shortName: "Netflix", initialPrice: 10_000, volatility: 0.055, drift: 0.002 },
    { ticker: "CVS", name: "CVS Health Corporation", shortName: "CVS Health", initialPrice: 6_000, volatility: 0.03, drift: 0.001 },
  ];
}

export function openingQuotes(companies: EngineCompany[]): EngineQuote[] {
  return companies.map((c) => ({
    ticker: c.ticker,
    initial: c.initialPrice,
    lastRound: c.initialPrice,
    current: c.initialPrice,
    frozen: false,
  }));
}

/* --------------------------------------------------------------- settling */

/**
 * The move each company WILL make in (day, round), in cents.
 *
 * Drawn from the same stream settlement uses, so the signals derived from
 * it are distortions of a real future rather than of a second guess. That
 * is what lets a careful player cross-reference several cards on one
 * company and converge on the truth.
 */
export function predictTrueMoves(
  gameId: string,
  day: number,
  round: number,
  companies: EngineCompany[],
  quotes: EngineQuote[],
): Record<string, number> {
  const r = rng(seedFrom(gameId, day, round, "prices"));
  const byTicker = new Map(companies.map((c) => [c.ticker, c]));
  const out: Record<string, number> = {};
  for (const q of quotes) {
    const c = byTicker.get(q.ticker);
    if (!c) {
      out[q.ticker] = 0;
      continue;
    }
    const z = Math.max(-SIGMA_CLIP, Math.min(SIGMA_CLIP, r.normal()));
    out[q.ticker] = Math.round(q.current * (c.drift + c.volatility * z));
  }
  return out;
}

/**
 * Advance every quote by one round.
 *
 * Multiplicative returns rather than flat amounts: a flat ±$5 is noise on a
 * $100 stock and a third of a $15 one. Returns keep every company equally
 * worth considering, which is the point when players choose between them.
 */
export function settleRound(
  gameId: string,
  day: number,
  round: number,
  companies: EngineCompany[],
  quotes: EngineQuote[],
): EngineQuote[] {
  const r = rng(seedFrom(gameId, day, round, "prices"));
  const byTicker = new Map(companies.map((c) => [c.ticker, c]));

  return quotes.map((q) => {
    const c = byTicker.get(q.ticker);
    const before = q.current;
    let after = before;
    if (c && !q.frozen) {
      const z = Math.max(-SIGMA_CLIP, Math.min(SIGMA_CLIP, r.normal()));
      after = Math.max(MIN_PRICE, Math.round(before * (1 + c.drift + c.volatility * z)));
    }
    return {
      ticker: q.ticker,
      initial: q.initial,
      lastRound: before,
      current: after,
      // Freezes last exactly one round; the caller re-applies anything
      // that should persist.
      frozen: false,
    };
  });
}

/* ---------------------------------------------------------------- signals */

function roundToStep(cents: number): number {
  if (cents === 0) return 0;
  const stepped = Math.round(cents / SIGNAL_STEP) * SIGNAL_STEP;
  // Never round a real hint down to nothing — a "$0" card wastes a slot.
  if (stepped === 0) return cents > 0 ? SIGNAL_STEP : -SIGNAL_STEP;
  return stepped;
}

export function dealSignals(
  gameId: string,
  day: number,
  round: number,
  companies: EngineCompany[],
  quotes: EngineQuote[],
  count = SIGNALS_PER_ROUND,
): EngineSignal[] {
  const truth = predictTrueMoves(gameId, day, round, companies, quotes);
  const r = rng(seedFrom(gameId, day, round, "signals"));
  const tickers = quotes.map((q) => q.ticker);
  if (tickers.length === 0) return [];

  // Every company gets at least one card before the rest are dealt at
  // random, so no instrument goes dark for a round.
  const order = [...tickers];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  while (order.length < count) order.push(r.pick(tickers));
  order.length = count;

  return order.map((ticker, i) => {
    let trueDelta = truth[ticker] ?? 0;
    if (trueDelta === 0) trueDelta = r.next() < 0.5 ? SIGNAL_STEP : -SIGNAL_STEP;

    const roll = r.next();
    let factor: number;
    if (roll < ACCURATE_RATE) {
      factor = 1 + r.between(-0.35, 0.35); // right way, close enough
    } else if (roll < ACCURATE_RATE + VAGUE_RATE) {
      factor = r.between(0.3, 2.0); // right way, size unreliable
    } else {
      factor = -r.between(0.4, 1.3); // wrong way, plausible size
    }

    return {
      id: `${gameId}-${day}-${round}-s${i}`,
      ticker,
      delta: roundToStep(Math.round(trueDelta * factor)),
    };
  });
}

/* ------------------------------------------------------------------- news */

const SECTORS: Record<string, string> = {
  TSLA: "industrial",
  AAPL: "tech",
  AMZN: "retail",
  JPM: "finance",
  NFLX: "media",
  CVS: "health",
};

const POSITIVE: Record<string, string[]> = {
  tech: ["{n} ships a long-delayed product to strong reviews", "{n} reports record quarterly margins", "Analysts upgrade {n} on accelerating services revenue"],
  industrial: ["{n} lifts delivery guidance for the quarter", "{n} opens a new plant ahead of schedule", "{n} secures a major supply agreement"],
  retail: ["{n} expands its same-day logistics network", "{n} posts stronger-than-expected holiday volumes", "{n} cuts fulfilment costs for a third straight quarter"],
  finance: ["{n} beats on net interest income", "{n} raises its dividend after a stress-test pass", "{n} gains share in corporate lending"],
  media: ["{n} adds subscribers across every region", "{n} lands an exclusive rights deal", "{n} reports its strongest launch slate in years"],
  health: ["{n} wins approval for an expanded treatment line", "{n} reports improving pharmacy margins", "{n} signs a large employer benefits contract"],
  generic: ["{n} raises guidance for the coming quarter", "Analysts turn positive on {n}"],
};

const NEGATIVE: Record<string, string[]> = {
  tech: ["{n} delays a flagship launch again", "Regulators open an inquiry into {n}", "{n} warns on component costs"],
  industrial: ["{n} recalls units over a safety fault", "{n} misses production targets", "A supplier dispute disrupts {n} output"],
  retail: ["{n} flags softening consumer demand", "{n} writes down excess inventory", "Shipping costs squeeze {n} margins"],
  finance: ["{n} sets aside more for credit losses", "{n} faces a penalty over compliance failures", "Deposit outflows accelerate at {n}"],
  media: ["{n} subscriber growth slows in mature markets", "{n} loses a key content partnership", "Churn rises at {n} after a price increase"],
  health: ["{n} trading halted pending an announcement", "{n} loses a major pharmacy benefits contract", "A pricing probe weighs on {n}"],
  generic: ["{n} cuts its outlook for the quarter", "Analysts turn cautious on {n}"],
};

const MARKET_WIDE = [
  "Central bank holds rates steady",
  "Inflation cools more than expected",
  "Bond yields ease after a softer jobs report",
  "Risk appetite returns as volatility subsides",
  "Markets drift ahead of the next policy review",
];

function bank(b: Record<string, string[]>, ticker: string) {
  return b[SECTORS[ticker] ?? "generic"] ?? b.generic;
}

/**
 * Headlines for `day`, derived from the same upcoming moves the signals
 * describe, so the two channels talk about one future instead of
 * contradicting each other by accident.
 *
 * Truthful 75% of the time. A signal is a number with no story and a
 * headline is a story with no number; crossing them is how a player builds
 * conviction, and that only means something if neither is guaranteed.
 */
export function generateNews(
  gameId: string,
  day: number,
  companies: EngineCompany[],
  upcoming: Record<string, number>,
  count = NEWS_PER_DAY,
): EngineNews[] {
  const r = rng(seedFrom(gameId, day, 0, "news"));
  const byTicker = new Map(companies.map((c) => [c.ticker, c]));
  const tickers = companies.map((c) => c.ticker);
  if (tickers.length === 0) return [];

  const items: EngineNews[] = [];
  // Without this the same company can draw the same template twice and the
  // feed shows one headline twice in three lines, which reads as a bug.
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Roughly one in four is market-wide, so the feed is not just six
    // per-company tickers in a row.
    if (r.next() < 0.25) {
      let headline = r.pick(MARKET_WIDE);
      for (let t = 0; t < 4 && used.has(`|${headline}`); t++) headline = r.pick(MARKET_WIDE);
      used.add(`|${headline}`);
      items.push({ id: `${gameId}-d${day}-n${i}`, day, ticker: null, headline, truthful: true });
      continue;
    }

    const ticker = r.pick(tickers);
    const company = byTicker.get(ticker)!;
    const move = upcoming[ticker] ?? 0;
    const truthful = r.next() < TRUTHFUL_RATE;
    const reallyUp = move !== 0 ? move > 0 : r.next() < 0.5;
    const saysUp = truthful ? reallyUp : !reallyUp;

    let template = r.pick(bank(saysUp ? POSITIVE : NEGATIVE, ticker));
    for (let t = 0; t < 4 && used.has(`${ticker}|${template}`); t++) {
      template = r.pick(bank(saysUp ? POSITIVE : NEGATIVE, ticker));
    }
    used.add(`${ticker}|${template}`);

    items.push({
      id: `${gameId}-d${day}-n${i}`,
      day,
      ticker,
      headline: template.replace("{n}", company.shortName || company.name),
      truthful,
    });
  }

  return items;
}

/**
 * Strip server-only fields before anything reaches a client.
 *
 * `truthful` must never be serialised: it would tell the player exactly
 * which headlines are lies and delete the bluffing layer outright.
 */
export function publicNews(items: EngineNews[]) {
  return items.map(({ id, day, ticker, headline }) => ({
    id,
    day,
    ticker,
    headline,
  }));
}

/* ----------------------------------------------------------- orchestration */

export function nextSlot(day: number, round: number, roundsPerDay: number) {
  return round >= roundsPerDay ? { day: day + 1, round: 1 } : { day, round: round + 1 };
}

export function dealGame(gameId: string, companies = defaultCompanies()) {
  const quotes = openingQuotes(companies);
  return {
    quotes,
    signals: dealSignals(gameId, 1, 1, companies, quotes),
    news: publicNews(
      generateNews(gameId, 1, companies, predictTrueMoves(gameId, 1, 1, companies, quotes)),
    ),
  };
}

/**
 * Close a round and open the next.
 *
 * Ordering matters: settle first, then deal signals for the round about to
 * open (from the NEXT draw, or the cards would describe history), and
 * generate news only on a day boundary — per-round news buries the feed and
 * makes every item worth less.
 */
export function settle(
  gameId: string,
  day: number,
  round: number,
  roundsPerDay: number,
  quotes: EngineQuote[],
  companies = defaultCompanies(),
) {
  const settled = settleRound(gameId, day, round, companies, quotes);
  const slot = nextSlot(day, round, roundsPerDay);
  const nextSignals = dealSignals(gameId, slot.day, slot.round, companies, settled);

  const news =
    slot.day !== day
      ? publicNews(
          generateNews(
            gameId,
            slot.day,
            companies,
            predictTrueMoves(gameId, slot.day, slot.round, companies, settled),
          ),
        )
      : [];

  return { quotes: settled, nextSignals, news };
}

/** True direction of a company's next move — the Insider Tip card. */
export function insight(
  gameId: string,
  day: number,
  round: number,
  ticker: string,
  quotes: EngineQuote[],
  companies = defaultCompanies(),
): "up" | "down" | "flat" {
  const moves = predictTrueMoves(gameId, day, round, companies, quotes);
  const d = moves[ticker] ?? 0;
  return d > 0 ? "up" : d < 0 ? "down" : "flat";
}
