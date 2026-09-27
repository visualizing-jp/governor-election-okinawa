/**
 * 正規化 JSON の健全性チェック。1つでも落ちたら終了コード 1。
 * 資料どうしの食い違いのうち、計が合っていて内訳だけが違うものは注意として出す。
 *
 *   npm run verify
 */

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import type { Topology } from "topojson-specification";
import { BOUNDARIES } from "../src/lib/data/boundaries.ts";
import { currentCodeMap, type LineageEntry } from "../src/lib/data/lineage.ts";
import { CURRENT, municipalitiesAt } from "../src/lib/data/municipalities.ts";
import type { CampAssignment, MaleFemale, NormalizedElection } from "../src/lib/data/types.ts";
import { rawPath } from "./fetch-data.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PREF = "47";

type Triple = [number, number, number];

/**
 * 総務省「選挙結果調」（スキャン画像）から読み取った値。
 * 当日有権者数・投票者数は [男, 女, 計]。
 */
const SOUMU: Record<number, { electors: Triple; voters: Triple; valid: number; invalid: number; votes: Record<string, number> }> = {
  11: {
    electors: [518802, 549393, 1068195],
    voters: [311071, 339291, 650362],
    valid: 645906,
    invalid: 4443,
    votes: { 仲井眞弘多: 335708, 伊波洋一: 297082, 金城竜郎: 13116 },
  },
  12: {
    electors: [533786, 564551, 1098337],
    voters: [338010, 366358, 704368],
    valid: 699164,
    invalid: 5192,
    votes: { 翁長雄志: 360820, 仲井眞弘多: 261076, 下地幹郎: 69447, 喜納昌吉: 7821 },
  },
  13: {
    electors: [558500, 588315, 1146815],
    voters: [345083, 380171, 725254],
    valid: 720210,
    invalid: 5037,
    votes: { 玉城康裕: 396632, 佐喜眞淳: 316458, 渡口初美: 3482, 兼島俊: 3638 },
  },
  14: {
    electors: [567614, 597996, 1165610],
    voters: [322870, 352298, 675168],
    valid: 668288,
    invalid: 6882,
    votes: { 下地幹郎: 53677, 佐喜眞淳: 274844, 玉城康裕: 339767 },
  },
};

/** 按分票の丸めが候補者の数だけ積もるので、票の比較には 0.01 の幅を持たせる。 */
const EPS = 0.01;

const failures: string[] = [];
const notes: string[] = [];
let checks = 0;

function check(ok: boolean, message: string): void {
  checks++;
  if (!ok) failures.push(message);
}

const near = (a: number, b: number) => Math.abs(a - b) <= EPS;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const triple = (m: MaleFemale): Triple => [m.male, m.female, m.total];

/** 資料によって字体が違う（眞/真、惠/恵）ので、照合の前に揃える。 */
const fold = (name: string) => name.replace(/[\s\u3000]/g, "").replace(/眞/g, "真").replace(/惠/g, "恵");

function checkMaleFemale(where: string, m: MaleFemale): void {
  check(m.male + m.female === m.total, `${where}: 男 ${m.male} + 女 ${m.female} ≠ 計 ${m.total}`);
}

function checkElection(e: NormalizedElection, lineage: LineageEntry[]): void {
  const at = `第${e.n}回`;
  checkMaleFemale(`${at} 有権者`, e.turnout.electors);
  checkMaleFemale(`${at} 投票者`, e.turnout.voters);
  check(e.turnout.voters.total < e.turnout.electors.total, `${at}: 投票者が有権者を上回る`);

  for (const c of e.candidates) check(c.votes > 0, `${at} ${c.name}: 得票が正でない ${c.votes}`);
  const elected = e.candidates.filter((c) => c.elected);
  check(elected.length === 1, `${at}: 当選者が ${elected.length} 人`);
  check(elected[0] === e.candidates[0], `${at}: 当選者が最多得票でない`);

  const m = e.municipalities;
  if (m === null) return;

  const expected = municipalitiesAt(PREF, e.date, lineage);
  check(
    m.rows.length === expected.length && m.rows.every((r, i) => r.code === expected[i]?.code),
    `${at}: 市町村がその日の目録と揃っていない`,
  );

  for (const r of m.rows) {
    const where = `${at} ${r.name}`;
    const s = sum(Object.values(r.votes));
    check(near(s, r.valid), `${where}: 得票の合計 ${s} ≠ 有効投票 ${r.valid}`);
    checkMaleFemale(`${where} 有権者`, r.turnout.electors);
    checkMaleFemale(`${where} 投票者`, r.turnout.voters);
    check(r.valid + r.invalid <= r.turnout.voters.total + 20, `${where}: 投票総数が投票者数を大きく上回る`);
  }

  for (const c of e.candidates) {
    const s = sum(m.rows.map((r) => r.votes[c.id] ?? Number.NaN));
    check(near(s, c.votes), `${at} ${c.name}: 市町村の合計 ${s} ≠ 県 ${c.votes}`);
  }
  for (const key of ["electors", "voters"] as const) {
    for (const k of ["male", "female", "total"] as const) {
      const s = sum(m.rows.map((r) => r.turnout[key][k]));
      const pref = e.turnout[key][k];
      if (k === "total") check(s === pref, `${at} ${key}.${k}: 市町村の合計 ${s} ≠ 県 ${pref}`);
      else if (s !== pref) notes.push(`${at} ${key}.${k}: 市町村の合計 ${s} と県 ${pref} が ${s - pref} 違う`);
    }
  }
}

function checkSoumu(e: NormalizedElection): void {
  const s = SOUMU[e.n];
  if (s === undefined) return;
  const at = `第${e.n}回 総務省`;
  for (const key of ["electors", "voters"] as const) {
    const ours = triple(e.turnout[key]);
    check(ours[2] === s[key][2], `${at} ${key}: 計 ${ours[2]} ≠ ${s[key][2]}`);
    if (ours[0] !== s[key][0] || ours[1] !== s[key][1]) {
      notes.push(`${at} ${key}: 男女の内訳が違う（年報 ${ours[0]}/${ours[1]}、総務省 ${s[key][0]}/${s[key][1]}）。計は一致`);
    }
  }
  const names = Object.keys(s.votes).sort().join("、");
  check(names === e.candidates.map((c) => c.id).sort().join("、"), `${at}: 候補者が違う`);
  for (const c of e.candidates) check(s.votes[c.id] === c.votes, `${at} ${c.name}: ${c.votes} ≠ ${s.votes[c.id]}`);

  if (e.municipalities !== null) {
    const valid = sum(e.municipalities.rows.map((r) => r.valid));
    const invalid = sum(e.municipalities.rows.map((r) => r.invalid));
    check(near(valid, s.valid), `${at}: 有効投票の合計 ${valid} ≠ ${s.valid}`);
    check(invalid === s.invalid, `${at}: 無効投票の合計 ${invalid} ≠ ${s.invalid}`);
  }
}

/** 那覇市「知事選挙の記録」。第k回は 6 + 3(k-1) 列目から 氏名・那覇市の得票・県全体の得票。 */
async function checkNaha(elections: NormalizedElection[]): Promise<void> {
  const wb = XLSX.read(await readFile(rawPath(PREF, "naha")));
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, raw: true, defval: null });
  const label = (i: number) => String(rows[i]?.[0] ?? "");
  const first = rows.findIndex((_, i) => label(i).includes("立候補者名"));
  check(first > 0, "那覇市: 立候補者名の行が見つからない");

  let matched = 0;
  for (const e of elections) {
    const col = 6 + 3 * (e.n - 1);
    const heading = String(rows[0]?.[col] ?? "");
    if (!heading.includes(`第${e.n}回 沖縄県知事選挙`)) continue;
    matched++;

    const listed = new Map<string, { naha: number; pref: number }>();
    for (let i = first; i < first + 4; i++) {
      const name = rows[i]?.[col];
      if (typeof name !== "string" || name.trim() === "" || name.includes("※")) continue;
      listed.set(fold(name), { naha: Number(rows[i]![col + 1]), pref: Number(rows[i]![col + 2]) });
    }

    const at = `第${e.n}回 那覇市`;
    check(listed.size === e.candidates.length, `${at}: 候補者数 ${listed.size} ≠ ${e.candidates.length}`);
    const nahaRow = e.municipalities?.rows.find((r) => r.name === "那覇市");
    for (const c of e.candidates) {
      const x = listed.get(fold(c.name));
      check(x !== undefined, `${at}: ${c.name} が載っていない`);
      if (x === undefined) continue;
      check(x.pref === c.votes, `${at} ${c.name}: 県全体 ${c.votes} ≠ ${x.pref}`);
      if (nahaRow !== undefined) check(near(nahaRow.votes[c.id] ?? -1, x.naha), `${at} ${c.name}: 那覇市 ${nahaRow.votes[c.id]} ≠ ${x.naha}`);
    }
  }
  // 那覇市の記録は第14回（2022年）まで。
  check(matched === 14, `那覇市: 照合できた回が ${matched}（14 のはず）`);
}

async function checkCamps(elections: NormalizedElection[]): Promise<void> {
  const camps = JSON.parse(await readFile(resolve(ROOT, `data/manual/${PREF}/camps.json`), "utf8")) as {
    elections: Record<string, Record<string, CampAssignment>>;
  };
  for (const e of elections) {
    const assigned = camps.elections[String(e.n)] ?? {};
    const ids = e.candidates.map((c) => c.id).sort().join("、");
    check(Object.keys(assigned).sort().join("、") === ids, `第${e.n}回 陣営: 候補者と揃っていない`);
    const main = e.candidates.slice(0, 2).map((c) => assigned[c.id]?.camp);
    check(main[0] !== main[1], `第${e.n}回 陣営: 上位2人が同じ陣営 ${main.join("、")}`);
  }
}

async function checkBoundaries(elections: NormalizedElection[]): Promise<void> {
  for (const b of BOUNDARIES[PREF] ?? []) {
    const topo = JSON.parse(await readFile(resolve(ROOT, b.file), "utf8")) as Topology;
    const codes = new Set<string>();
    for (const obj of Object.values(topo.objects)) {
      if (obj.type !== "GeometryCollection") continue;
      for (const g of obj.geometries) codes.add(String((g.properties as Record<string, unknown> | undefined)?.[b.codeKey]));
    }
    for (const e of elections) {
      if (e.municipalities?.boundary !== b.id) continue;
      const missing = e.municipalities.rows.filter((r) => !codes.has(r.code)).map((r) => r.name);
      check(missing.length === 0, `第${e.n}回 地図 ${b.id}: 境界がない ${missing.join("、")}`);
    }
  }
}

async function checkLineage(elections: NormalizedElection[]): Promise<void> {
  const { entries } = JSON.parse(await readFile(resolve(ROOT, `data/lineage/${PREF}.json`), "utf8")) as {
    entries: LineageEntry[];
  };
  const current = new Set((CURRENT[PREF] ?? []).map((m) => m.code));
  const map = currentCodeMap(entries);
  for (const [old, now] of Object.entries(map)) check(current.has(now), `合併: ${old} の行き先 ${now} が現行の市町村にない`);

  const until = new Map(entries.map((e) => [e.code, e.until]));
  for (const e of elections) {
    for (const r of e.municipalities?.rows ?? []) {
      const end = until.get(r.code);
      const existed = end === undefined ? current.has(r.code) : e.date < end;
      check(existed, `第${e.n}回 ${r.name}: ${r.code} は ${e.date} に存在しない`);
    }
  }
}

async function main(): Promise<void> {
  const dir = resolve(ROOT, `data/normalized/${PREF}`);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const elections = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(resolve(dir, f), "utf8")) as NormalizedElection),
  );
  elections.sort((a, b) => a.n - b.n);
  check(elections.every((e, i) => e.n === i + 1), "回が連番でない");

  const { entries: lineage } = JSON.parse(await readFile(resolve(ROOT, `data/lineage/${PREF}.json`), "utf8")) as {
    entries: LineageEntry[];
  };
  for (const e of elections) {
    checkElection(e, lineage);
    checkSoumu(e);
  }
  await checkNaha(elections);
  await checkCamps(elections);
  await checkBoundaries(elections);
  await checkLineage(elections);

  for (const n of notes) console.log(`  注意: ${n}`);
  if (failures.length > 0) {
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error(`\n${failures.length} / ${checks} 件が失敗`);
    process.exit(1);
  }
  console.log(`  ${checks} 件すべて通過（${elections.length} 回）`);
}

if (import.meta.main) await main();
