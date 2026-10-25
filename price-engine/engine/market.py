"""
Price settlement.

THE RULES IMPLEMENTED HERE ARE DEFAULTS, NOT REQUIREMENTS. They are a
defensible starting point chosen so the game is playable end to end; tune the
constants or replace the model outright once you have played it.

Model
-----
Each round, a company's return is

    r = drift + volatility * z          where z ~ N(0, 1), clipped to ±2.5

and the new price is `price * (1 + r)`, rounded to whole paise and floored at
MIN_PRICE so nothing can reach zero and become untradeable.

Why multiplicative rather than additive: a flat "±₹10" move is a rounding
error on a ₹6,000 stock and a catastrophe on a ₹60 one. Returns keep every
company equally interesting regardless of its price, which is what you want
when players are choosing between them.

Why z is clipped: an unclipped normal produces a 6-sigma move eventually, and
a company losing 30% in one round for no visible reason reads as a bug rather
than as drama. ±2.5 sigma keeps tails exciting but explicable.
"""

from __future__ import annotations

from .models import Company, Direction, PriceChange, Quote, SettlementMode
from .rng import generator

#: Floor price. A company at zero can never recover and is dead weight on the
#: board for the rest of the game.
MIN_PRICE = 100  # ₹1

#: Return clamp, in standard deviations.
SIGMA_CLIP = 2.5


def _direction(delta: int) -> Direction:
    if delta > 0:
        return Direction.UP
    if delta < 0:
        return Direction.DOWN
    return Direction.FLAT


def settle_round(
    game_id: str,
    day: int,
    round_no: int,
    companies: list[Company],
    quotes: list[Quote],
    mode: SettlementMode = "normal",
    frozen_tickers: set[str] | None = None,
    flat_shift: float | None = None,
) -> tuple[list[Quote], list[PriceChange]]:
    """Advance every quote by one round.

    `mode`:
      - "normal"     — each company moves on its own distribution.
      - "no_change"  — nothing moves (the No Price Change event card).
      - "frozen"     — only `frozen_tickers` hold; the rest move normally.

    `flat_shift` applies one market-wide return to every company before its
    own move (Currency Devaluation: pass -0.10 for −10%).
    """
    frozen_tickers = frozen_tickers or set()
    rng = generator(game_id, day, round_no, "prices")
    by_ticker = {c.ticker: c for c in companies}

    new_quotes: list[Quote] = []
    changes: list[PriceChange] = []

    for q in quotes:
        company = by_ticker.get(q.ticker)
        before = q.current

        held = (
            mode == "no_change"
            or q.frozen
            or q.ticker in frozen_tickers
            or company is None
        )

        if held:
            after = before
        else:
            z = float(rng.standard_normal())
            z = max(-SIGMA_CLIP, min(SIGMA_CLIP, z))
            r = company.drift + company.volatility * z
            if flat_shift:
                r += flat_shift
            after = max(MIN_PRICE, round(before * (1.0 + r)))

        delta = after - before
        new_quotes.append(
            Quote(
                ticker=q.ticker,
                initial=q.initial,
                last_round=before,
                current=after,
                # Freezes last exactly one round; the caller re-applies any
                # effect that should persist.
                frozen=False,
            )
        )
        changes.append(
            PriceChange(
                ticker=q.ticker,
                before=before,
                after=after,
                delta=delta,
                percent=0.0 if before == 0 else (delta / before) * 100.0,
                direction=_direction(delta),
            )
        )

    return new_quotes, changes


def opening_quotes(companies: list[Company]) -> list[Quote]:
    return [
        Quote(
            ticker=c.ticker,
            initial=c.initial_price,
            last_round=c.initial_price,
            current=c.initial_price,
            frozen=False,
        )
        for c in companies
    ]
