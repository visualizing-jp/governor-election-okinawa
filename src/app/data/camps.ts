/**
 * 陣営の色と集計。
 */

import { interpolateLab } from "d3-interpolate";
import { scaleLinear } from "d3-scale";
import type { PublishedCandidate } from "../../lib/data/published.ts";
import type { CampId } from "../../lib/data/types.ts";

/** styles.css の --color-{camp} と揃える。 */
export const CAMP_COLOR: Record<CampId, string> = {
  conservative: "#2f5d8a",
  progressive: "#c4622d",
  other: "#9a948a",
};

/** 積み上げの並び。保守系を下、革新系を上に置き、その他を境目に挟む。 */
export const CAMP_ORDER: CampId[] = ["conservative", "other", "progressive"];

export type CampShares = Record<CampId, number>;

/** 陣営ごとの得票の割合。分母は候補者の得票の合計（有効投票）。 */
export function campShares(candidates: readonly PublishedCandidate[], votes: (c: PublishedCandidate) => number): CampShares {
  const out: CampShares = { conservative: 0, progressive: 0, other: 0 };
  let total = 0;
  for (const c of candidates) {
    const v = votes(c);
    out[c.camp] += v;
    total += v;
  }
  if (total > 0) for (const k of CAMP_ORDER) out[k] /= total;
  return out;
}

/** 革新系 − 保守系。正なら革新系が上回る。 */
export const margin = (s: CampShares) => s.progressive - s.conservative;

const NEUTRAL = "#f1ede6";

/** 差の塗り。±60pt で飽和させ、どの回でも同じ物差しで比べられるようにする。 */
export const marginColor = scaleLinear<string>()
  .domain([-0.6, 0, 0.6])
  .range([CAMP_COLOR.conservative, NEUTRAL, CAMP_COLOR.progressive])
  .interpolate(interpolateLab)
  .clamp(true);

/**
 * 投票率の塗り。回をまたいで比べられるよう、範囲は固定する。
 * 市町村別の実績（2002〜2026年で 46.6〜91.7%）が収まる幅にする。
 */
export const TURNOUT_DOMAIN: [number, number] = [0.45, 0.95];
export const turnoutColor = scaleLinear<string>()
  .domain(TURNOUT_DOMAIN)
  .range(["#f1ede6", "#3a352e"])
  .interpolate(interpolateLab)
  .clamp(true);
