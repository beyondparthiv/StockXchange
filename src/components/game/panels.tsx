"use client";

import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo } from "@/components/brand/company-logo";
import {
  directionClass,
  formatMoney,
  formatSigned,
  holdingPnl,
  holdingsValue,
  leaderboard,
  me,
  netWorth,
  priceOf,
  type Activity,
  type GameState,
  type NewsItem,
} from "@/lib/game/state";

/** Shared panel chrome so every side panel has identical rhythm. */
function Panel({
  title,
  aside,
  children,
  bodyClass = "p-4",
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  bodyClass?: string;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-panel ${className}`}
    >
      <header className="flex shrink-0 items-baseline justify-between border-b border-line px-3 py-1.5">
        <h2 className="t-section">{title}</h2>
        {aside}
      </header>
      {/*
        min-h-0 is what lets a flex child actually shrink. Without it the
        body keeps its content height, the panel overflows its column, and
        the page grows a scrollbar — which is exactly what we are avoiding.
      */}
      <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClass}`}>
        {children}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-6 text-center text-xs text-ink-faint">{children}</p>
  );
}

/* ---------------------------------------------------------------- Wallet */

export function Wallet({
  state,
  className = "",
}: {
  state: GameState;
  className?: string;
}) {
  const player = me(state);
  const holdings = holdingsValue(state, player);
  const worth = netWorth(state, player);

  return (
    <Panel title="Wallet" className={`shrink-0 ${className}`} bodyClass="p-3">
      {/*
        Cash and holdings sit on one row rather than stacked. The rail has a
        hard height budget and the leaderboard was falling off the bottom of
        a 1366x768 screen; these two are reference figures, not the headline.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[0.625rem] text-ink-faint">Cash</div>
          <div className="t-value text-ink-soft">{formatMoney(player.cash)}</div>
        </div>
        <div className="text-right">
          <div className="text-[0.625rem] text-ink-faint">Holdings</div>
          <div className="t-value text-ink-soft">{formatMoney(holdings)}</div>
        </div>
      </div>

      {/* Net worth decides the game, so it keeps the weight. */}
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
        <span className="t-section">Net worth</span>
        <span className="font-mono text-lg font-semibold tabular-nums text-ink">
          {formatMoney(worth)}
        </span>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------- Portfolio */

export function Portfolio({
  state,
  className = "",
}: {
  state: GameState;
  className?: string;
}) {
  const player = me(state);

  return (
    <Panel
      title="Portfolio"
      className={className}
      aside={
        <span className="text-[0.625rem] text-ink-faint">
          {player.holdings.length} position
          {player.holdings.length === 1 ? "" : "s"}
        </span>
      }
      bodyClass=""
    >
      {player.holdings.length === 0 ? (
        <Empty>No open positions.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {player.holdings.map((h) => {
            const company = getCompany(h.ticker);
            const pnl = holdingPnl(state, h);
            const dir = pnl > 0 ? "up" : pnl < 0 ? "down" : "flat";
            return (
              <li
                key={h.ticker}
                className="flex items-center gap-2.5 px-3 py-1.5"
              >
                {company && <CompanyLogo company={company} size={20} />}
                <div className="min-w-0 flex-1">
                  <div className="t-ticker text-[0.75rem] text-ink">
                    {h.ticker}
                  </div>
                  <div className="text-[0.625rem] text-ink-faint">
                    {h.shares} @ {formatMoney(h.avgCost)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="t-value text-ink">
                    {formatMoney(priceOf(state, h.ticker))}
                  </div>
                  <div className={`t-value text-[0.6875rem] ${directionClass(dir)}`}>
                    {formatSigned(pnl)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- Leaderboard */

export function Leaderboard({
  state,
  className = "",
}: {
  state: GameState;
  className?: string;
}) {
  const ranked = leaderboard(state);

  return (
    <Panel title="Leaderboard" bodyClass="" className={className}>
      <ol className="divide-y divide-line">
        {ranked.map((p, i) => {
          const isMe = p.id === state.meId;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2.5 px-3 py-1.5 ${
                isMe ? "bg-accent-soft" : ""
              }`}
            >
              <span className="w-4 font-mono text-[0.6875rem] tabular-nums text-ink-faint">
                {i + 1}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-[0.75rem] ${
                  isMe ? "font-semibold text-ink" : "text-ink-soft"
                }`}
              >
                {p.displayName}
              </span>
              {p.actedThisRound && (
                <span
                  title="Acted this round"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-up"
                />
              )}
              <span className="t-value text-ink">
                {formatMoney(netWorth(state, p))}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/* ------------------------------------------------------------------ News */

export function NewsFeed({
  news,
  className = "",
}: {
  news: NewsItem[];
  className?: string;
}) {
  return (
    /*
      Caps at roughly four items and scrolls the rest. The feed grows every
      day, and an unbounded list either pushes the standings off screen or
      leaves a tall empty panel on day one.
    */
    <Panel
      title="Market news"
      bodyClass=""
      className={className}
      aside={
        news.length > 4 ? (
          <span className="text-[0.625rem] text-ink-faint">
            {news.length} items
          </span>
        ) : undefined
      }
    >
      {news.length === 0 ? (
        <Empty>No news yet.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {news.map((n) => {
            const company = n.ticker ? getCompany(n.ticker) : undefined;
            return (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-ink-faint">
                    Day {n.day}
                  </span>
                  {company && (
                    <>
                      <span className="text-ink-faint">·</span>
                      <CompanyLogo company={company} size={13} />
                      <span className="t-ticker text-[0.625rem] text-ink-soft">
                        {n.ticker}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[0.75rem] leading-snug text-ink">
                  {n.headline}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-[0.6875rem] leading-snug text-ink-faint">
                    {n.body}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* --------------------------------------------------------------- History */

function ActivityRow({ a }: { a: Activity }) {
  const company = getCompany(a.ticker);
  return (
    <li className="flex items-center gap-2 px-4 py-2 text-[0.6875rem]">
      <span className="font-mono text-[0.5625rem] text-ink-faint">
        D{a.day}·R{a.round}
      </span>
      {company && <CompanyLogo company={company} size={14} />}
      <span className="min-w-0 flex-1 truncate text-ink-soft">
        <span className="text-ink">{a.playerName}</span>{" "}
        <span className={a.side === "buy" ? "text-up" : "text-down"}>
          {a.side === "buy" ? "bought" : "sold"}
        </span>{" "}
        {a.shares} {a.ticker}
      </span>
      <span className="t-value text-[0.625rem] text-ink-faint">
        {formatMoney(a.price)}
      </span>
    </li>
  );
}

/**
 * History as a slide-over rather than a rail panel.
 *
 * It was the tallest thing in the right column and the least glanced at —
 * you check it between decisions, not during one. Moving it behind a button
 * is what buys the other panels enough height to fit one screen.
 */
export function HistoryDrawer({
  state,
  open,
  tab,
  onTab,
  onClose,
}: {
  state: GameState;
  open: boolean;
  tab: "mine" | "all";
  onTab: (t: "mine" | "all") => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const rows =
    tab === "mine"
      ? state.activity.filter((a) => a.playerId === state.meId)
      : state.activity;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Click-away. Dimmed rather than opaque so the board stays visible —
          history is context for the market, not a replacement for it. */}
      <button
        type="button"
        aria-label="Close history"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-canvas/50 backdrop-blur-[1px]"
      />

      <aside className="drawer-in relative flex h-full w-full max-w-sm flex-col border-l border-line bg-surface shadow-lift">
        <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <h2 className="t-section">Trade history</h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-line bg-canvas-2 p-0.5">
              {(
                [
                  ["mine", "Mine"],
                  ["all", "Overall"],
                ] as const
              ).map(([key, label]) => {
                // Unavailable, not empty: an empty list would read as
                // "nobody traded", which is a different claim.
                const disabled = key === "all" && !state.publicActivity;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    title={
                      disabled
                        ? "Public trade activity is off for this game"
                        : undefined
                    }
                    onClick={() => onTab(key)}
                    className={`interactive rounded-[4px] px-2.5 py-1 text-[0.6875rem] font-medium ${
                      tab === key
                        ? "bg-surface text-ink shadow-panel"
                        : "text-ink-faint hover:text-ink"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="interactive grid h-7 w-7 place-items-center rounded-md text-ink-faint hover:bg-surface-2 hover:text-ink"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "all" && !state.publicActivity ? (
            <Empty>Public trade activity is disabled for this game.</Empty>
          ) : rows.length === 0 ? (
            <Empty>No trades yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
