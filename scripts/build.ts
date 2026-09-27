/**
 * 正規化 JSON から配信用 JSON を public/data/{pref}/ に書き出す。
 *
 *   npm run data
 */

import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BOUNDARIES } from "../src/lib/data/boundaries.ts";
import { currentCodeMap, type LineageEntry } from "../src/lib/data/lineage.ts";
import { CURRENT } from "../src/lib/data/municipalities.ts";
import type { ElectionsJson, MunicipalitiesJson, PublishedElection } from "../src/lib/data/published.ts";
import { SOURCES } from "../src/lib/data/sources.ts";
import type { CampAssignment, CampId, NormalizedElection } from "../src/lib/data/types.ts";

const ROOT = resolve(import.meta.dirname, "..");

const PREF_NAMES: Record<string, string> = { "47": "沖縄県" };

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(ROOT, path), "utf8")) as T;
}

async function build(pref: string): Promise<void> {
  const dir = `data/normalized/${pref}`;
  const files = (await readdir(resolve(ROOT, dir))).filter((f) => f.endsWith(".json"));
  const normalized = await Promise.all(files.map((f) => readJson<NormalizedElection>(`${dir}/${f}`)));
  normalized.sort((a, b) => a.n - b.n);

  const camps = await readJson<{
    note: string;
    camps: Record<CampId, string>;
    elections: Record<string, Record<string, CampAssignment>>;
  }>(`data/manual/${pref}/camps.json`);
  const lineage = await readJson<{ entries: LineageEntry[] }>(`data/lineage/${pref}.json`);

  const elections = normalized.map((e): PublishedElection => ({
    n: e.n,
    date: e.date,
    notice: e.notice,
    reason: e.reason,
    electors: e.turnout.electors,
    voters: e.turnout.voters,
    candidates: e.candidates.map((c) => {
      const a = camps.elections[String(e.n)]?.[c.id];
      if (a === undefined) throw new Error(`第${e.n}回 ${c.name}: 陣営がない`);
      return { ...c, camp: a.camp, campBasis: a.basis, campSource: a.source };
    }),
    municipal: e.municipalities !== null,
    boundary: e.municipalities?.boundary ?? null,
  }));

  const used = new Set(normalized.flatMap((e) => e.sources));
  const out: ElectionsJson = {
    pref,
    prefName: PREF_NAMES[pref] ?? pref,
    camps: camps.camps,
    campNote: camps.note,
    elections,
    sources: (SOURCES[pref] ?? [])
      .filter((s) => used.has(s.id))
      .map((s) => ({ id: s.id, title: s.title, url: s.url })),
  };

  const municipalities: MunicipalitiesJson = {
    current: (CURRENT[pref] ?? []).map((m) => ({ code: m.code, name: m.name })),
    toCurrent: currentCodeMap(lineage.entries),
    elections: Object.fromEntries(
      normalized
        .filter((e) => e.municipalities !== null)
        .map((e) => [
          String(e.n),
          e.municipalities!.rows.map((r) => ({
            code: r.code,
            name: r.name,
            votes: r.votes,
            valid: r.valid,
            invalid: r.invalid,
            electors: r.turnout.electors.total,
            voters: r.turnout.voters.total,
          })),
        ]),
    ),
    boundaries: Object.fromEntries(
      (BOUNDARIES[pref] ?? []).map((b) => [b.id, { label: b.label, codeKey: b.codeKey, nameKey: b.nameKey }]),
    ),
  };

  const outDir = resolve(ROOT, `public/data/${pref}`);
  await mkdir(resolve(outDir, "geo"), { recursive: true });
  await writeFile(resolve(outDir, "elections.json"), JSON.stringify(out));
  await writeFile(resolve(outDir, "municipalities.json"), JSON.stringify(municipalities));
  for (const b of BOUNDARIES[pref] ?? []) await copyFile(resolve(ROOT, b.file), resolve(outDir, "geo", `${b.id}.json`));

  console.log(`  ${pref}: ${elections.length} 回、市町村別 ${Object.keys(municipalities.elections).length} 回`);
}

async function main(): Promise<void> {
  for (const pref of Object.keys(SOURCES)) await build(pref);
}

if (import.meta.main) await main();
