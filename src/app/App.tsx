import { Suspense } from "react";
import { EraView } from "./views/EraView.tsx";
import { MunicipalView } from "./views/MunicipalView.tsx";
import { TrendView, type TrendSort } from "./views/TrendView.tsx";
import { useUrlState } from "./hooks/useUrlState.ts";
import { Credit, TopBar } from "./components/Brand.tsx";
import type { Metric } from "./data/municipal.ts";

const VIEWS = [
  { id: "era", label: "時代", hint: "1972–2026" },
  { id: "municipal", label: "市町村", hint: "41市町村" },
  { id: "trend", label: "推移", hint: "2002–2026" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

/** 最新の回。URL に回がないときの既定値。 */
const LATEST = "15";

export function App() {
  const [view, setView] = useUrlState<ViewId>("view", "era", (v) => VIEWS.some((x) => x.id === v));
  const [n, setN] = useUrlState<string>("n", LATEST, (v) => /^\d{1,2}$/.test(v));
  const [metric, setMetric] = useUrlState<Metric>("metric", "margin", (v) => v === "margin" || v === "turnout");
  const [muni, setMuni] = useUrlState<string>("muni", "47201", (v) => /^47\d{3}$/.test(v));
  const [sort, setSort] = useUrlState<TrendSort>("sort", "region", (v) => v === "region" || v === "latest");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/85 backdrop-blur-sm">
        <TopBar />
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
          <div className="pb-2">
            <h1 className="text-[15px] font-semibold tracking-tight">沖縄県知事選挙で、誰がどれだけ票を得てきたか</h1>
            <p className="text-[11px] text-muted">沖縄県選挙管理委員会「選挙管理委員会年報」「選挙結果調」ほか</p>
          </div>
          <nav className="-mb-px flex gap-1" aria-label="ビュー">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? "page" : undefined}
                className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] whitespace-nowrap transition-colors duration-150 ${
                  view === v.id ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {v.label}
                <span className="ml-1.5 text-[10px] font-normal text-faint max-sm:hidden">{v.hint}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <Suspense fallback={<Loading />}>
        {view === "era" && (
          <EraView n={Number(n)} onSelect={(v) => setN(String(v))} onOpenMunicipal={() => setView("municipal")} />
        )}
        {view === "municipal" && (
          <MunicipalView
            n={Number(n)}
            onSelectElection={(v) => setN(String(v))}
            metric={metric}
            onMetric={setMetric}
            selected={muni}
            onSelectMunicipality={setMuni}
          />
        )}
        {view === "trend" && (
          <TrendView
            metric={metric}
            onMetric={setMetric}
            sort={sort}
            onSort={setSort}
            onOpen={(v, code) => {
              setN(String(v));
              if (code !== null) setMuni(code);
              setView("municipal");
            }}
          />
        )}
      </Suspense>

      <footer className="mx-auto w-full max-w-[1240px] px-6 pt-2 pb-10 text-[11px] leading-relaxed text-faint">
        <p>
          出典: 沖縄県選挙管理委員会「令和7年版選挙管理委員会年報」（第1〜14回の県全体）、同「投票結果・開票結果に関する調」「開票速報（確定）」（2002〜2014年の市町村別。県の旧サイトの資料を Internet Archive の保存版から取得）、
          「沖縄県知事選挙結果調」（2018年の市町村別）、「知事選開票確定」「知事選投票確定」（2022年・2026年の市町村別と2026年の県全体）。
          総務省「選挙結果調」と那覇市選挙管理委員会「知事選挙の記録」の数値と一致することを確認した。按分票を含むため得票数に小数がある回は、表示で丸めている。
        </p>
        <p className="mt-2">
          陣営の分類は編集上の判断で、自民党など保守政党の推薦・支持を受けた候補を「保守系」、革新共闘会議や革新政党、2014年以降のオール沖縄の推薦・支持を受けた候補を「革新系」とした。
          候補者ごとの根拠と出典は「時代」の詳細欄にある。
        </p>
        <Credit />
      </footer>
    </div>
  );
}

function Loading() {
  return <div className="mx-auto w-full max-w-[1240px] px-6 py-16 text-[12px] text-faint">読み込み中</div>;
}
