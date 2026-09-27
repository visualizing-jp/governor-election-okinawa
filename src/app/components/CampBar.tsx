/**
 * 陣営の割合を1本の横棒で示す。保守系を左、革新系を右に置き、柱の積み方と向きを揃える。
 */

import type { CampId } from "../../lib/data/types.ts";
import { CAMP_COLOR, CAMP_ORDER, type CampShares } from "../data/camps.ts";

export function CampBar({ shares, height = 8 }: { shares: CampShares; height?: number }) {
  return (
    <div className="flex w-full overflow-hidden rounded-[2px] bg-rule" style={{ height }}>
      {CAMP_ORDER.map((camp: CampId) => (
        <div
          key={camp}
          style={{ width: `${shares[camp] * 100}%`, backgroundColor: CAMP_COLOR[camp] }}
          className="h-full"
        />
      ))}
    </div>
  );
}

export function CampSwatch({ camp }: { camp: CampId }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2.5 shrink-0 rounded-[2px]"
      style={{ backgroundColor: CAMP_COLOR[camp] }}
    />
  );
}

export function CampLegend({ labels }: { labels: Record<CampId, string> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
      {(["conservative", "progressive", "other"] as const).map((camp) => (
        <li key={camp} className="inline-flex items-center gap-1.5">
          <CampSwatch camp={camp} />
          {labels[camp]}
        </li>
      ))}
    </ul>
  );
}
