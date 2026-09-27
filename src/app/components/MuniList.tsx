/**
 * 市町村を値の順に並べた一覧。地図では見えにくい小さな島も同じ大きさで比べられる。
 * 差は中央から左右へ、投票率は左から伸ばす。
 */

import type { Metric } from "../data/municipal.ts";
import { CAMP_COLOR, TURNOUT_DOMAIN } from "../data/camps.ts";
import { pct, points } from "../data/format.ts";

export interface ListItem {
  code: string;
  name: string;
  value: number;
}

const MAX_MARGIN = 0.6;

export function MuniList({
  items,
  metric,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  items: ListItem[];
  metric: Metric;
  hovered: string | null;
  selected: string;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
}) {
  const sorted = [...items].sort((a, b) => b.value - a.value);

  return (
    <ol className="text-[11px]" onPointerLeave={() => onHover(null)}>
      {sorted.map((it) => {
        const active = it.code === selected;
        const focus = it.code === hovered;
        let bar: { left: string; width: string; color: string };
        if (metric === "margin") {
          const w = (Math.min(Math.abs(it.value), MAX_MARGIN) / MAX_MARGIN) * 50;
          bar = {
            left: it.value >= 0 ? "50%" : `${50 - w}%`,
            width: `${w}%`,
            color: it.value >= 0 ? CAMP_COLOR.progressive : CAMP_COLOR.conservative,
          };
        } else {
          const [lo, hi] = TURNOUT_DOMAIN;
          bar = { left: "0%", width: `${((it.value - lo) / (hi - lo)) * 100}%`, color: "#5b554b" };
        }
        return (
          <li key={it.code}>
            <button
              type="button"
              onClick={() => onSelect(it.code)}
              onPointerEnter={() => onHover(it.code)}
              aria-pressed={active}
              className={`grid w-full cursor-pointer grid-cols-[5.5em_minmax(0,1fr)_4.2em] items-center gap-2 rounded-[3px] px-1.5 py-[3px] text-left ${
                active ? "bg-ink/[0.07] font-semibold" : focus ? "bg-ink/[0.04]" : ""
              }`}
            >
              <span className="truncate">{it.name}</span>
              <span className="relative h-2">
                {metric === "margin" && <span className="absolute inset-y-[-2px] left-1/2 w-px bg-rule-strong" />}
                <span
                  className="absolute inset-y-0 rounded-[1px]"
                  style={{ left: bar.left, width: bar.width, backgroundColor: bar.color }}
                />
              </span>
              <span className="tnum text-right text-muted">{metric === "margin" ? points(it.value) : pct(it.value)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
