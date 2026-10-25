"""
Wire types for the engine.

These mirror `src/lib/game/state.ts` on the web side — same field names, same
units — so a settlement response can be handed to the UI with no translation
layer in between. If you change a name here, change it there.

Money is integer **cents** everywhere. Floats drift once you start
multiplying share counts by prices and summing P&L across twenty rounds, and
a net worth that disagrees with itself is the kind of bug players notice and
never forgive in a competitive game.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

Cents = int


class Direction(str, Enum):
    UP = "up"
    DOWN = "down"
    FLAT = "flat"


class Company(BaseModel):
    """A tradable instrument. `volatility` is the per-round standard deviation
    of its return, as a fraction of price — 0.04 means ~4%."""

    ticker: str
    name: str
    #: Name used in headlines. "Tesla misses production targets" reads like
    #: news; "Tesla, Inc. misses production targets" reads like a filing.
    short_name: str = ""
    initial_price: Cents
    volatility: float = Field(default=0.045, ge=0.0, le=0.5)
    drift: float = Field(
        default=0.0,
        ge=-0.1,
        le=0.1,
        description="Per-round expected return, as a fraction of price.",
    )


class Quote(BaseModel):
    ticker: str
    initial: Cents
    last_round: Cents
    current: Cents
    frozen: bool = False


class MarketSignal(BaseModel):
    """A hint shown to players.

    `delta` is NOT necessarily the true move — see engine/signals.py. Signals
    are imperfect information by design; that uncertainty is the game.
    """

    id: str
    ticker: str
    delta: Cents


class NewsItem(BaseModel):
    id: str
    day: int
    ticker: str | None
    headline: str
    body: str | None = None
    #: Whether this item actually reflects the move.
    #:
    #: `exclude=True` keeps it out of every serialisation, which is the only
    #: reliable guard: a `public_news()`-style helper only protects the call
    #: sites that remember to use it, and the API returns this model directly.
    #: Leaking it would tell the player exactly which headlines are lies and
    #: delete the bluffing layer outright.
    truthful: bool = Field(default=True, exclude=True)


class PriceChange(BaseModel):
    ticker: str
    before: Cents
    after: Cents
    delta: Cents
    percent: float
    direction: Direction


class MarketEvent(BaseModel):
    """A market event card that fired this round, with the effect applied."""

    key: str
    name: str
    description: str
    tickers: list[str] = Field(default_factory=list)


class RoundRequest(BaseModel):
    """Everything the engine needs to settle one round.

    The engine is stateless: the caller owns persistence and passes the world
    in. That keeps settlement a pure function of its inputs, which makes it
    testable and makes a replay of (game_id, day, round) produce an identical
    result.
    """

    game_id: str
    day: int
    round: int
    rounds_per_day: int = 2
    companies: list[Company]
    quotes: list[Quote]
    #: Signals dealt for this round, echoed back so the caller can reconcile.
    signals: list[MarketSignal] = Field(default_factory=list)


class RoundResult(BaseModel):
    game_id: str
    day: int
    round: int
    quotes: list[Quote]
    changes: list[PriceChange]
    events: list[MarketEvent]
    #: Signals for the NEXT round, dealt now so the UI can show them during it.
    next_signals: list[MarketSignal]
    news: list[NewsItem]
    seed: int


class DealRequest(BaseModel):
    """Opening state for a new game."""

    game_id: str
    companies: list[Company]
    days: int = 10
    rounds_per_day: int = 2


class DealResult(BaseModel):
    game_id: str
    quotes: list[Quote]
    signals: list[MarketSignal]
    news: list[NewsItem]
    seed: int


class InsightRequest(BaseModel):
    """Ask for the true direction of one company's next move."""

    game_id: str
    day: int
    round: int
    ticker: str
    companies: list[Company]
    quotes: list[Quote]


class InsightResult(BaseModel):
    ticker: str
    direction: Direction


SettlementMode = Literal["normal", "frozen", "no_change"]
