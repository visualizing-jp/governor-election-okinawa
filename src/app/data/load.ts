/**
 * 配信データの取得。同じファイルは一度しか取りに行かない。
 * 返す Promise は React の `use()` に渡すので、同じ引数には同じ Promise を返す。
 */

import type { Topology } from "topojson-specification";
import type { ElectionsJson, MunicipalitiesJson } from "../../lib/data/published.ts";

export const PREF = "47";

const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit !== undefined) return hit as Promise<T>;
  const promise = fetch(`${import.meta.env.BASE_URL}data/${PREF}/${path}`).then((r) => {
    if (!r.ok) throw new Error(`${path} の取得に失敗しました (${r.status})`);
    return r.json() as Promise<T>;
  });
  cache.set(path, promise);
  return promise;
}

export const loadElections = () => load<ElectionsJson>("elections.json");
export const loadMunicipalities = () => load<MunicipalitiesJson>("municipalities.json");
export const loadBoundary = (id: string) => load<Topology>(`geo/${id}.json`);
