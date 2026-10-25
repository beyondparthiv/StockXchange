"""
Engine tests.

These assert on concrete numbers rather than mocking randomness, which is
only possible because every draw is seeded on (game_id, day, round, purpose).
If a test here starts failing after a change to the RNG, that is the test
doing its job: it means replays of existing games would no longer reproduce.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine.market import MIN_PRICE, opening_quotes, settle_round  # noqa: E402
from engine.models import Company, DealRequest, RoundRequest  # noqa: E402
from engine.news import generate_news, public_news  # noqa: E402
from engine.rng import seed_for  # noqa: E402
from engine.settle import deal_game, default_companies, settle  # noqa: E402
from engine.signals import (  # noqa: E402
    deal_signals,
    predict_true_moves,
    signal_accuracy,
)


@pytest.fixture
def companies() -> list[Company]:
    return default_companies()


@pytest.fixture
def quotes(companies):
    return opening_quotes(companies)


# --------------------------------------------------------------- determinism


def test_same_round_settles_identically(companies, quotes):
    a, _ = settle_round("g1", 1, 1, companies, quotes)
    b, _ = settle_round("g1", 1, 1, companies, quotes)
    assert [q.current for q in a] == [q.current for q in b]


def test_different_rounds_diverge(companies, quotes):
    a, _ = settle_round("g1", 1, 1, companies, quotes)
    b, _ = settle_round("g1", 1, 2, companies, quotes)
    assert [q.current for q in a] != [q.current for q in b]


def test_different_games_diverge(companies, quotes):
    a, _ = settle_round("g1", 1, 1, companies, quotes)
    b, _ = settle_round("g2", 1, 1, companies, quotes)
    assert [q.current for q in a] != [q.current for q in b]


def test_adjacent_rounds_are_not_correlated_seeds():
    # Hashed rather than arithmetic, so round 1 and 2 are not neighbours.
    assert abs(seed_for("g", 1, 1) - seed_for("g", 1, 2)) > 1_000_000


# ------------------------------------------------------------------- pricing


def test_price_never_falls_below_floor():
    crash = [Company(ticker="X", name="X", initial_price=MIN_PRICE, volatility=0.5, drift=-0.1)]
    q = opening_quotes(crash)
    for r in range(1, 60):
        q, _ = settle_round("g", 1, r, crash, q)
    assert all(x.current >= MIN_PRICE for x in q)


def test_last_round_carries_the_previous_price(companies, quotes):
    after, _ = settle_round("g1", 1, 1, companies, quotes)
    for before, now in zip(quotes, after):
        assert now.last_round == before.current


def test_frozen_ticker_does_not_move(companies, quotes):
    after, _ = settle_round(
        "g1", 1, 1, companies, quotes, frozen_tickers={"TSLA"}
    )
    tsla_before = next(q for q in quotes if q.ticker == "TSLA").current
    tsla_after = next(q for q in after if q.ticker == "TSLA").current
    assert tsla_after == tsla_before


def test_no_change_mode_holds_everything(companies, quotes):
    after, changes = settle_round("g1", 1, 1, companies, quotes, mode="no_change")
    assert all(c.delta == 0 for c in changes)
    assert [q.current for q in after] == [q.current for q in quotes]


def test_flat_shift_pushes_the_whole_market_down(companies, quotes):
    after, _ = settle_round("g1", 1, 1, companies, quotes, flat_shift=-0.10)
    base, _ = settle_round("g1", 1, 1, companies, quotes)
    assert all(a.current < b.current for a, b in zip(after, base))


def test_percent_matches_delta(companies, quotes):
    _, changes = settle_round("g1", 1, 1, companies, quotes)
    for c in changes:
        assert c.percent == pytest.approx((c.delta / c.before) * 100.0)
        if c.delta > 0:
            assert c.direction.value == "up"
        elif c.delta < 0:
            assert c.direction.value == "down"


# ------------------------------------------------------------------- signals


def test_signals_describe_the_round_that_is_about_to_open(companies, quotes):
    """The hints must come from the NEXT draw, not the one already settled."""
    predicted = predict_true_moves("g1", 1, 1, companies, quotes)
    _, changes = settle_round("g1", 1, 1, companies, quotes)
    actual = {c.ticker: c.delta for c in changes}
    for ticker, p in predicted.items():
        assert abs(p - actual[ticker]) <= 1  # rounding only


def test_every_company_gets_at_least_one_signal(companies, quotes):
    sigs = deal_signals("g1", 1, 1, companies, quotes)
    assert len(sigs) == 10
    assert {s.ticker for s in sigs} == {c.ticker for c in companies}


def test_no_signal_is_a_useless_zero(companies, quotes):
    for r in range(1, 25):
        for s in deal_signals("g1", 1, r, companies, quotes):
            assert s.delta != 0


def test_signals_are_mostly_right_but_not_always(companies, quotes):
    """Across many rounds the mix should land near the configured rates.

    Asserting on a range, not a point: the whole design depends on signals
    being usually-but-not-always right, and a test that pinned it exactly
    would break on any retune.
    """
    hits, total = 0, 0
    q = quotes
    for r in range(1, 80):
        sigs = deal_signals("g1", 1, r, companies, q)
        _, changes = settle_round("g1", 1, r, companies, q)
        actual = {c.ticker: c.delta for c in changes}
        acc = signal_accuracy(sigs, actual)
        hits += acc * len(sigs)
        total += len(sigs)
    rate = hits / total
    assert 0.6 < rate < 0.95, f"signal accuracy {rate:.2f} outside the intended band"


# ---------------------------------------------------------------------- news


def test_news_never_leaks_whether_it_is_true(companies, quotes):
    upcoming = predict_true_moves("g1", 1, 1, companies, quotes)
    items = generate_news("g1", 1, companies, upcoming)
    assert any(not n.truthful for n in items) or all(n.truthful for n in items)
    for row in public_news(items):
        assert "truthful" not in row


def test_news_is_deterministic(companies, quotes):
    upcoming = predict_true_moves("g1", 1, 1, companies, quotes)
    a = generate_news("g1", 1, companies, upcoming)
    b = generate_news("g1", 1, companies, upcoming)
    assert [n.headline for n in a] == [n.headline for n in b]


# -------------------------------------------------------------- orchestration


def test_deal_opens_at_initial_prices(companies):
    res = deal_game(DealRequest(game_id="g1", companies=companies))
    assert all(q.current == q.initial == q.last_round for q in res.quotes)
    assert len(res.signals) == 10
    assert len(res.news) == 3


def test_news_only_on_day_boundaries(companies, quotes):
    mid = settle(
        RoundRequest(game_id="g1", day=1, round=1, rounds_per_day=2,
                     companies=companies, quotes=quotes)
    )
    assert mid.news == []

    end = settle(
        RoundRequest(game_id="g1", day=1, round=2, rounds_per_day=2,
                     companies=companies, quotes=quotes)
    )
    assert len(end.news) == 3
    assert all(n.day == 2 for n in end.news)


def test_a_full_game_stays_sane(companies):
    """Twenty rounds end to end: nothing goes negative, nothing explodes."""
    q = opening_quotes(companies)
    for day in range(1, 11):
        for rnd in (1, 2):
            res = settle(
                RoundRequest(game_id="full", day=day, round=rnd,
                             rounds_per_day=2, companies=companies, quotes=q)
            )
            q = res.quotes
            assert len(res.next_signals) == 10

    for quote in q:
        assert quote.current >= MIN_PRICE
        # A 20-round game should not 10x or wipe out a company; if it does,
        # the volatility defaults need revisiting rather than this bound.
        assert 0.1 <= quote.current / quote.initial <= 10.0
