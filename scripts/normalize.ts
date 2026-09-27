/**
 * 手起こしの正本（data/manual/{pref}/prefecture.json）と市町村別の原本から、
 * 回ごとの正規化 JSON を data/normalized/{pref}/{n}.json に書き出す。
 *
 *   npm run normalize
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { boundaryFor } from "../src/lib/data/boundaries.ts";
import type { LineageEntry } from "../src/lib/data/lineage.ts";
import { municipalitiesAt } from "../src/lib/data/municipalities.ts";
import { SOURCES } from "../src/lib/data/sources.ts";
import type {
  Candidate,
  MaleFemale,
  MunicipalityResult,
  NormalizedElection,
  Status,
  Turnout,
} from "../src/lib/data/types.ts";
import { kaihyoRow, pdfText, readTable, touhyoRow, type Table } from "../src/lib/parse/rows.ts";
import { rawPath } from "./fetch-data.ts";

const ROOT = resolve(import.meta.dirname, "..");

type Triple = [number, number, number];

interface ManualCandidate {
  name: string;
  label?: string;
  age: number | null;
  status: Status;
  occupation: string | null;
  party: string;
  votes: number | null;
  elected: boolean;
}

interface ManualElection {
  n: number;
  date: string;
  notice: string;
  reason: string;
  electors: Triple | null;
  voters: Triple | null;
  candidates: ManualCandidate[];
  ballot?: string[];
  municipalities?: { kaihyo: string; touhyo: string };
  sources: string[];
}

/** 開票表・投票表の見出し。同じファイルに両方の表がある結果調で、読む位置を決める。 */
const KEKKA = { kaihyo: "候補者別得票数に関する調", touhyo: "投票状況に関する調" };
const HEADINGS: Record<string, { kaihyo?: string; touhyo?: string }> = {
  "2006-kekka": KEKKA,
  "2010-kekka": KEKKA,
  "2018-kekka": KEKKA,
};

const mf = ([male, female, total]: Triple): MaleFemale => ({ male, female, total });
const turnoutOf = (electors: Triple, voters: Triple): Turnout => ({ electors: mf(electors), voters: mf(voters) });

async function linesOf(pref: string, id: string): Promise<string[]> {
  const source = SOURCES[pref]?.find((s) => s.id === id);
  if (source === undefined) throw new Error(`目録にない: ${pref}/${id}`);
  const path = rawPath(pref, id);
  if (source.format === "pdf") return pdfText(path).split("\n");
  const wb = XLSX.read(await readFile(path));
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  return rows.map((r) => r.filter((v) => v !== null && v !== "").join(" "));
}

async function table(pref: string, id: string, kind: "kaihyo" | "touhyo", names: string[]): Promise<Table> {
  return readTable(await linesOf(pref, id), names, HEADINGS[id]?.[kind]);
}

interface Municipal {
  rows: MunicipalityResult[];
  totalVotes: number[];
  turnout: Turnout;
}

async function municipal(pref: string, e: ManualElection, lineage: LineageEntry[]): Promise<Municipal> {
  const ballot = e.ballot;
  const ids = e.municipalities;
  if (ballot === undefined || ids === undefined) throw new Error(`第${e.n}回: ballot / municipalities がない`);

  const list = municipalitiesAt(pref, e.date, lineage);
  const names = list.map((m) => m.name);
  const kaihyo = await table(pref, ids.kaihyo, "kaihyo", names);
  const touhyo = await table(pref, ids.touhyo, "touhyo", names);

  const rows = list.map((m): MunicipalityResult => {
    const where = `第${e.n}回 ${m.name}`;
    const k = kaihyoRow(kaihyo.rows.get(m.name)!, ballot.length, where);
    const t = touhyoRow(touhyo.rows.get(m.name)!, where);
    return {
      code: m.code,
      name: m.name,
      votes: Object.fromEntries(ballot.map((id, i) => [id, k.votes[i]!])),
      valid: k.valid,
      invalid: k.invalid,
      turnout: turnoutOf(t.electors, t.voters),
    };
  });

  const k = kaihyoRow(kaihyo.total, ballot.length, `第${e.n}回 県合計`);
  const t = touhyoRow(touhyo.total, `第${e.n}回 県合計`);
  return { rows, totalVotes: k.votes, turnout: turnoutOf(t.electors, t.voters) };
}

async function normalize(pref: string, e: ManualElection, lineage: LineageEntry[]): Promise<NormalizedElection> {
  const m = e.municipalities === undefined ? null : await municipal(pref, e, lineage);

  const candidates = e.candidates.map((c): Candidate => {
    const id = c.name.replace(/\s/g, "");
    let votes = c.votes;
    if (votes === null) {
      const i = e.ballot?.indexOf(id) ?? -1;
      if (m === null || i < 0) throw new Error(`第${e.n}回 ${c.name}: 得票がない`);
      votes = m.totalVotes[i]!;
    }
    return {
      id,
      name: c.name,
      ...(c.label !== undefined && { label: c.label }),
      age: c.age,
      status: c.status,
      occupation: c.occupation,
      party: c.party,
      votes,
      elected: c.elected,
    };
  });
  candidates.sort((a, b) => b.votes - a.votes);

  let turnout: Turnout;
  if (e.electors !== null && e.voters !== null) turnout = turnoutOf(e.electors, e.voters);
  else if (m !== null) turnout = m.turnout;
  else throw new Error(`第${e.n}回: 投票結果がない`);

  return {
    pref,
    n: e.n,
    date: e.date,
    notice: e.notice,
    reason: e.reason,
    turnout,
    candidates,
    municipalities: m === null ? null : { boundary: boundaryFor(pref, e.date)?.id ?? null, rows: m.rows },
    sources: e.sources,
  };
}

async function main(): Promise<void> {
  for (const pref of Object.keys(SOURCES)) {
    const manual = JSON.parse(await readFile(resolve(ROOT, `data/manual/${pref}/prefecture.json`), "utf8")) as {
      elections: ManualElection[];
    };
    const { entries: lineage } = JSON.parse(await readFile(resolve(ROOT, `data/lineage/${pref}.json`), "utf8")) as {
      entries: LineageEntry[];
    };
    const dir = resolve(ROOT, `data/normalized/${pref}`);
    await mkdir(dir, { recursive: true });
    for (const e of manual.elections) {
      const out = await normalize(pref, e, lineage);
      await writeFile(resolve(dir, `${e.n}.json`), `${JSON.stringify(out, null, 2)}\n`);
      const rows = out.municipalities?.rows.length ?? 0;
      console.log(`  ${pref} 第${e.n}回 ${e.date}${rows > 0 ? `（市町村 ${rows}）` : ""}`);
    }
  }
}

if (import.meta.main) await main();
