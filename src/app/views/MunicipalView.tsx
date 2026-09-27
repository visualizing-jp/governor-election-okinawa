import { use, useCallback, useMemo, useState } from "react";
import { MuniMap } from "../components/MuniMap.tsx";
import { MuniList } from "../components/MuniList.tsx";
import { MuniTrend } from "../components/MuniTrend.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { CampSwatch } from "../components/CampBar.tsx";
import { MetricLegend } from "../components/MetricLegend.tsx";
import { useWidth } from "../hooks/useWidth.ts";
import { loadBoundary, loadElections, loadMunicipalities } from "../data/load.ts";
import { marginColor, turnoutColor } from "../data/camps.ts";
import { dateJa, pct, votes, year } from "../data/format.ts";
import { OMITTED, byCurrent, currentOf as resolveCurrent, metricOf, sharesOf, type Metric } from "../data/municipal.ts";

const METRICS = [
  { value: "margin", label: "陣営の差" },
  { value: "turnout", label: "投票率" },
] as const;

export function MunicipalView({
  n,
  onSelectElection,
  metric,
  onMetric,
  selected,
  onSelectMunicipality,
}: {
  n: number;
  onSelectElection: (n: number) => void;
  metric: Metric;
  onMetric: (m: Metric) => void;
  selected: string;
  onSelectMunicipality: (code: string) => void;
}) {
  const data = use(loadElections());
  const munis = use(loadMunicipalities());
  const available = data.elections.filter((e) => e.municipal);
  const election = available.find((e) => e.n === n) ?? available.at(-1)!;
  const requested = data.elections.find((e) => e.n === n);
  const topo = election.boundary === null ? null : use(loadBoundary(election.boundary));
  const boundary = election.boundary === null ? null : munis.boundaries[election.boundary]!;

  const [hovered, setHovered] = useState<string | null>(null);
  const [mapRef, mapWidth] = useWidth<HTMLDivElement>();

  const rows = munis.elections[String(election.n)]!;
  const rowByCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows]);
  const codes = useMemo(() => new Set(rows.map((r) => r.code)), [rows]);
  const currentOf = useCallback((code: string) => resolveCurrent(munis, code), [munis]);
  const selectedCode = munis.current.some((m) => m.code === selected) ? selected : munis.current[0]!.code;
  const selectedName = munis.current.find((m) => m.code === selectedCode)!.name;

  const valueOf = (code: string) => metricOf(rowByCode.get(code)!, election, metric);
  const fill = (code: string) => (metric === "margin" ? marginColor(valueOf(code)) : turnoutColor(valueOf(code)));

  const tallies = byCurrent(munis, rows);
  const listItems = munis.current
    .filter((m) => tallies.has(m.code))
    .map((m) => ({ code: m.code, name: m.name, value: metricOf(tallies.get(m.code)!, election, metric) }));

  const conservativeWins = rows.filter((r) => {
    const s = sharesOf(r, election);
    return s.conservative > s.progressive;
  }).length;

  const series = available.map((e) => ({
    election: e,
    tally: byCurrent(munis, munis.elections[String(e.n)]!).get(selectedCode)!,
  }));

  /** 陣営の候補が1人なら名前を添える。革新系が割れた回（2002年）は陣営だけを書く。 */
  const nameOf = (camp: "conservative" | "progressive") => {
    const cs = election.candidates.filter((c) => c.camp === camp);
    return cs.length === 1 ? `の${cs[0]!.label ?? cs[0]!.name}` : "";
  };

  return (
    <main className="mx-auto w-full max-w-[1240px] px-6 py-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          label="回"
          options={available.map((e) => ({ value: String(e.n), label: year(e.date) }))}
          value={String(election.n)}
          onChange={(v) => onSelectElection(Number(v))}
        />
        <Segmented label="指標" options={METRICS} value={metric} onChange={onMetric} />
      </div>

      {requested !== undefined && !requested.municipal && (
        <p className="mt-3 text-[11px] text-muted">
          第{requested.n}回（{year(requested.date)}年）は市町村別の資料を入手できていないので、第{election.n}回を表示している。
        </p>
      )}

      <p className="mt-4 max-w-[46em] text-[14px] leading-relaxed">
        第{election.n}回（{dateJa(election.date)}）は、{rows.length}市町村のうち{conservativeWins}で保守系{nameOf("conservative")}が、
        {rows.length - conservativeWins}で革新系{nameOf("progressive")}が上回った。
      </p>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <MetricLegend metric={metric} />
          <div ref={mapRef} className="mt-3">
            {topo === null || boundary === null ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-md border border-dashed border-rule-strong px-6 text-center text-[12px] leading-relaxed text-muted">
                この回の市町村境界（{rows.length}市町村）の地図は準備中。
                <br />
                市町村別の結果は、右の一覧と推移で見られる。
              </div>
            ) : (
              <MuniMap
                topo={topo}
                codeKey={boundary.codeKey}
                codes={codes}
                currentOf={currentOf}
                fill={fill}
                hovered={hovered}
                selected={selectedCode}
                onHover={setHovered}
                onSelect={onSelectMunicipality}
                width={mapWidth}
                tooltip={(code) => {
                  const r = rowByCode.get(code)!;
                  return (
                    <>
                      <p className="text-[12px] font-semibold">{r.name}</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {election.candidates.map((c) => (
                          <li key={c.id} className="tnum flex items-center gap-1.5">
                            <CampSwatch camp={c.camp} />
                            <span className="min-w-0 flex-1 truncate">{c.label ?? c.name}</span>
                            <span>{votes(r.votes[c.id] ?? 0)}</span>
                            <span className="w-11 text-right text-muted">{pct((r.votes[c.id] ?? 0) / r.valid)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="tnum mt-1.5 text-muted">投票率 {pct(r.voters / r.electors)}</p>
                    </>
                  );
                }}
              />
            )}
          </div>
          {boundary !== null && (
            <p className="mt-2 text-[10px] leading-relaxed text-faint">
              縮尺は本島の枠と下段の枠で異なる（下段の3枠は同じ縮尺）。境界は{boundary.label}。{OMITTED}。
            </p>
          )}
        </div>

        <aside className="space-y-8">
          <MuniTrend
            name={selectedName}
            data={data}
            series={series}
            current={election.n}
            missing={data.elections.length - available.length}
          />
          <section aria-labelledby="list-title">
            <h3 id="list-title" className="text-[13px] font-semibold">
              {metric === "margin" ? "陣営の差の順" : "投票率の順"}
            </h3>
            {rows.length !== munis.current.length && (
              <p className="mt-0.5 text-[10px] text-faint">
                合併前の{rows.length}市町村を、現行の{munis.current.length}市町村に合算している
              </p>
            )}
            <div className="mt-2">
              <MuniList
                items={listItems}
                metric={metric}
                hovered={hovered === null ? null : currentOf(hovered)}
                selected={selectedCode}
                onHover={setHovered}
                onSelect={onSelectMunicipality}
              />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
