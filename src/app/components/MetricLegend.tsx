/**
 * 市町村の塗りの凡例。地図とマス目の表で同じ物差しを使う。
 */

import { CAMP_COLOR, TURNOUT_DOMAIN, marginColor, turnoutColor } from "../data/camps.ts";
import { pct, points } from "../data/format.ts";
import type { Metric } from "../data/municipal.ts";

export function MetricLegend({ metric }: { metric: Metric }) {
  if (metric === "margin") {
    const stops = [-0.6, -0.3, 0, 0.3, 0.6];
    return (
      <div className="max-w-[360px]">
        <div
          className="h-2 rounded-[2px]"
          style={{ background: `linear-gradient(to right, ${stops.map((s) => marginColor(s)).join(", ")})` }}
        />
        <div className="tnum mt-1 flex justify-between text-[10px] text-muted">
          <span style={{ color: CAMP_COLOR.conservative }}>保守系が上回る</span>
          <span>{points(0)}</span>
          <span style={{ color: CAMP_COLOR.progressive }}>革新系が上回る</span>
        </div>
        <p className="mt-0.5 text-[10px] text-faint">得票率の差（革新系 − 保守系）。±60pt で色が飽和する</p>
      </div>
    );
  }
  const [lo, hi] = TURNOUT_DOMAIN;
  return (
    <div className="max-w-[360px]">
      <div
        className="h-2 rounded-[2px]"
        style={{ background: `linear-gradient(to right, ${turnoutColor(lo)}, ${turnoutColor(hi)})` }}
      />
      <div className="tnum mt-1 flex justify-between text-[10px] text-muted">
        <span>{pct(lo, 0)}</span>
        <span>{pct(hi, 0)}</span>
      </div>
    </div>
  );
}
