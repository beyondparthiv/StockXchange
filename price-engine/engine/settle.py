"""
Round orchestration.

One place that runs a round end to end, so the ordering is stated once
instead of being re-derived by every caller. The ordering matters:

  1. Settle prices for the round that just closed.
  2. Deal signals for the round about to open — they must be derived from
     the NEXT round's draw, not the one just settled, or the cards would be
     describing history.
  3. Generate news on day boundaries only. Per-round news buries the feed and
     makes each item worth less.

The engine is stateless. The caller passes the world in and stores the world
that comes back. That keeps a round a pure function of its inputs, which is
what makes replay and testing possible.
"""

from __future__ import annotations

from .market import opening_quotes, settle_round
from .models import (
    Company,
    DealRequest,
    DealResult,
    MarketEvent,
    RoundRequest,
    RoundResult,
)
from .news import generate_news
from .rng import seed_for
from .signals import deal_signals, predict_true_moves


def _next_slot(day: int, round_no: int, rounds_per_day: int) -> tuple[int, int]:
    """The (day, round) that follows this one."""
    if round_no >= rounds_per_day:
        return day + 1, 1
    return day, round_no + 1


def deal_game(req: DealRequest) -> DealResult:
    """Opening state: prices at their initial values, plus the first round's
    signals and day one's news."""
    quotes = opening_quotes(req.companies)

    signals = deal_signals(req.game_id, 1, 1, req.companies, quotes)
    upcoming = predict_true_moves(req.game_id, 1, 1, req.companies, quotes)
    news = generate_news(req.game_id, 1, req.companies, upcoming)

    return DealResult(
        game_id=req.game_id,
        quotes=quotes,
        signals=signals,
        news=news,
        seed=seed_for(req.game_id, 1, 1, "prices"),
    )


def settle(req: RoundRequest) -> RoundResult:
    """Close the current round and open the next one."""
    quotes, changes = settle_round(
        game_id=req.game_id,
        day=req.day,
        round_no=req.round,
        companies=req.companies,
        quotes=req.quotes,
    )

    next_day, next_round = _next_slot(req.day, req.round, req.rounds_per_day)

    next_signals = deal_signals(
        req.game_id, next_day, next_round, req.companies, quotes
    )

    # News only on a day boundary.
    news = []
    if next_day != req.day:
        upcoming = predict_true_moves(
            req.game_id, next_day, next_round, req.companies, quotes
        )
        news = generate_news(req.game_id, next_day, req.companies, upcoming)

    events: list[MarketEvent] = []

    return RoundResult(
        game_id=req.game_id,
        day=req.day,
        round=req.round,
        quotes=quotes,
        changes=changes,
        events=events,
        next_signals=next_signals,
        news=news,
        seed=seed_for(req.game_id, req.day, req.round, "prices"),
    )


def default_companies() -> list[Company]:
    """The six-company roster the UI ships with.

    Volatilities are hand-set so the board has a spread of temperaments —
    something sleepy to park cash in, something that can ruin or make a
    round — rather than six instruments that all feel the same. Prices are in
    cents ($60–$100). TUNE FREELY.
    """
    return [
        Company(ticker="TSLA", short_name="Tesla", name="Tesla, Inc.", initial_price=9_500, volatility=0.065, drift=0.004),
        Company(ticker="AAPL", short_name="Apple", name="Apple Inc.", initial_price=8_000, volatility=0.035, drift=0.003),
        Company(ticker="AMZN", short_name="Amazon", name="Amazon.com, Inc.", initial_price=7_200, volatility=0.045, drift=0.003),
        Company(ticker="JPM", short_name="JPMorgan", name="JPMorgan Chase & Co.", initial_price=8_800, volatility=0.025, drift=0.002),
        Company(ticker="NFLX", short_name="Netflix", name="Netflix, Inc.", initial_price=10_000, volatility=0.055, drift=0.002),
        Company(ticker="CVS", short_name="CVS Health", name="CVS Health Corporation", initial_price=6_000, volatility=0.030, drift=0.001),
    ]
