"""
Procedural news generation.

News is the second information channel, and it works differently from
signals on purpose. A signal is a number with no story; news is a story with
no number. Together they let a player cross-check: a positive signal backed
by a plausible headline is worth more than either alone, and that reasoning
is the game.

Like signals, news is not always true. A headline is generated from the
company's real upcoming move most of the time, and occasionally from the
opposite — the same honesty problem players already face with signals, in
different clothing. The `truthful` flag is recorded for analysis and MUST NOT
be serialised to clients.

Headlines are assembled from templates rather than written per company, so
adding a seventh company needs no new copy. Templates are grouped by rough
sector because "expands its store network" is odd for a bank.

THESE ARE DEFAULTS. Edit the templates freely; nothing else depends on their
wording.
"""

from __future__ import annotations

from .models import Company, MarketSignal, NewsItem
from .rng import generator

#: Chance a headline points the same way as the real move.
TRUTHFUL_RATE = 0.75

#: Headlines generated per day.
NEWS_PER_DAY = 3

Sector = str

#: Which template bank each ticker draws from. Unknown tickers fall back to
#: "generic", so a new company works without being registered here.
SECTORS: dict[str, Sector] = {
    "TSLA": "industrial",
    "AAPL": "tech",
    "AMZN": "retail",
    "JPM": "finance",
    "NFLX": "media",
    "CVS": "health",
}

POSITIVE: dict[Sector, list[str]] = {
    "tech": [
        "{name} ships a long-delayed product to strong early reviews",
        "{name} reports record quarterly margins",
        "Analysts upgrade {name} on accelerating services revenue",
    ],
    "industrial": [
        "{name} lifts delivery guidance for the quarter",
        "{name} opens a new plant ahead of schedule",
        "{name} secures a major supply agreement",
    ],
    "retail": [
        "{name} expands its same-day logistics network",
        "{name} posts stronger-than-expected holiday volumes",
        "{name} cuts fulfilment costs for a third straight quarter",
    ],
    "finance": [
        "{name} beats on net interest income",
        "{name} raises its dividend after a stress-test pass",
        "{name} gains share in corporate lending",
    ],
    "media": [
        "{name} adds subscribers across every region",
        "{name} lands an exclusive rights deal",
        "{name} reports its strongest launch slate in years",
    ],
    "health": [
        "{name} wins approval for an expanded treatment line",
        "{name} reports improving pharmacy margins",
        "{name} signs a large employer benefits contract",
    ],
    "generic": [
        "{name} raises guidance for the coming quarter",
        "Analysts turn positive on {name}",
    ],
}

NEGATIVE: dict[Sector, list[str]] = {
    "tech": [
        "{name} delays a flagship launch again",
        "Regulators open an inquiry into {name}",
        "{name} warns on component costs",
    ],
    "industrial": [
        "{name} recalls units over a safety fault",
        "{name} misses production targets",
        "A supplier dispute disrupts {name} output",
    ],
    "retail": [
        "{name} flags softening consumer demand",
        "{name} writes down excess inventory",
        "Shipping costs squeeze {name} margins",
    ],
    "finance": [
        "{name} sets aside more for credit losses",
        "{name} faces a penalty over compliance failures",
        "Deposit outflows accelerate at {name}",
    ],
    "media": [
        "{name} subscriber growth slows in mature markets",
        "{name} loses a key content partnership",
        "Churn rises at {name} after a price increase",
    ],
    "health": [
        "{name} trading halted pending an announcement",
        "{name} loses a major pharmacy benefits contract",
        "A pricing probe weighs on {name}",
    ],
    "generic": [
        "{name} cuts its outlook for the quarter",
        "Analysts turn cautious on {name}",
    ],
}

MARKET_WIDE: list[str] = [
    "Central bank holds rates steady",
    "Inflation cools more than expected",
    "Bond yields ease after a softer jobs report",
    "Risk appetite returns as volatility subsides",
    "Markets drift ahead of the next policy review",
]


def _bank(bank: dict[Sector, list[str]], ticker: str) -> list[str]:
    return bank.get(SECTORS.get(ticker, "generic"), bank["generic"])


def generate_news(
    game_id: str,
    day: int,
    companies: list[Company],
    upcoming: dict[str, int],
    count: int = NEWS_PER_DAY,
) -> list[NewsItem]:
    """Headlines for `day`, derived from each company's upcoming move.

    `upcoming` maps ticker to the cent move the engine expects — normally
    from `signals.predict_true_moves`, so news and signals describe the same
    future rather than contradicting each other by accident.
    """
    rng = generator(game_id, day, 0, "news")
    by_ticker = {c.ticker: c for c in companies}
    tickers = [c.ticker for c in companies]
    if not tickers:
        return []

    items: list[NewsItem] = []

    for i in range(count):
        # Roughly one item in four is market-wide, which gives the feed some
        # texture and stops it reading as six per-company tickers in a row.
        if float(rng.random()) < 0.25:
            items.append(
                NewsItem(
                    id=f"{game_id}-d{day}-n{i}",
                    day=day,
                    ticker=None,
                    headline=str(rng.choice(MARKET_WIDE)),
                    truthful=True,
                )
            )
            continue

        ticker = str(rng.choice(tickers))
        company = by_ticker[ticker]
        move = upcoming.get(ticker, 0)
        truthful = float(rng.random()) < TRUTHFUL_RATE

        # A genuinely flat company still needs a direction to write about.
        really_up = move > 0 if move != 0 else bool(rng.random() < 0.5)
        says_up = really_up if truthful else not really_up

        bank = POSITIVE if says_up else NEGATIVE
        template = str(rng.choice(_bank(bank, ticker)))

        items.append(
            NewsItem(
                id=f"{game_id}-d{day}-n{i}",
                day=day,
                ticker=ticker,
                headline=template.format(name=company.short_name or company.name),
                truthful=truthful,
            )
        )

    return items


def public_news(items: list[NewsItem]) -> list[dict]:
    """Strip server-only fields before sending to clients.

    `truthful` must never reach the browser: it would turn every headline into
    a verified fact and delete the bluffing layer outright.
    """
    return [
        {
            "id": n.id,
            "day": n.day,
            "ticker": n.ticker,
            "headline": n.headline,
            "body": n.body,
        }
        for n in items
    ]
