"use client";

import Link from "next/link";
import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo } from "@/components/brand/company-logo";
import {
  directionClass,
  formatMoney,
  formatPercent,
  formatSigned,
  holdingPnl,
  leaderboard,
  me,
  netWorth,
  type GameState,
} from "@/lib/game/state";

/**
 * Final standings.
 *
 * The game used to reach its last round and simply stop — the board sat
 * there with a dead clock and no result, which is the one moment a game
 * absolutely has to deliver on.
 *
 * Shows the finish order, what each player ended on, and the winner's
 * margin. Profit is measured against starting cash, because "ended on
 * $1,240" means nothing without knowing everyone began at $1,000.
 */
export function GameOver({ state }: { state: GameState }) {
  const ranked = leaderboard(state);
  const you = me(state);
  const start = state.config.startingCash;

  const yourRank = ranked.findIndex((p) => p.id === state.meId) + 1;
  const yourWorth = netWorth(state, you);
  const yourPnl = yourWorth - start;
  const won = yourRank === 1;

  const winner = ranked[0];
  const runnerUp = ranked[1];
  const margin =
    runnerUp !== undefined
      ? netWorth(state, winner) - netWorth(state, runnerUp)
      : 0;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 overflow-y-auto bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="transition-card rounded-lg border border-line bg-surface p-7 shadow-lift">
          <p className="t-section">
            Game over · {state.config.days} days · {state.players.length}{" "}
            players
          </p>

          <h1 className="t-display mt-2 text-ink">
            {won ? "You won" : `${winner.displayName} wins`}
          </h1>

          <p className="mt-1.5 text-sm text-ink-soft">
            You finished{" "}
            <span className="font-semibold text-ink">#{yourRank}</span> on{" "}
            <span className="font-mono text-ink">{formatMoney(yourWorth)}</span>{" "}
            — a{" "}
            <span className={directionClass(yourPnl > 0 ? "up" : yourPnl < 0 ? "down" : "flat")}>
              {formatSigned(yourPnl)} ({formatPercent((yourPnl / start) * 100)})
            </span>{" "}
            on your {formatMoney(start)} stake.
          </p>

          {/* Standings */}
          <ol className="mt-6 divide-y divide-line rounded-md border border-line">
            {ranked.map((p, i) => {
              const worth = netWorth(state, p);
              const pnl = worth - start;
              const isMe = p.id === state.meId;
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    isMe ? "bg-accent-soft" : ""
                  }`}
                >
                  <span
                    className={`w-5 font-mono text-sm tabular-nums ${
                      i === 0 ? "text-up" : "text-ink-faint"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      isMe ? "font-semibold text-ink" : "text-ink-soft"
                    }`}
                  >
                    {p.displayName}
                    {p.isBot && (
                      <span className="ml-1.5 text-[0.625rem] uppercase tracking-wider text-ink-faint">
                        bot
                      </span>
                    )}
                  </span>
                  <span className="t-value text-ink">{formatMoney(worth)}</span>
                  <span
                    className={`t-value w-20 text-right text-[0.6875rem] ${directionClass(
                      pnl > 0 ? "up" : pnl < 0 ? "down" : "flat",
                    )}`}
                  >
                    {formatSigned(pnl)}
                  </span>
                </li>
              );
            })}
          </ol>

          {runnerUp && (
            <p className="mt-2 text-center text-[0.6875rem] text-ink-faint">
              Won by {formatMoney(margin)} over {runnerUp.displayName}.
            </p>
          )}

          {/* What you were holding at the bell. */}
          {you.holdings.length > 0 && (
            <>
              <h2 className="t-section mt-6">Your final positions</h2>
              <ul className="mt-2 divide-y divide-line rounded-md border border-line">
                {you.holdings.map((h) => {
                  const company = getCompany(h.ticker);
                  const pnl = holdingPnl(state, h);
                  return (
                    <li
                      key={h.ticker}
                      className="flex items-center gap-2.5 px-4 py-2"
                    >
                      {company && <CompanyLogo company={company} size={18} />}
                      <span className="t-ticker text-[0.75rem] text-ink">
                        {h.ticker}
                      </span>
                      {h.shares < 0 && (
                        <span className="rounded-sm bg-down/15 px-1 text-[0.5rem] font-semibold uppercase tracking-wider text-down">
                          Short
                        </span>
                      )}
                      <span className="flex-1 text-[0.6875rem] text-ink-faint">
                        {Math.abs(h.shares)} @ {formatMoney(h.avgCost)}
                      </span>
                      <span
                        className={`t-value ${directionClass(
                          pnl > 0 ? "up" : pnl < 0 ? "down" : "flat",
                        )}`}
                      >
                        {formatSigned(pnl)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {(you.debt ?? 0) > 0 && (
            <p className="mt-2 text-[0.6875rem] text-down">
              {formatMoney(you.debt ?? 0)} borrowed was repaid from your net
              worth.
            </p>
          )}

          <div className="mt-7 flex justify-center gap-3">
            <Link
              href="/"
              className="interactive rounded-md border border-line-strong px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2"
            >
              Back to modes
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cta rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Play again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
