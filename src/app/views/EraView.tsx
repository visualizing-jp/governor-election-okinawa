import { use } from "react";
import { EraChart, ERA_HEIGHT } from "../components/EraChart.tsx";
import { ElectionDetail } from "../components/ElectionDetail.tsx";
import { CampLegend } from "../components/CampBar.tsx";
import { useWidth } from "../hooks/useWidth.ts";
import { loadElections } from "../data/load.ts";
import { year } from "../data/format.ts";

export function EraView({
  n,
  onSelect,
  onOpenMunicipal,
}: {
  n: number;
  onSelect: (n: number) => void;
  onOpenMunicipal: () => void;
}) {
  const data = use(loadElections());
  const [ref, width] = useWidth<HTMLDivElement>();
  const election = data.elections.find((e) => e.n === n) ?? data.elections.at(-1)!;
  const previous = data.elections.find((e) => e.n === election.n - 1);

  const wins = { conservative: 0, progressive: 0, other: 0 };
  for (const e of data.elections) wins[e.candidates.find((c) => c.elected)!.camp]++;
  const first = data.elections[0]!;
  const last = data.elections.at(-1)!;

  return (
    <main className="mx-auto grid w-full max-w-[1240px] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <p className="max-w-[46em] text-[14px] leading-relaxed">
          {year(first.date)}年の本土復帰から{year(last.date)}年までの{data.elections.length}回で、
          {data.camps.conservative}が{wins.conservative}回、{data.camps.progressive}が{wins.progressive}回当選した。
        </p>
        <div className="mt-3">
          <CampLegend labels={data.camps} />
          <p className="mt-1 text-[11px] text-faint">柱は候補者ごとに区切り、当選者を濃く塗る。上の点は当選者の陣営。</p>
        </div>
        <div ref={ref} className="mt-4" style={{ minHeight: ERA_HEIGHT }}>
          <EraChart elections={data.elections} selected={election.n} onSelect={onSelect} width={width} />
        </div>
      </div>
      <ElectionDetail
        data={data}
        election={election}
        previous={previous}
        onSelect={onSelect}
        onOpenMunicipal={onOpenMunicipal}
      />
    </main>
  );
}
