/**
 * Market emblem assets (bull / bear watermark).
 *
 * The built-in emblems are drawn as inline SVG, which keeps them dependency-
 * free but limits them to stylised heads — a detailed charging bull authored
 * as raw path data does not read well at any size. To use a real
 * illustration, drop an SVG in public/emblems/ and point these at it. The
 * backdrop picks it up with no component change.
 *
 * Null means "use the built-in emblem", and costs no network request.
 *
 * Licensing: market bull/bear illustrations found online are usually
 * copyrighted. Use artwork you have the rights to, or commission/generate
 * your own, before shipping publicly.
 */

export type MarketEmblems = {
  /** Path under /public, e.g. "/emblems/bull.svg". Null uses the built-in. */
  bull: string | null;
  bear: string | null;
};

export function getMarketEmblems(): MarketEmblems {
  return {
    bull: null, // set to "/emblems/bull.svg" once an asset is added
    bear: null, // set to "/emblems/bear.svg" once an asset is added
  };
}
