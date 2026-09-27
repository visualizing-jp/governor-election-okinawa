/**
 * 選挙管理委員会の開票表・投票表から、市町村ごとの数値の並びを取り出す。
 *
 * PDF は `pdftotext -layout` の出力、Excel はセルを空白でつないだ行を受け取る。
 * どちらも「市町村名のあとに数値が並ぶ」行でできている。
 */

import { execFileSync } from "node:child_process";

export function pdfText(path: string): string {
  return execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** 字間の空白（「那 覇 市」）を詰める。数値どうしの区切りは残す。 */
function squash(line: string): string {
  return line
    .replace(/(?<=[^\x00-\x7F])[ \t\u3000]+(?=[^\x00-\x7F])/g, "")
    .replace(/△\s*/g, "-");
}

function numbersIn(text: string): number[] {
  return [...text.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, "")));
}

export interface Table {
  rows: Map<string, number[]>;
  /** 県合計の行。 */
  total: number[];
}

/**
 * `from` の見出しより後ろにある最初の表を読む。
 * 市町村名だけの行（名前と数値が2行に割れた行）は、次の数値行と組にする。
 */
export function readTable(lines: string[], names: readonly string[], from?: string): Table {
  const byLength = [...names].sort((a, b) => b.length - a.length);
  let start = 0;
  if (from !== undefined) {
    start = lines.findIndex((l) => squash(l).includes(from));
    if (start < 0) throw new Error(`見出しが見つからない: ${from}`);
  }

  const rows = new Map<string, number[]>();
  let pending: string | null = null;

  for (const raw of lines.slice(start)) {
    const line = squash(raw);

    if (line.includes("県合計")) {
      if (rows.size !== names.length) {
        const missing = names.filter((n) => !rows.has(n));
        throw new Error(`市町村が揃う前に県合計に達した（欠け: ${missing.join("、")}）`);
      }
      return { rows, total: numbersIn(line.slice(line.indexOf("県合計") + 3)) };
    }

    const name = byLength.find((n) => line.includes(n));
    if (name !== undefined && !rows.has(name)) {
      const nums = numbersIn(line.slice(line.indexOf(name) + name.length));
      if (nums.length === 0) pending = name;
      else rows.set(name, nums);
      continue;
    }

    if (pending !== null) {
      const nums = numbersIn(line);
      if (nums.length > 0) {
        rows.set(pending, nums);
        pending = null;
      }
    }
  }
  throw new Error("県合計の行が見つからない");
}

export interface KaihyoRow {
  votes: number[];
  valid: number;
  invalid: number;
  total: number;
  voters: number;
}

/**
 * 開票表の1行。候補者列のあとに空き枠の 0 が挟まる表があるので、
 * 候補者の合計と一致する数値を有効投票とみなし、その後ろを読む。
 */
export function kaihyoRow(nums: number[], candidates: number, where: string): KaihyoRow {
  const votes = nums.slice(0, candidates);
  const sum = votes.reduce((a, b) => a + b, 0);
  const i = nums.findIndex((v, k) => k >= candidates && Math.abs(v - sum) < 0.01);
  if (i < 0) throw new Error(`${where}: 候補者の合計 ${sum} と一致する有効投票がない [${nums.join(", ")}]`);
  const [valid, invalid, total, , voters] = nums.slice(i, i + 5);
  if (voters === undefined) throw new Error(`${where}: 投票者数まで読めない [${nums.join(", ")}]`);
  return { votes, valid: valid!, invalid: invalid!, total: total!, voters };
}

export interface TouhyoRow {
  electors: [number, number, number];
  voters: [number, number, number];
}

export function touhyoRow(nums: number[], where: string): TouhyoRow {
  if (nums.length < 6) throw new Error(`${where}: 投票表の列が足りない [${nums.join(", ")}]`);
  const [em, ef, et, vm, vf, vt] = nums as [number, number, number, number, number, number];
  return { electors: [em, ef, et], voters: [vm, vf, vt] };
}
