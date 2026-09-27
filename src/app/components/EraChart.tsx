/**
 * 回ごとの陣営別得票率（積み上げ柱）と投票率（折れ線）。横軸は投票日。
 * 柱は候補者ごとに区切り、保守系を下から、革新系を上から積む。
 */

import { useMemo, useState } from "react";
import { scaleLinear, scaleTime } from "d3-scale";
import { line } from "d3-shape";
import type { PublishedCandidate, PublishedElection } from "../../lib/data/published.ts";
import { CAMP_COLOR, CAMP_ORDER } from "../data/camps.ts";
import { pct, year } from "../data/format.ts";

const M = { top: 36, right: 14, left: 40 };
const H_SHARE = 260;
const GAP = 44;
const H_TURNOUT = 110;
const BOTTOM = 30;
export const ERA_HEIGHT = M.top + H_SHARE + GAP + H_TURNOUT + BOTTOM;

const TURNOUT: [number, number] = [0.4, 0.9];

interface Segment {
  c: PublishedCandidate;
  y0: number;
  y1: number;
}

/** 下から保守系（大きい順）、その他、革新系（小さい順＝最大が一番上）。 */
function stack(e: PublishedElection): Segment[] {
  const total = e.candidates.reduce((a, c) => a + c.votes, 0);
  const ordered = CAMP_ORDER.flatMap((camp) => {
    const cs = e.candidates.filter((c) => c.camp === camp).sort((a, b) => b.votes - a.votes);
    return camp === "progressive" ? cs.reverse() : cs;
  });
  let acc = 0;
  return ordered.map((c) => {
    const y0 = acc;
    acc += c.votes / total;
    return { c, y0, y1: acc };
  });
}

const date = (iso: string) => new Date(`${iso}T00:00:00`);

export function EraChart({
  elections,
  selected,
  onSelect,
  width,
}: {
  elections: PublishedElection[];
  selected: number;
  onSelect: (n: number) => void;
  width: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const layout = useMemo(() => {
    const x = scaleTime()
      .domain([date("1970-07-01"), date("2028-07-01")])
      .range([M.left, width - M.right]);
    const xs = elections.map((e) => x(date(e.date)));
    const spacing = Math.min(...xs.slice(1).map((v, i) => v - xs[i]!));
    const bw = Math.max(6, Math.min(26, spacing * 0.62));
    const yShare = scaleLinear().domain([0, 1]).range([M.top + H_SHARE, M.top]);
    const top2 = M.top + H_SHARE + GAP;
    const yTurnout = scaleLinear().domain(TURNOUT).range([top2 + H_TURNOUT, top2]);
    const turnoutPath = line<PublishedElection>()
      .x((e) => x(date(e.date)))
      .y((e) => yTurnout(e.voters.total / e.electors.total))(elections);
    return { x, xs, spacing, bw, yShare, yTurnout, top2, turnoutPath };
  }, [elections, width]);

  if (width === 0) return null;
  const { xs, spacing, bw, yShare, yTurnout, top2, turnoutPath } = layout;
  const focus = hovered ?? selected;
  const showEvery = spacing < 30 ? 2 : 1;

  return (
    <svg width={width} height={ERA_HEIGHT} role="img" aria-label="回ごとの陣営別得票率と投票率" className="block select-none">
      {/* 得票率の目盛り */}
      <text x={M.left} y={12} className="fill-muted text-[11px]">
        陣営別の得票率
      </text>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={M.left}
            x2={width - M.right}
            y1={yShare(t)}
            y2={yShare(t)}
            className={t === 0.5 ? "stroke-ink/40" : "stroke-rule"}
            strokeDasharray={t === 0.5 ? "3 3" : undefined}
          />
          <text x={M.left - 6} y={yShare(t)} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
            {t * 100}%
          </text>
        </g>
      ))}

      {/* 投票率の目盛り */}
      <text x={M.left} y={top2 - 9} className="fill-muted text-[11px]">
        投票率
      </text>
      {[0.4, 0.6, 0.8].map((t) => (
        <g key={t}>
          <line x1={M.left} x2={width - M.right} y1={yTurnout(t)} y2={yTurnout(t)} className="stroke-rule" />
          <text x={M.left - 6} y={yTurnout(t)} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
            {t * 100}%
          </text>
        </g>
      ))}
      <path d={turnoutPath ?? ""} fill="none" className="stroke-ink/70" strokeWidth={1.5} />

      {elections.map((e, i) => {
        const cx = xs[i]!;
        const dim = hovered !== null && hovered !== e.n;
        const turnout = e.voters.total / e.electors.total;
        const winner = e.candidates.find((c) => c.elected)!;
        return (
          <g
            key={e.n}
            role="button"
            tabIndex={0}
            aria-label={`第${e.n}回 ${year(e.date)}年 当選 ${winner.label ?? winner.name}`}
            aria-pressed={selected === e.n}
            onClick={() => onSelect(e.n)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onSelect(e.n);
              }
            }}
            onPointerEnter={() => setHovered(e.n)}
            onPointerLeave={() => setHovered(null)}
            className="cursor-pointer outline-none"
          >
            {/* 当たり判定は柱より広く取り、投票率の段まで伸ばす */}
            <rect
              x={cx - spacing / 2}
              y={M.top - 14}
              width={spacing}
              height={top2 + H_TURNOUT - M.top + 14}
              fill="transparent"
            />
            <g opacity={dim ? 0.55 : 1}>
              {stack(e).map(({ c, y0, y1 }) => (
                <rect
                  key={c.id}
                  x={cx - bw / 2}
                  width={bw}
                  y={yShare(y1)}
                  height={Math.max(0, yShare(y0) - yShare(y1) - 1)}
                  fill={CAMP_COLOR[c.camp]}
                  fillOpacity={c.elected ? 1 : 0.62}
                />
              ))}
              <circle cx={cx} cy={M.top - 6} r={3} fill={CAMP_COLOR[winner.camp]} />
              <circle cx={cx} cy={yTurnout(turnout)} r={3} className="fill-surface stroke-ink" strokeWidth={1.5} />
            </g>
            {selected === e.n && (
              <rect
                x={cx - bw / 2 - 3}
                y={M.top - 12}
                width={bw + 6}
                height={H_SHARE + 12 + 2}
                fill="none"
                className="stroke-ink"
                strokeWidth={1.25}
                rx={2}
              />
            )}
            {focus === e.n && (
              <text
                x={cx}
                y={yTurnout(turnout) - 9}
                textAnchor="middle"
                className="tnum fill-ink text-[10px] font-medium"
              >
                {pct(turnout)}
              </text>
            )}
            {(i % showEvery === 0 || focus === e.n) && (
              <text
                x={cx}
                y={top2 + H_TURNOUT + 18}
                textAnchor="middle"
                className={`tnum text-[10px] ${focus === e.n ? "fill-ink font-semibold" : "fill-muted"}`}
              >
                {year(e.date)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
