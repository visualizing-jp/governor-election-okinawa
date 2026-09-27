/**
 * 市町村を名前で選ぶドロップダウン。開票表の区分（市部・国頭郡など）ごとにまとめる。
 * ブラウザ標準の select にして、キーボードと読み上げでもそのまま操作できるようにする。
 */

import type { Municipality } from "../../lib/data/municipalities.ts";

export function MunicipalitySelect({
  municipalities,
  value,
  onChange,
}: {
  municipalities: readonly Municipality[];
  value: string;
  onChange: (code: string) => void;
}) {
  const districts = [...new Set(municipalities.map((m) => m.district))];

  return (
    <label className="inline-flex items-center gap-2 text-[11px] text-muted">
      市町村
      <select
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className="cursor-pointer rounded-md border border-rule bg-surface py-1 pr-7 pl-2 text-[12px] text-ink transition-colors duration-150 hover:border-rule-strong"
      >
        {districts.map((d) => (
          <optgroup key={d} label={d}>
            {municipalities
              .filter((m) => m.district === d)
              .map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
