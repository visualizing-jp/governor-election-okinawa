/**
 * 市町村境界の版。選挙の日付に対して、その日に有効だった最も新しい版を使う。
 *
 * 旧境界を足すときは、ここに版を加え、TopoJSON を data/geo/{pref}/ に置く。
 * 地物の属性に 5桁の市町村コード（codeKey）と名前（nameKey）が要る。
 */

export interface Boundary {
  id: string;
  label: string;
  /** この境界が有効になった日（ISO 8601）。 */
  from: string;
  /** リポジトリのルートからのパス。 */
  file: string;
  codeKey: string;
  nameKey: string;
}

export const BOUNDARIES: Record<string, Boundary[]> = {
  "47": [
    {
      id: "2006",
      label: "2006年1月以降（41市町村）",
      from: "2006-01-01",
      file: "data/geo/47/2006.topojson",
      codeKey: "N03_007",
      nameKey: "nam_ja",
    },
  ],
};

export function boundaryFor(pref: string, date: string): Boundary | null {
  const candidates = (BOUNDARIES[pref] ?? []).filter((b) => b.from <= date);
  candidates.sort((a, b) => a.from.localeCompare(b.from));
  return candidates.at(-1) ?? null;
}
