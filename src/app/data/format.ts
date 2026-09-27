const INT = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });

/** 按分票の小数は表示では丸める。 */
export const votes = (v: number) => INT.format(Math.round(v));

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

/** 差はポイントで示し、符号を必ず付ける。 */
export const points = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}pt`;

export function dateJa(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export const year = (iso: string) => iso.slice(0, 4);
