/**
 * 市町村 × 回のマス目の表。合併前の回は、前身の市町村を現行の市町村に合算してある。
 */

import { Fragment, use, useState } from "react";
import { Segmented } from "../components/Segmented.tsx";
import { MetricLegend } from "../components/MetricLegend.tsx";
import { loadElections, loadMunicipalities, PREF } from "../data/load.ts";
import { TURNOUT_DOMAIN, campShares, margin, marginColor, turnoutColor } from "../data/camps.ts";
import { pct, points, year } from "../data/format.ts";
import { byCurrent, metricOf, type Metric } from "../data/municipal.ts";
import { CURRENT } from "../../lib/data/municipalities.ts";

export type TrendSort = "region" | "latest";

const METRICS = [
  { value: "margin", label: "陣営の差" },
  { value: "turnout", label: "投票率" },
] as const;

const SORTS = [
  { value: "region", label: "地域順" },
  { value: "latest", label: "最新回の順" },
] as const;

/** 塗りが濃いマスは白い文字にする。0〜1 は物差しの中での濃さ。 */
function strength(metric: Metric, v: number): number {
  if (metric === "margin") return Math.min(Math.abs(v) / 0.6, 1);
  const [lo, hi] = TURNOUT_DOMAIN;
  return Math.min(Math.max((v - lo) / (hi - lo), 0), 1);
}

const short = (metric: Metric, v: number) =>
  metric === "margin" ? `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v * 100))}` : `${Math.round(v * 100)}`;

export function TrendView({
  metric,
  onMetric,
  sort,
  onSort,
  onOpen,
}: {
  metric: Metric;
  onMetric: (m: Metric) => void;
  sort: TrendSort;
  onSort: (s: TrendSort) => void;
  onOpen: (n: number, code: string | null) => void;
}) {
  const data = use(loadElections());
  const munis = use(loadMunicipalities());
  const [hover, setHover] = useState<{ row: string; n: number } | null>(null);

  const columns = data.elections.filter((e) => e.municipal);
  const tallies = new Map(columns.map((e) => [e.n, byCurrent(munis, munis.elections[String(e.n)]!)]));
  const valueOf = (code: string, n: number) => {
    const e = columns.find((c) => c.n === n)!;
    return metricOf(tallies.get(n)!.get(code)!, e, metric);
  };
  const prefValue = (n: number) => {
    const e = columns.find((c) => c.n === n)!;
    return metric === "margin" ? margin(campShares(e.candidates, (c) => c.votes)) : e.voters.total / e.electors.total;
  };
  const fill = (v: number) => (metric === "margin" ? marginColor(v) : turnoutColor(v));

  const latest = columns.at(-1)!;
  const rows = [...(CURRENT[PREF] ?? [])];
  if (sort === "latest") rows.sort((a, b) => valueOf(b.code, latest.n) - valueOf(a.code, latest.n));

  const margins = rows.map((m) => columns.map((e) => metricOf(tallies.get(e.n)!.get(m.code)!, e, "margin")));
  const alwaysConservative = margins.filter((vs) => vs.every((v) => v < 0)).length;
  const alwaysProgressive = margins.filter((vs) => vs.every((v) => v > 0)).length;

  const grid = { gridTemplateColumns: `7.5em repeat(${columns.length}, minmax(44px, 1fr))` };

  const cell = (v: number, label: string, onClick: () => void, key: string, active: boolean, bold = false) => {
    const dark = strength(metric, v) > 0.55;
    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`tnum h-7 cursor-pointer text-[11px] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] ${
          dark ? "text-surface" : "text-ink/80"
        } ${bold ? "font-semibold" : ""} ${active ? "relative z-10 outline outline-[1.5px] outline-ink" : ""}`}
        style={{ backgroundColor: fill(v) }}
      >
        {short(metric, v)}
      </button>
    );
  };

  const describe = (name: string, n: number, v: number) => {
    const e = columns.find((c) => c.n === n)!;
    return `${name} ${year(e.date)}年 ${metric === "margin" ? `差 ${points(v)}` : `投票率 ${pct(v)}`}`;
  };

  let lastDistrict = "";

  return (
    <main className="mx-auto w-full max-w-[1240px] px-6 py-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented label="指標" options={METRICS} value={metric} onChange={onMetric} />
        <Segmented label="並べ方" options={SORTS} value={sort} onChange={onSort} />
      </div>

      <p className="mt-4 max-w-[46em] text-[14px] leading-relaxed">
        {year(columns[0]!.date)}年から{year(latest.date)}年までの{columns.length}回で、保守系が上回り続けたのは
        {alwaysConservative}市町村、革新系が上回り続けたのは{alwaysProgressive}市町村だった。残る
        {rows.length - alwaysConservative - alwaysProgressive}市町村は、回によって入れ替わった。
      </p>

      <div className="mt-4">
        <MetricLegend metric={metric} />
        <p className="mt-1 text-[10px] text-faint">
          マスの数字は{metric === "margin" ? "差（ポイント）" : "投票率（%）"}。合併前の回は前身の市町村を合算。マスを選ぶと、その回の地図を開く。
        </p>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div role="table" aria-label="市町村別の推移" className="grid min-w-[460px] max-w-[760px] gap-px" style={grid} onPointerLeave={() => setHover(null)}>
          <div role="row" className="contents">
            <span role="columnheader" />
            {columns.map((e) => (
              <span
                key={e.n}
                role="columnheader"
                className={`tnum pb-1 text-center text-[11px] ${hover?.n === e.n ? "font-semibold text-ink" : "text-muted"}`}
              >
                {year(e.date)}
              </span>
            ))}
          </div>

          <div role="row" className="contents">
            <span role="rowheader" className="flex items-center pr-2 text-[11px] font-semibold">
              県全体
            </span>
            {columns.map((e) => {
              const v = prefValue(e.n);
              return (
                <span key={e.n} role="cell" className="grid" onPointerEnter={() => setHover({ row: "pref", n: e.n })}>
                  {cell(v, describe("県全体", e.n, v), () => onOpen(e.n, null), `pref-${e.n}`, hover?.row === "pref" && hover.n === e.n, true)}
                </span>
              );
            })}
          </div>

          {rows.map((m) => {
            const heading = sort === "region" && m.district !== lastDistrict;
            lastDistrict = m.district;
            return (
              <Fragment key={m.code}>
                {heading && (
                  <div role="row" className="contents">
                    <span role="rowheader" className="col-span-full pt-3 pb-0.5 text-[10px] tracking-[0.06em] text-faint">
                      {m.district}
                    </span>
                  </div>
                )}
                <div role="row" className="contents">
                  <span
                    role="rowheader"
                    className={`flex items-center truncate pr-2 text-[11px] ${hover?.row === m.code ? "font-semibold text-ink" : "text-ink/80"}`}
                  >
                    {m.name}
                  </span>
                  {columns.map((e) => {
                    const v = valueOf(m.code, e.n);
                    return (
                      <span key={e.n} role="cell" className="grid" onPointerEnter={() => setHover({ row: m.code, n: e.n })}>
                        {cell(v, describe(m.name, e.n, v), () => onOpen(e.n, m.code), `${m.code}-${e.n}`, hover?.row === m.code && hover.n === e.n)}
                      </span>
                    );
                  })}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </main>
  );
}
