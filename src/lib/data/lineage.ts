/**
 * 合併前の市町村を現行の市町村にまとめる。
 */

export interface LineageEntry {
  code: string;
  name: string;
  until: string;
  successor: string;
  successorName: string;
}

/** 旧コード → 現行コード。後継がさらに合併していれば、その先までたどる。 */
export function currentCodeMap(entries: readonly LineageEntry[]): Record<string, string> {
  const next = new Map(entries.map((e) => [e.code, e.successor]));
  const out: Record<string, string> = {};
  for (const e of entries) {
    let code = e.successor;
    const seen = new Set([e.code]);
    while (next.has(code)) {
      if (seen.has(code)) throw new Error(`合併の対応が循環している: ${code}`);
      seen.add(code);
      code = next.get(code)!;
    }
    out[e.code] = code;
  }
  return out;
}
