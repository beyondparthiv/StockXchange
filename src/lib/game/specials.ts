/**
 * Player special cards — what each one actually does.
 *
 * Until now "playing" a special only greyed the card out; nothing happened.
 * This file is the registry of real effects, and just as importantly it
 * records which cards are NOT implementable yet, so the game can say so
 * instead of pretending.
 *
 * A card is only dealt if `implemented` is true. Dealing a card whose effect
 * is a no-op is worse than not dealing it: the player spends their one use
 * on nothing and has no way to tell.
 */

import { PLAYER_SPECIAL_CARDS } from "@/lib/game/cards";

export type SpecialKey =
  | "insider_tip"
  | "double_trade"
  | "rewind_trade"
  | "price_shield"
  | "margin_immunity"
  | "quick_loan"
  | "tax_dodge"
  | "freeze_rival";

type SpecialSpec = {
  key: SpecialKey;
  implemented: boolean;
  /** Why not, when it isn't. Shown in the card's tooltip. */
  blockedBy?: string;
  /** One line telling the player what pressing it will do. */
  action: string;
};

export const SPECIAL_SPECS: Record<SpecialKey, SpecialSpec> = {
  insider_tip: {
    key: "insider_tip",
    implemented: true,
    action: "Reveal the true direction of one company's next move",
  },
  double_trade: {
    key: "double_trade",
    implemented: true,
    action: "Your next order may exceed the affordable maximum by 2×",
  },
  rewind_trade: {
    key: "rewind_trade",
    implemented: true,
    action: "Undo your most recent order this round",
  },

  // Not dealt: each needs a mechanic the game does not have yet.
  price_shield: {
    key: "price_shield",
    implemented: false,
    blockedBy: "Market event cards are not implemented yet",
    action: "Cancel the next market event's effect on your portfolio",
  },
  margin_immunity: {
    key: "margin_immunity",
    implemented: false,
    blockedBy: "Short selling and margin calls are not implemented yet",
    action: "Skip one margin call",
  },
  quick_loan: {
    key: "quick_loan",
    implemented: false,
    blockedBy: "Borrowing and interest are not implemented yet",
    action: "Borrow cash at a discounted rate",
  },
  tax_dodge: {
    key: "tax_dodge",
    implemented: false,
    blockedBy: "Capital gains tax is not implemented yet",
    action: "Skip the next capital gains deduction",
  },
  freeze_rival: {
    key: "freeze_rival",
    implemented: false,
    blockedBy: "Needs opponent targeting",
    action: "Stop one opponent trading next round",
  },
};

export const PLAYABLE_SPECIALS = Object.values(SPECIAL_SPECS).filter(
  (s) => s.implemented,
);

export function specialInfo(key: string) {
  const spec = SPECIAL_SPECS[key as SpecialKey];
  const card = PLAYER_SPECIAL_CARDS.find((c) => c.key === key);
  return {
    name: card?.name ?? key,
    effect: card?.effect ?? "",
    action: spec?.action ?? "",
    implemented: spec?.implemented ?? false,
    blockedBy: spec?.blockedBy,
  };
}

/**
 * Deal `count` distinct playable specials for a game.
 *
 * Seeded off the game id so a given game always hands out the same cards —
 * consistent with every other random element in the engine, and it means a
 * replayed game is genuinely the same game.
 */
export function dealSpecials(gameId: string, count = 2) {
  let h = 2166136261;
  for (let i = 0; i < gameId.length; i++) {
    h ^= gameId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const pool = [...PLAYABLE_SPECIALS];
  const picked: SpecialSpec[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    h = Math.imul(h ^ (i + 1), 16777619);
    const idx = (h >>> 0) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }

  return picked.map((spec, i) => {
    const info = specialInfo(spec.key);
    return {
      id: `sp-${i + 1}`,
      key: spec.key,
      name: info.name,
      effect: info.effect,
      used: false,
    };
  });
}
