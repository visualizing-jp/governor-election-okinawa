# 沖縄県知事選挙で、誰がどれだけ票を得てきたか

沖縄県選挙管理委員会の年報・結果調をもとに、1972年の本土復帰以降の沖縄県知事選挙（全15回）の得票と投票率を、県全体と市町村別で探索する。

visualizing.jp スタンドアロン。

想定URL: https://gubernatorial-election.visualizing.jp

## ビュー

| ビュー | 内容 |
| --- | --- |
| 時代 | 県全体の陣営別得票率と投票率の推移（1972–2026） |
| 市町村 | 市町村別の陣営の得票率の差（地図）と、選んだ市町村の推移。2002〜2026 年の7回（2002 年は旧境界の地図が届くまで一覧と推移のみ） |

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。

## 開発

```bash
npm install
npm run fetch && npm run normalize && npm run verify && npm run data
npm run dev
```

| スクリプト | 内容 |
| --- | --- |
| `npm run fetch` | 選挙管理委員会・総務省の資料を `data/raw/` に取得 |
| `npm run normalize` | 手起こしの正本と原本から回ごとの正規化 JSON を `data/normalized/` に書き出す（PDF には poppler の `pdftotext` が要る） |
| `npm run verify` | 合計・内訳・総務省・那覇市の記録との突合 |
| `npm run data` | 配信用 JSON を `public/data/` に書き出す |
| `npm run dev` | Vite 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

`data/manual/`、`data/lineage/`、`data/geo/`、`data/normalized/`、`public/data/` は追跡する。`data/raw/` は追跡しない。

## GitHub Pages / DNS

- `.github/workflows/pages.yml` で Pages にデプロイする。
- カスタムドメイン `gubernatorial-election.visualizing.jp` は `public/CNAME` に置いた。Pages 設定と visualizing.jp 側 DNS で登録する。
- Google Analytics の測定ID（`src/app/analytics.ts`）は空。入れるまで計測しない。
