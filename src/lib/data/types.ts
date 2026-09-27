/**
 * パイプラインとアプリが共有するデータの形。
 */

export interface MaleFemale {
  male: number;
  female: number;
  total: number;
}

export interface Turnout {
  electors: MaleFemale;
  voters: MaleFemale;
}

export type Status = "新" | "現" | "元";

export interface Candidate {
  /** 氏名から空白を除いたもの。回をまたいで同じ人を指す。 */
  id: string;
  name: string;
  /** 届出の通称。氏名と大きく違い、そちらで広く知られている場合だけ持つ。 */
  label?: string;
  age: number | null;
  status: Status;
  /** 届出時の職業。一次資料で確認できない回は null。 */
  occupation: string | null;
  party: string;
  votes: number;
  elected: boolean;
}

export interface MunicipalityResult {
  /** 選挙時点の市町村コード（5桁）。 */
  code: string;
  name: string;
  votes: Record<string, number>;
  valid: number;
  invalid: number;
  turnout: Turnout;
}

export interface NormalizedElection {
  pref: string;
  /** 第n回。 */
  n: number;
  date: string;
  notice: string;
  reason: string;
  turnout: Turnout;
  /** 得票の多い順。 */
  candidates: Candidate[];
  /** 市町村別の結果。入手できていない回は null。 */
  municipalities: {
    /** 描く地図の版（src/lib/data/boundaries.ts）。その日の境界がまだ用意できていなければ null。 */
    boundary: string | null;
    rows: MunicipalityResult[];
  } | null;
  /** 目録（src/lib/data/sources.ts）の id。 */
  sources: string[];
}

export type CampId = "conservative" | "progressive" | "other";

export interface CampAssignment {
  camp: CampId;
  /** 分類の根拠（推薦・支持政党など）。 */
  basis: string;
  source: string;
}
