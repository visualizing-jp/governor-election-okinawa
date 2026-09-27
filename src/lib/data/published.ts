/**
 * 配信用 JSON（public/data/{pref}/）の形。build.ts が書き、アプリが読む。
 */

import type { CampId, MaleFemale, Status } from "./types.ts";

export interface PublishedCandidate {
  id: string;
  name: string;
  label?: string;
  age: number | null;
  status: Status;
  occupation: string | null;
  party: string;
  votes: number;
  elected: boolean;
  camp: CampId;
  campBasis: string;
  campSource: string;
}

export interface PublishedElection {
  n: number;
  date: string;
  notice: string;
  reason: string;
  electors: MaleFemale;
  voters: MaleFemale;
  candidates: PublishedCandidate[];
  /** 市町村別の結果があるか。 */
  municipal: boolean;
  /** 描く地図の版。市町村別の結果があっても、その日の境界がまだ用意できていなければ null。 */
  boundary: string | null;
}

export interface ElectionsJson {
  pref: string;
  prefName: string;
  camps: Record<CampId, string>;
  campNote: string;
  elections: PublishedElection[];
  sources: { id: string; title: string; url: string }[];
}

export interface PublishedMunicipality {
  code: string;
  name: string;
  votes: Record<string, number>;
  valid: number;
  invalid: number;
  electors: number;
  voters: number;
}

export interface MunicipalitiesJson {
  /** 現行の市町村（推移を描く単位）。 */
  current: { code: string; name: string }[];
  /** 旧コード → 現行コード。 */
  toCurrent: Record<string, string>;
  /** 第n回 → 市町村の結果。 */
  elections: Record<string, PublishedMunicipality[]>;
  /** 地図の版 → 地物のコードと名前の属性名。 */
  boundaries: Record<string, { label: string; codeKey: string; nameKey: string }>;
}
