/**
 * 市町村の目録。
 *
 * CURRENT は平成の合併（2006年1月の南城市・八重瀬町）以降の41市町村。
 * 県選挙管理委員会の開票表の番号（1 那覇市 〜 41 与那国町）と同じ並びで、コードの昇順とも一致する。
 */

import type { LineageEntry } from "./lineage.ts";

export interface Municipality {
  code: string;
  name: string;
  /** 開票表の区分。 */
  district: string;
}

/**
 * その日に存在した市町村（コードの昇順）。
 * 現行の市町村のうちその日より後に発足したもの（後継）を除き、その日にまだ廃止されていない旧市町村を加える。
 */
export function municipalitiesAt(
  pref: string,
  date: string,
  lineage: readonly LineageEntry[],
): { code: string; name: string }[] {
  const later = new Set(lineage.filter((e) => e.until > date).map((e) => e.successor));
  const current = (CURRENT[pref] ?? []).filter((m) => !later.has(m.code));
  const old = lineage.filter((e) => e.until > date);
  return [...current, ...old]
    .map((m) => ({ code: m.code, name: m.name }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export const CURRENT: Record<string, Municipality[]> = {
  "47": [
    { code: "47201", name: "那覇市", district: "市部" },
    { code: "47205", name: "宜野湾市", district: "市部" },
    { code: "47207", name: "石垣市", district: "市部" },
    { code: "47208", name: "浦添市", district: "市部" },
    { code: "47209", name: "名護市", district: "市部" },
    { code: "47210", name: "糸満市", district: "市部" },
    { code: "47211", name: "沖縄市", district: "市部" },
    { code: "47212", name: "豊見城市", district: "市部" },
    { code: "47213", name: "うるま市", district: "市部" },
    { code: "47214", name: "宮古島市", district: "市部" },
    { code: "47215", name: "南城市", district: "市部" },
    { code: "47301", name: "国頭村", district: "国頭郡" },
    { code: "47302", name: "大宜味村", district: "国頭郡" },
    { code: "47303", name: "東村", district: "国頭郡" },
    { code: "47306", name: "今帰仁村", district: "国頭郡" },
    { code: "47308", name: "本部町", district: "国頭郡" },
    { code: "47311", name: "恩納村", district: "国頭郡" },
    { code: "47313", name: "宜野座村", district: "国頭郡" },
    { code: "47314", name: "金武町", district: "国頭郡" },
    { code: "47315", name: "伊江村", district: "国頭郡" },
    { code: "47324", name: "読谷村", district: "中頭郡" },
    { code: "47325", name: "嘉手納町", district: "中頭郡" },
    { code: "47326", name: "北谷町", district: "中頭郡" },
    { code: "47327", name: "北中城村", district: "中頭郡" },
    { code: "47328", name: "中城村", district: "中頭郡" },
    { code: "47329", name: "西原町", district: "中頭郡" },
    { code: "47348", name: "与那原町", district: "島尻郡" },
    { code: "47350", name: "南風原町", district: "島尻郡" },
    { code: "47353", name: "渡嘉敷村", district: "島尻郡" },
    { code: "47354", name: "座間味村", district: "島尻郡" },
    { code: "47355", name: "粟国村", district: "島尻郡" },
    { code: "47356", name: "渡名喜村", district: "島尻郡" },
    { code: "47357", name: "南大東村", district: "島尻郡" },
    { code: "47358", name: "北大東村", district: "島尻郡" },
    { code: "47359", name: "伊平屋村", district: "島尻郡" },
    { code: "47360", name: "伊是名村", district: "島尻郡" },
    { code: "47361", name: "久米島町", district: "島尻郡" },
    { code: "47362", name: "八重瀬町", district: "島尻郡" },
    { code: "47375", name: "多良間村", district: "宮古郡" },
    { code: "47381", name: "竹富町", district: "八重山郡" },
    { code: "47382", name: "与那国町", district: "八重山郡" },
  ],
};
