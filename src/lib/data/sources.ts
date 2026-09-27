/**
 * 取得元の目録。`npm run fetch` はここにあるファイルを data/raw/{pref}/{id}.{format} に落とす。
 */

export type Format = "pdf" | "xls" | "xlsx" | "html";

export interface Source {
  id: string;
  url: string;
  format: Format;
  title: string;
}

const OKINAWA = "https://www.pref.okinawa.lg.jp/_res/projects/default_project/_page_";

/** 県の旧サイト（2020年ごろまで）の資料。Internet Archive の保存版から取る。 */
const ARCHIVED = (timestamp: string, file: string) =>
  `https://web.archive.org/web/${timestamp}id_/http://www.pref.okinawa.jp/site/senkan_i/event/tijisen/documents/${file}`;

export const SOURCES: Record<string, Source[]> = {
  "47": [
    {
      id: "nenpou-r7",
      url: `${OKINAWA}/001/004/927/r7_nenpou.pdf`,
      format: "pdf",
      title: "沖縄県選挙管理委員会「令和7年版選挙管理委員会年報」",
    },
    {
      id: "2002-kaihyo",
      url: ARCHIVED("20121106124533", "h14kenntiji%20kaihyou_1.xls"),
      format: "xls",
      title: "沖縄県選挙管理委員会「沖縄県知事選挙 開票結果（平成14年11月17日執行）」（Internet Archive 保存版）",
    },
    {
      id: "2002-touhyo",
      url: ARCHIVED("20121106124447", "h14kenntiji%20touhyou_1.xls"),
      format: "xls",
      title: "沖縄県選挙管理委員会「沖縄県知事選挙 投票結果（平成14年11月17日執行）」（Internet Archive 保存版）",
    },
    {
      id: "2006-kekka",
      url: ARCHIVED("20141202175950", "h181119tijitoukaihyou.pdf"),
      format: "pdf",
      title: "沖縄県選挙管理委員会「平成18年11月19日執行沖縄県知事選挙（投票結果・開票結果に関する調）」（Internet Archive 保存版）",
    },
    {
      id: "2010-kekka",
      url: ARCHIVED("20141202212119", "h221128tijitoukaihyou.pdf"),
      format: "pdf",
      title: "沖縄県選挙管理委員会「平成22年11月28日執行沖縄県知事選挙（投票結果・開票結果に関する調）」（Internet Archive 保存版）",
    },
    {
      id: "2014-kaihyo",
      url: ARCHIVED("20141202215933", "tikaisaisyuu.xls"),
      format: "xls",
      title: "沖縄県選挙管理委員会「平成26年沖縄県知事選挙 開票速報（最終・確定）」（Internet Archive 保存版）",
    },
    {
      id: "2014-touhyo",
      url: ARCHIVED("20141202173145", "titousaisyuu2400.xls"),
      format: "xls",
      title: "沖縄県選挙管理委員会「平成26年沖縄県知事選挙 投票速報（最終・確定）」（Internet Archive 保存版）",
    },
    {
      id: "2018-kekka",
      url: `${OKINAWA}/001/004/927/2_tijisenn.pdf`,
      format: "pdf",
      title: "沖縄県選挙管理委員会「沖縄県知事選挙結果調（平成30年9月30日執行）」",
    },
    {
      id: "2022-kaihyo",
      url: `${OKINAWA}/001/025/046/r4chiji-kaihyokakutei.xls`,
      format: "xls",
      title: "沖縄県選挙管理委員会「令和4年沖縄県知事選挙 知事選開票確定」",
    },
    {
      id: "2022-touhyo",
      url: `${OKINAWA}/001/025/046/touhyoukakutei-shuusei2446.xlsx`,
      format: "xlsx",
      title: "沖縄県選挙管理委員会「令和4年沖縄県知事選挙 知事選投票確定（24時46分修正）」",
    },
    {
      id: "2026-kaihyo",
      url: `${OKINAWA}/001/040/303/chijisenkaihyou_teisei.pdf`,
      format: "pdf",
      title: "沖縄県選挙管理委員会「令和8年沖縄県知事選挙 開票確定（知事選）」（9月16日訂正）",
    },
    {
      id: "2026-touhyo",
      url: `${OKINAWA}/001/040/303/chijisentouhyo1930_teisei.pdf`,
      format: "pdf",
      title: "沖縄県選挙管理委員会「令和8年沖縄県知事選挙 投票確定（知事選）」（9月16日訂正）",
    },
    {
      id: "2026-kouhosha",
      url: `${OKINAWA}/001/040/303/r8chiji_kohoshaichiran.pdf`,
      format: "pdf",
      title: "沖縄県選挙管理委員会「令和8年沖縄県知事選挙 候補者情報」",
    },
    {
      id: "wikipedia-2026",
      url: "https://ja.wikipedia.org/wiki/2026%E5%B9%B4%E6%B2%96%E7%B8%84%E7%9C%8C%E7%9F%A5%E4%BA%8B%E9%81%B8%E6%8C%99",
      format: "html",
      title: "Wikipedia「2026年沖縄県知事選挙」（候補者の年齢）",
    },
    {
      id: "soumu-2010",
      url: "https://www.soumu.go.jp/main_content/000091023.pdf",
      format: "pdf",
      title: "総務省「沖縄県知事選挙 選挙結果調（平成22年11月28日執行）」",
    },
    {
      id: "soumu-2014",
      url: "https://www.soumu.go.jp/main_content/000329124.pdf",
      format: "pdf",
      title: "総務省「沖縄県知事選挙 選挙結果調（平成26年11月16日執行）」",
    },
    {
      id: "soumu-2018",
      url: "https://www.soumu.go.jp/main_content/000581496.pdf",
      format: "pdf",
      title: "総務省「沖縄県知事選挙 選挙結果調（平成30年9月30日執行）」",
    },
    {
      id: "soumu-2022",
      url: "https://www.soumu.go.jp/main_content/000842842.pdf",
      format: "pdf",
      title: "総務省「沖縄県知事選挙 選挙結果調（令和4年9月11日執行）」",
    },
    {
      id: "naha",
      url: "https://www.city.naha.okinawa.jp/_res/projects/default_project/_page_/001/004/628/kentijikiroku_221115.xls",
      format: "xls",
      title: "那覇市選挙管理委員会「知事選挙の記録 過去の記録一覧」",
    },
  ],
};
