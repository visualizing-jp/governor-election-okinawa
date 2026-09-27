/**
 * 市町村が回ごとにどちらへ動いたかを、縦に流れる線で示す（NYT "How States Have Shifted" の形）。
 * 縦軸は回（上が新しい）、横軸は陣営の差か投票率。回と回の間は縦向きの3次ベジェ曲線でつなぐ。
 */

import { useState } from "react";
import { scaleLinear } from "d3-scale";
import type { PublishedElection } from "../../lib/data/published.ts";
import { CAMP_COLOR, TURNOUT_DOMAIN } from "../data/camps.ts";
import { pct, points, year } from "../data/format.ts";
import type { Metric } from "../data/municipal.ts";

const M = { top: 44, right: 44, bottom: 24, left: 12 };
const ROW = 176;
const TICK = 7;
const MARGIN_DOMAIN: [number, number] = [-0.7, 0.7];

/** 線の上に載る文字は、紙色のふちで線から切り離す。 */
const HALO = {
  stroke: "var(--color-paper)",
  strokeWidth: 3,
  strokeLinejoin: "round",
  style: { paintOrder: "stroke" },
} as const;

interface Line {
  code: string;
  name: string;
  values: number[];
}

/** 上から順の点を、縦向きの曲線でつなぐ。 */
function flow(pts: [number, number][]): string {
  const [first, ...rest] = pts;
  if (first === undefined) return "";
  let d = `M${first[0]},${first[1]}`;
  let prev = first;
  for (const p of rest) {
    const ym = (prev[1] + p[1]) / 2;
    d += `C${prev[0]},${ym} ${p[0]},${ym} ${p[0]},${p[1]}`;
    prev = p;
  }
  return d;
}

/** 陣営の候補の名前（2人以上なら「・」でつなぐ）。 */
function campNames(e: PublishedElection, camp: "conservative" | "progressive"): string {
  return e.candidates
    .filter((c) => c.camp === camp)
    .map((c) => c.label ?? c.name)
    .join("・");
}

export function SwingChart({
  columns,
  lines,
  pref,
  metric,
  selected,
  onSelect,
  width,
}: {
  /** 古い順。 */
  columns: PublishedElection[];
  lines: Line[];
  /** 県全体の値（columns と同じ並び）。 */
  pref: number[];
  metric: Metric;
  selected: string;
  onSelect: (code: string) => void;
  width: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  if (width === 0) return null;

  const rows = columns.length;
  const height = M.top + (rows - 1) * ROW + M.bottom + TICK;
  const x = scaleLinear()
    .domain(metric === "margin" ? MARGIN_DOMAIN : TURNOUT_DOMAIN)
    .range([M.left, width - M.right])
    .clamp(true);
  // 上が新しい回。
  const y = (i: number) => M.top + (rows - 1 - i) * ROW;
  const pointsOf = (vs: number[]) => vs.map((v, i) => [x(v), y(i)] as [number, number]);
  const tickColor = (v: number) =>
    metric === "margin" ? (v >= 0 ? CAMP_COLOR.progressive : CAMP_COLOR.conservative) : "#5b554b";
  const label = (v: number) => (metric === "margin" ? points(v) : pct(v));

  const ticks = metric === "margin" ? [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6] : [0.5, 0.6, 0.7, 0.8, 0.9];
  const focus = [selected, hovered].filter((c): c is string => c !== null);
  const selectedLine = lines.find((l) => l.code === selected);
  const hoveredLine = hovered === null || hovered === selected ? undefined : lines.find((l) => l.code === hovered);

  return (
    <svg width={width} height={height} role="img" aria-label="市町村ごとの動き" className="block select-none">
      {/* 横軸 */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={x(t)}
            x2={x(t)}
            y1={M.top - 14}
            y2={height - M.bottom}
            className={metric === "margin" && t === 0 ? "stroke-ink/50" : "stroke-rule"}
            strokeDasharray={metric === "margin" && t === 0 ? undefined : "2 4"}
          />
          <text x={x(t)} y={M.top - 20} textAnchor="middle" className="tnum fill-faint text-[10px]">
            {metric === "margin" ? (t === 0 ? "0" : `${Math.abs(t * 100)}`) : `${t * 100}%`}
          </text>
        </g>
      ))}
      {metric === "margin" && (
        <>
          <text x={x(0) - 10} y={12} textAnchor="end" className="text-[11px]" fill={CAMP_COLOR.conservative}>
            ← 保守系が上回る
          </text>
          <text x={x(0) + 10} y={12} className="text-[11px]" fill={CAMP_COLOR.progressive}>
            革新系が上回る →
          </text>
        </>
      )}

      {/* 回の見出し */}
      {columns.map((e, i) => (
        <text key={e.n} x={width - M.right + 8} y={y(i)} dy="0.32em" className="tnum fill-muted text-[11px] font-medium">
          {year(e.date)}
        </text>
      ))}

      {/* 市町村の線（灰色） */}
      <g onPointerLeave={() => setHovered(null)}>
        {lines.map((l) => {
          const pts = pointsOf(l.values);
          const d = flow(pts);
          const on = focus.includes(l.code);
          return (
            <g key={l.code} className="cursor-pointer" onPointerEnter={() => setHovered(l.code)} onClick={() => onSelect(l.code)}>
              <path d={d} fill="none" className="stroke-rule-strong" strokeOpacity={on ? 0 : 0.8} strokeWidth={1} />
              {pts.map(([px, py], i) => (
                <line
                  key={i}
                  x1={px}
                  x2={px}
                  y1={py - TICK}
                  y2={py + TICK}
                  stroke={tickColor(l.values[i]!)}
                  strokeOpacity={on ? 0 : 0.55}
                  strokeWidth={1.5}
                />
              ))}
              {/* 当たり判定は細い線より太く取る */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={8} />
            </g>
          );
        })}
      </g>

      {/* 県全体 */}
      <path d={flow(pointsOf(pref))} fill="none" className="pointer-events-none stroke-ink/60" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={x(pref[0]!)} y={y(0) + TICK + 12} textAnchor="middle" className="pointer-events-none fill-muted text-[10px]" {...HALO}>
        県全体
      </text>

      {/* 候補者名は線の上に重ねる */}
      {metric === "margin" &&
        columns.map((e, i) => (
          <g key={`names-${e.n}`} className="pointer-events-none text-[10px]">
            <text x={x(0) - 6} y={y(i) - 12} textAnchor="end" fill={CAMP_COLOR.conservative} {...HALO}>
              {campNames(e, "conservative")}
            </text>
            <text x={x(0) + 6} y={y(i) - 12} fill={CAMP_COLOR.progressive} {...HALO}>
              {campNames(e, "progressive")}
            </text>
          </g>
        ))}

      {/* 焦点の線（ホバー中と選択中）は最後に描き、灰色の線に埋もれないようにする */}
      {[hoveredLine, selectedLine].map((l) => {
        if (l === undefined) return null;
        const pts = pointsOf(l.values);
        const isSelected = l.code === selected;
        return (
          <g key={`focus-${l.code}`} className="pointer-events-none">
            <path d={flow(pts)} fill="none" className="stroke-ink" strokeWidth={isSelected ? 2 : 1.5} strokeOpacity={isSelected ? 1 : 0.7} />
            {pts.map(([px, py], i) => (
              <g key={i}>
                <line x1={px} x2={px} y1={py - TICK} y2={py + TICK} stroke={tickColor(l.values[i]!)} strokeWidth={3} />
                {isSelected && (
                  <text x={px} y={py + TICK + 11} textAnchor="middle" className="tnum fill-ink text-[10px] font-medium" {...HALO}>
                    {label(l.values[i]!)}
                  </text>
                )}
              </g>
            ))}
            <text
              x={pts.at(-1)![0]}
              y={pts.at(-1)![1] - TICK - 5}
              textAnchor="middle"
              className={`fill-ink text-[11px] ${isSelected ? "font-semibold" : ""}`}
              {...HALO}
            >
              {l.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
