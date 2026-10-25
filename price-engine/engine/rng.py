"""
Deterministic randomness.

Every random draw in the engine comes from a generator seeded on
(game_id, day, round, purpose). That buys three things that matter more than
they might look:

  1. **Replayability.** Settling the same round twice produces the same
     result, so a retried request or a crashed-and-resumed server cannot
     silently hand two players different markets.
  2. **Testability.** Tests assert on real numbers instead of mocking out
     randomness.
  3. **Auditability.** A disputed round can be reproduced exactly from the
     seed, which is stored on the result.

`purpose` separates streams that must not correlate: prices, signals and news
each draw from their own generator, so changing how many news items are
generated cannot shift the prices.
"""

from __future__ import annotations

import hashlib

import numpy as np


def seed_for(game_id: str, day: int, round_no: int, purpose: str = "") -> int:
    """Stable 63-bit seed. Hashing rather than combining arithmetically so that
    adjacent rounds do not produce adjacent (and therefore correlated) seeds."""
    key = f"{game_id}|{day}|{round_no}|{purpose}".encode()
    digest = hashlib.sha256(key).digest()
    return int.from_bytes(digest[:8], "big") >> 1


def generator(game_id: str, day: int, round_no: int, purpose: str = "") -> np.random.Generator:
    return np.random.default_rng(seed_for(game_id, day, round_no, purpose))
