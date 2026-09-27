/**
 * 選んだ市町村の推移。合併前の市町村は現行の市町村に合算してある。
 * 県全体の値を並べ、その市町村の傾きを見やすくする。
 */

import type { ElectionsJson, PublishedElection } from "../../lib/data/published.ts";
import { campShares, margin } from "../data/camps.ts";
import { pct, points, year } from "../data/format.ts";
import { sharesOf, type Tally } from "../data/municipal.ts";
import { CampBar } from "./CampBar.tsx";

export function MuniTrend({
  name,
  data,
  series,
  current,
  missing,
}: {
  name: string;
  data: ElectionsJson;
  series: { election: PublishedElection; tally: Tally }[];
  current: number;
  /** 市町村別の資料がまだない回の数。 */
  missing: number;
}) {
  return (
    <section aria-labelledby="trend-title">
      <h3 id="trend-title" className="text-[13px] font-semibold">
        {name}の推移
      </h3>
      <p className="mt-0.5 text-[10px] text-faint">上段が{name}、下段が県全体。合併前の回は前身の市町村を合算</p>
      <ol className="mt-3 space-y-3">
        {series.map(({ election: e, tally }) => {
          const local = sharesOf(tally, e);
          const pref = campShares(e.candidates, (c) => c.votes);
          const winner = e.candidates.reduce((a, c) => ((tally.votes[c.id] ?? 0) > (tally.votes[a.id] ?? 0) ? c : a));
          return (
            <li key={e.n} className={e.n === current ? "" : "opacity-70"}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="tnum font-medium">{year(e.date)}</span>
                <span className="tnum text-muted">
                  差 {points(margin(local))}・投票率 {pct(tally.voters / tally.electors)}
                </span>
              </div>
              <div className="mt-1 space-y-[3px]">
                <CampBar shares={local} height={8} />
                <CampBar shares={pref} height={3} />
              </div>
              <p className="mt-0.5 text-[10px] text-muted">
                最多得票 {winner.label ?? winner.name}（{data.camps[winner.camp]}）
              </p>
            </li>
          );
        })}
      </ol>
      {missing > 0 && (
        <p className="mt-3 text-[10px] leading-relaxed text-faint">
          ほかの{missing}回は市町村別の資料を入手できていないため、県全体の推移だけを「時代」に載せている。
        </p>
      )}
    </section>
  );
}
