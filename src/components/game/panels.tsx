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
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  bodyClass?: string;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface shadow-panel">
      <header className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
        <h2 className="t-section">{title}</h2>
        {aside}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-6 text-center text-xs text-ink-faint">{children}</p>
  );
}

/* ---------------------------------------------------------------- Wallet */

export function Wallet({ state }: { state: GameState }) {
  const player = me(state);
  const holdings = holdingsValue(state, player);
  const worth = netWorth(state, player);

  return (
    <Panel title="Wallet">
      <dl className="space-y-2">
        <div className="flex items-baseline justify-between">
          <dt className="t-label">Available cash</dt>
          <dd className="t-value text-ink-soft">{formatMoney(player.cash)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="t-label">Holdings</dt>
          <dd className="t-value text-ink-soft">{formatMoney(holdings)}</dd>
        </div>
      </dl>

      {/* Net worth is the number that decides the game, so it gets the weight. */}
      <div className="mt-3 border-t border-line pt-3">
        <dt className="t-section">Net worth</dt>
        <dd className="t-figure mt-1 text-ink">{formatMoney(worth)}</dd>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------- Portfolio */

export function Portfolio({ state }: { state: GameState }) {
  const player = me(state);

  return (
    <Panel
      title="Portfolio"
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
                className="flex items-center gap-2.5 px-4 py-2.5"
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

export function Leaderboard({ state }: { state: GameState }) {
  const ranked = leaderboard(state);

  return (
    <Panel title="Leaderboard" bodyClass="">
      <ol className="divide-y divide-line">
        {ranked.map((p, i) => {
          const isMe = p.id === state.meId;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2.5 px-4 py-2 ${
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

export function NewsFeed({ news }: { news: NewsItem[] }) {
  return (
    <Panel title="Market news" bodyClass="">
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

export function History({
  state,
  tab,
  onTab,
}: {
  state: GameState;
  tab: "mine" | "all";
  onTab: (t: "mine" | "all") => void;
}) {
  const rows =
    tab === "mine"
      ? state.activity.filter((a) => a.playerId === state.meId)
      : state.activity;

  return (
    <Panel
      title="History"
      bodyClass=""
      aside={
        <div className="inline-flex rounded-md border border-line bg-canvas-2 p-0.5">
          {(
            [
              ["mine", "Mine"],
              ["all", "Overall"],
            ] as const
          ).map(([key, label]) => {
            // Overall History is *unavailable* rather than empty when the host
            // has public activity switched off — an empty list would read as
            // "nobody traded", which is a different and misleading claim.
            const disabled = key === "all" && !state.publicActivity;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                title={
                  disabled ? "Public trade activity is off for this game" : undefined
                }
                onClick={() => onTab(key)}
                className={`interactive rounded-[4px] px-2 py-0.5 text-[0.625rem] font-medium ${
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
      }
    >
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
    </Panel>
  );
}
