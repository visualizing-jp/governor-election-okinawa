/**
 * 選んだ回の詳細。候補者の得票と、陣営に分けた根拠。
 */

import type { ElectionsJson, PublishedElection } from "../../lib/data/published.ts";
import { campShares, margin } from "../data/camps.ts";
import { dateJa, pct, points, votes } from "../data/format.ts";
import { CampBar, CampSwatch } from "./CampBar.tsx";

const PRESS = "cursor-pointer transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]";

export function ElectionDetail({
  data,
  election: e,
  previous,
  onSelect,
  onOpenMunicipal,
}: {
  data: ElectionsJson;
  election: PublishedElection;
  previous: PublishedElection | undefined;
  onSelect: (n: number) => void;
  onOpenMunicipal: () => void;
}) {
  const total = e.candidates.reduce((a, c) => a + c.votes, 0);
  const turnout = e.voters.total / e.electors.total;
  const shares = campShares(e.candidates, (c) => c.votes);
  const last = data.elections.at(-1)!.n;

  return (
    <section aria-labelledby="detail-title" className="rounded-lg border border-rule bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="detail-title" className="text-[15px] font-semibold tracking-tight">
            第{e.n}回 {dateJa(e.date)}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {e.reason}による選挙・{dateJa(e.notice)}告示
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onSelect(e.n - 1)}
            disabled={e.n === 1}
            aria-label="前の回"
            className={`rounded-md border border-rule px-2 py-1 text-[12px] text-muted hover:text-ink disabled:cursor-default disabled:opacity-40 ${PRESS}`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => onSelect(e.n + 1)}
            disabled={e.n === last}
            aria-label="次の回"
            className={`rounded-md border border-rule px-2 py-1 text-[12px] text-muted hover:text-ink disabled:cursor-default disabled:opacity-40 ${PRESS}`}
          >
            →
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-rule py-3">
        <div>
          <dt className="text-[10px] text-faint">当日有権者数</dt>
          <dd className="tnum text-[13px] font-medium">{votes(e.electors.total)}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-faint">投票者数</dt>
          <dd className="tnum text-[13px] font-medium">{votes(e.voters.total)}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-faint">投票率</dt>
          <dd className="tnum text-[13px] font-medium">
            {pct(turnout, 2)}
            {previous !== undefined && (
              <span className="ml-1 text-[10px] font-normal text-muted">
                {points(turnout - previous.voters.total / previous.electors.total)}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <CampBar shares={shares} />
        <p className="tnum mt-1.5 flex justify-between text-[11px] text-muted">
          <span>
            {data.camps.conservative} {pct(shares.conservative)}
          </span>
          <span>
            {data.camps.progressive} {pct(shares.progressive)}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-faint">
          差（革新系・オール沖縄 − 保守系）{points(margin(shares))}
        </p>
      </div>

      <table className="mt-4 w-full text-[12px]">
        <caption className="sr-only">候補者別の得票</caption>
        <thead>
          <tr className="border-b border-rule text-left text-[10px] text-faint">
            <th className="pb-1 font-normal">候補者</th>
            <th className="pb-1 text-right font-normal">得票</th>
            <th className="pb-1 text-right font-normal">得票率</th>
          </tr>
        </thead>
        <tbody>
          {e.candidates.map((c) => (
            <tr key={c.id} className="border-b border-rule/70 align-top">
              <td className="py-2 pr-2">
                <div className="flex items-center gap-1.5">
                  <CampSwatch camp={c.camp} />
                  <span className={c.elected ? "font-semibold" : ""}>{c.label ?? c.name}</span>
                  {c.elected && <span className="rounded-[3px] bg-ink px-1 text-[9px] leading-[14px] text-surface">当選</span>}
                </div>
                <div className="mt-0.5 pl-4 text-[10px] leading-snug text-muted">
                  {[c.label !== undefined ? c.name : null, c.age !== null ? `${c.age}歳` : null, c.status, c.party, c.occupation]
                    .filter((v) => v !== null)
                    .join("・")}
                </div>
              </td>
              <td className="tnum py-2 text-right">{votes(c.votes)}</td>
              <td className="tnum py-2 pl-2 text-right">{pct(c.votes / total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {e.municipal && (
        <button
          type="button"
          onClick={onOpenMunicipal}
          className={`mt-4 w-full rounded-md bg-ink px-3 py-2 text-[12px] font-medium text-surface ${PRESS}`}
        >
          この回を市町村別に見る
        </button>
      )}

      <details className="mt-4 text-[11px] text-muted">
        <summary className="cursor-pointer text-muted hover:text-ink">陣営に分けた根拠</summary>
        <ul className="mt-2 space-y-1.5">
          {e.candidates.map((c) => (
            <li key={c.id} className="leading-snug">
              <span className="text-ink">{c.label ?? c.name}</span>（{data.camps[c.camp]}）: {c.campBasis}{" "}
              <a href={c.campSource} target="_blank" rel="noreferrer" className="underline decoration-rule-strong underline-offset-2 hover:text-ink">
                出典
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
