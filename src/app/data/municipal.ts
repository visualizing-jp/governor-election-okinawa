/**
 * 市町村別の集計。地図はその回の市町村で塗り、推移は現行の市町村に寄せて合算する。
 */

import type { MunicipalitiesJson, PublishedElection, PublishedMunicipality } from "../../lib/data/published.ts";
import type { CampId } from "../../lib/data/types.ts";
import { margin, type CampShares } from "./camps.ts";

export type Metric = "margin" | "turnout";

export interface Tally {
  votes: Record<string, number>;
  valid: number;
  electors: number;
  voters: number;
}

export function sharesOf(t: Tally, e: PublishedElection): CampShares {
  const out: CampShares = { conservative: 0, progressive: 0, other: 0 };
  for (const c of e.candidates) out[c.camp as CampId] += (t.votes[c.id] ?? 0) / t.valid;
  return out;
}

export function metricOf(t: Tally, e: PublishedElection, metric: Metric): number {
  return metric === "margin" ? margin(sharesOf(t, e)) : t.voters / t.electors;
}

export const currentOf = (m: MunicipalitiesJson, code: string) => m.toCurrent[code] ?? code;

/** 現行の市町村ごとに合算する。 */
export function byCurrent(m: MunicipalitiesJson, rows: readonly PublishedMunicipality[]): Map<string, Tally> {
  const out = new Map<string, Tally>();
  for (const r of rows) {
    const key = currentOf(m, r.code);
    const t = out.get(key) ?? { votes: {}, valid: 0, electors: 0, voters: 0 };
    for (const [id, v] of Object.entries(r.votes)) t.votes[id] = (t.votes[id] ?? 0) + v;
    t.valid += r.valid;
    t.electors += r.electors;
    t.voters += r.voters;
    out.set(key, t);
  }
  return out;
}

/** 地図の枠。沖縄は島が東西に散らばるので、島嶼ごとに別の枠へ描く。 */
export type Panel = "main" | "yaeyama" | "miyako" | "daito";

const PANEL_OF: Record<string, Panel> = {
  "47207": "yaeyama",
  "47381": "yaeyama",
  "47382": "yaeyama",
  "47214": "miyako",
  "47375": "miyako",
  "47357": "daito",
  "47358": "daito",
};

export const PANEL_LABEL: Record<Panel, string> = {
  main: "沖縄本島と周辺離島",
  yaeyama: "八重山",
  miyako: "宮古",
  daito: "大東",
};

/** 旧市町村も現行の後継で枠を決めるので、合併前の地図でも同じ枠に収まる。 */
export const panelOf = (currentCode: string): Panel => PANEL_OF[currentCode] ?? "main";

/**
 * 枠ごとに描く範囲（経度・緯度）。遠く離れた無人島まで入れると有人の島が小さくなりすぎるので、
 * 範囲の外の島は描かない（OMITTED に注記する）。
 */
export const PANEL_WINDOW: Record<Panel, [[number, number], [number, number]]> = {
  main: [[126.5, 25.9], [128.5, 27.2]],
  yaeyama: [[122.8, 23.9], [124.5, 24.8]],
  miyako: [[124.5, 24.5], [125.6, 25.0]],
  daito: [[131.0, 25.7], [131.5, 26.1]],
};

export const OMITTED = "硫黄鳥島（久米島町）、尖閣諸島（石垣市）、沖大東島（北大東村）は枠の範囲外のため省略した。いずれも無人島";
