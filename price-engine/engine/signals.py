"""
Market signal generation.

This is the heart of the game, so it is worth being precise about what a
signal is.

A signal is a HINT about what a company may do next round. It is not a
promise, and the engine deliberately makes some of them wrong. If every
signal were accurate the game would be an arithmetic exercise: read ten
cards, buy the positive ones, win. The uncertainty is the game — players are
pricing a probability, not following instructions.

How a round's signals are built
-------------------------------
1. The engine draws each company's TRUE move for next round first, using the
   same seeded generator settlement will use. The hints are therefore derived
   from the real future, not invented independently.
2. Ten cards are dealt across the companies, weighted so no company is silent
   and none dominates.
3. Each card is then distorted:
      - ACCURATE  (~55%) — right direction, magnitude within ±35%.
      - VAGUE     (~30%) — right direction, magnitude off by up to 2x.
      - FALSE     (~15%) — wrong direction entirely.
   So roughly one card in six actively lies, and most of the rest are
   directionally useful but numerically soft.

That mix is a starting point, not a law. Raise FALSE_RATE for a meaner game;
lower it for a gentler one. The three rates must sum to 1.
"""

from __future__ import annotations

import numpy as np

from .models import Company, MarketSignal, Quote
from .rng import generator

ACCURATE_RATE = 0.55
VAGUE_RATE = 0.30
FALSE_RATE = 0.15

#: Eight signals per round. With the two special cards that makes ten cards
#: on the table — the grid is 5 columns x 2 rows, and ten tiles at a
#: readable size is what fits the centre column.
SIGNALS_PER_ROUND = 8

#: Signals are rounded to a readable step so cards read "+$4", not "+$3.87".
SIGNAL_STEP = 100  # $1


def _round_to_step(cents: int) -> int:
    if cents == 0:
        return 0
    stepped = int(round(cents / SIGNAL_STEP)) * SIGNAL_STEP
    # Never round a non-zero hint down to zero — a "$0" card tells nobody
    # anything and wastes a slot.
    if stepped == 0:
        stepped = SIGNAL_STEP if cents > 0 else -SIGNAL_STEP
    return stepped


def predict_true_moves(
    game_id: str,
    day: int,
    round_no: int,
    companies: list[Company],
    quotes: list[Quote],
) -> dict[str, int]:
    """The move each company WILL make next round, in cents.

    Drawn from the generator settlement will use for that round, so the hints
    below are distortions of a real future rather than of a guess.
    """
    from .market import SIGMA_CLIP  # local import avoids a cycle

    rng = generator(game_id, day, round_no, "prices")
    by_ticker = {c.ticker: c for c in companies}
    moves: dict[str, int] = {}

    for q in quotes:
        company = by_ticker.get(q.ticker)
        if company is None:
            moves[q.ticker] = 0
            continue
        z = float(rng.standard_normal())
        z = max(-SIGMA_CLIP, min(SIGMA_CLIP, z))
        r = company.drift + company.volatility * z
        moves[q.ticker] = round(q.current * r)

    return moves


def deal_signals(
    game_id: str,
    day: int,
    round_no: int,
    companies: list[Company],
    quotes: list[Quote],
    count: int = SIGNALS_PER_ROUND,
) -> list[MarketSignal]:
    """Deal `count` signal cards hinting at the move in (day, round_no)."""
    true_moves = predict_true_moves(game_id, day, round_no, companies, quotes)
    rng = generator(game_id, day, round_no, "signals")

    tickers = [q.ticker for q in quotes]
    if not tickers:
        return []

    # Give every company at least one card before dealing the remainder at
    # random, so no instrument goes completely dark for a round.
    order: list[str] = list(tickers)
    rng.shuffle(order)
    while len(order) < count:
        order.append(str(rng.choice(tickers)))
    order = order[:count]
    rng.shuffle(order)

    signals: list[MarketSignal] = []
    for i, ticker in enumerate(order):
        true_delta = true_moves.get(ticker, 0)

        # A company that genuinely is not moving still needs a readable card;
        # give it a small hint in an arbitrary direction.
        if true_delta == 0:
            true_delta = SIGNAL_STEP * (1 if rng.random() < 0.5 else -1)

        roll = float(rng.random())
        if roll < ACCURATE_RATE:
            factor = 1.0 + float(rng.uniform(-0.35, 0.35))
        elif roll < ACCURATE_RATE + VAGUE_RATE:
            factor = float(rng.uniform(0.3, 2.0))
        else:
            # Wrong direction, and a plausible magnitude so it is not obvious.
            factor = -float(rng.uniform(0.4, 1.3))

        signals.append(
            MarketSignal(
                id=f"{game_id}-{day}-{round_no}-s{i}",
                ticker=ticker,
                delta=_round_to_step(int(true_delta * factor)),
            )
        )

    return signals


def signal_accuracy(
    signals: list[MarketSignal], actual: dict[str, int]
) -> float:
    """Share of signals that got the direction right.

    Not used in play — this exists so tests and tuning runs can check the mix
    is behaving, rather than trusting the constants above on faith.
    """
    if not signals:
        return 0.0
    hits = sum(
        1
        for s in signals
        if s.delta != 0
        and actual.get(s.ticker, 0) != 0
        and np.sign(s.delta) == np.sign(actual[s.ticker])
    )
    return hits / len(signals)
