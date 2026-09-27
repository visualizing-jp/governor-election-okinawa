/**
 * 市町村の塗り分け地図。本島周辺を上段に大きく、八重山・宮古・大東を下段に並べる。
 * 縮尺は本島の枠と下段の枠で違う。
 */

import { useMemo, useRef, useState, type ReactNode } from "react";
import { geoArea, geoCentroid, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { PANEL_LABEL, PANEL_WINDOW, panelOf, type Panel } from "../data/municipal.ts";

type Props = Record<string, unknown>;

/** 約 400 m²。これより小さい島は地図に描いても見えない。 */
const MIN_AREA = 1e-11;

/**
 * 簡略化で潰れた小島の輪（面積ほぼ 0）は、d3-geo の切り取りで「島以外の全球」として塗られる。
 * 向きを直しても精度の問題で残るので、見えない大きさの多角形は落とす。
 */
const visible = (rings: Position[][]) => {
  const a = geoArea({ type: "Polygon", coordinates: rings });
  return a > MIN_AREA && a < 2 * Math.PI;
};

function inside([[x0, y0], [x1, y1]]: [[number, number], [number, number]], rings: Position[][]): boolean {
  const [x, y] = geoCentroid({ type: "Polygon", coordinates: rings });
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/** 見えない多角形と、枠の範囲外の島を落とす。 */
function clean<F extends Feature<Geometry, Props>>(f: F, panel: Panel): F {
  const g = f.geometry;
  const keep = (rings: Position[][]) => visible(rings) && inside(PANEL_WINDOW[panel], rings);
  if (g.type === "MultiPolygon") return { ...f, geometry: { ...g, coordinates: g.coordinates.filter(keep) } };
  return f;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function panels(width: number): { boxes: Record<Panel, Box>; height: number } {
  const gap = 10;
  const mainH = Math.round(width * 0.62);
  const rowH = Math.round(width * 0.3);
  const y = mainH + gap;
  const w1 = width * 0.42;
  const w2 = width * 0.33;
  return {
    boxes: {
      main: { x: 0, y: 0, w: width, h: mainH },
      yaeyama: { x: 0, y, w: w1 - gap / 2, h: rowH },
      miyako: { x: w1 + gap / 2, y, w: w2 - gap, h: rowH },
      daito: { x: w1 + w2 + gap / 2, y, w: width - w1 - w2 - gap / 2, h: rowH },
    },
    height: y + rowH,
  };
}

export function MuniMap({
  topo,
  codeKey,
  codes,
  currentOf,
  fill,
  hovered,
  selected,
  onHover,
  onSelect,
  tooltip,
  width,
}: {
  topo: Topology;
  codeKey: string;
  /** 結果のある市町村コード（その回の市町村）。 */
  codes: ReadonlySet<string>;
  currentOf: (code: string) => string;
  fill: (code: string) => string;
  hovered: string | null;
  /** 現行の市町村コード。 */
  selected: string;
  onHover: (code: string | null) => void;
  onSelect: (currentCode: string) => void;
  tooltip: (code: string) => ReactNode;
  width: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const shapes = useMemo(() => {
    const object = Object.values(topo.objects)[0] as GeometryCollection<Props>;
    const fc = feature(topo, object) as FeatureCollection<Geometry, Props>;
    const features = fc.features.filter((f) => codes.has(String(f.properties?.[codeKey])));
    const { boxes, height } = panels(width);
    const pad = 14;

    const groups = (Object.keys(boxes) as Panel[]).flatMap((panel) => {
      const members = features
        .filter((f) => panelOf(currentOf(String(f.properties?.[codeKey]))) === panel)
        .map((f) => clean(f, panel));
      if (members.length === 0) return [];
      const b = boxes[panel];
      const extent: [[number, number], [number, number]] = [
        [b.x + pad, b.y + pad + 12],
        [b.x + b.w - pad, b.y + b.h - pad],
      ];
      const fc = { type: "FeatureCollection", features: members } as FeatureCollection;
      return [{ panel, members, extent, fc, projection: geoMercator().fitExtent(extent, fc) }];
    });

    // 下段の島嶼は同じ縮尺にそろえ、島の大きさを比べられるようにする。
    const insetScale = Math.min(...groups.filter((g) => g.panel !== "main").map((g) => g.projection.scale()));
    for (const g of groups) {
      if (g.panel === "main") continue;
      g.projection.scale(insetScale);
      const [[x0, y0], [x1, y1]] = geoPath(g.projection).bounds(g.fc);
      const [[ex0, ey0], [ex1, ey1]] = g.extent;
      const [tx, ty] = g.projection.translate();
      g.projection.translate([tx + (ex0 + ex1 - x0 - x1) / 2, ty + (ey0 + ey1 - y0 - y1) / 2]);
    }

    const out = groups.flatMap(({ panel, members, projection }) => {
      const path = geoPath(projection);
      return (members as Feature<Geometry, Props>[]).map((f) => ({
        code: String(f.properties?.[codeKey]),
        d: path(f) ?? "",
        panel,
      }));
    });
    return { out, boxes, height };
  }, [topo, codeKey, codes, currentOf, width]);

  if (width === 0) return null;
  const { out, boxes, height } = shapes;

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setPointer(null)}>
      <svg width={width} height={height} role="img" aria-label="市町村別の地図" className="block">
        {(Object.keys(boxes) as Panel[]).map((p) => {
          const b = boxes[p];
          return (
            <g key={p}>
              <rect x={b.x + 0.5} y={b.y + 0.5} width={b.w - 1} height={b.h - 1} rx={4} className="fill-none stroke-rule" />
              <text x={b.x + 10} y={b.y + 18} className="fill-faint text-[10px]">
                {PANEL_LABEL[p]}
              </text>
            </g>
          );
        })}
        {out.map((s) => (
          <path
            key={s.code}
            d={s.d}
            fill={fill(s.code)}
            className="cursor-pointer stroke-surface transition-[fill] duration-200 ease-[var(--ease-out)]"
            strokeWidth={0.6}
            onPointerMove={(ev) => {
              const r = ref.current?.getBoundingClientRect();
              if (r !== undefined) setPointer({ x: ev.clientX - r.left, y: ev.clientY - r.top });
              if (hovered !== s.code) onHover(s.code);
            }}
            onPointerLeave={() => onHover(null)}
            onClick={() => onSelect(currentOf(s.code))}
          />
        ))}
        {/* 選択と焦点の輪郭は塗りの上に重ねる。細い島でも線が隣に潰されない。 */}
        {out
          .filter((s) => currentOf(s.code) === selected || s.code === hovered)
          .map((s) => (
            <path
              key={`outline-${s.code}`}
              d={s.d}
              fill="none"
              className="pointer-events-none stroke-ink"
              strokeWidth={currentOf(s.code) === selected ? 1.6 : 1}
            />
          ))}
      </svg>
      {hovered !== null && pointer !== null && (
        <div
          className="pointer-events-none absolute z-10 w-56 rounded-md border border-rule bg-surface/95 p-3 text-[11px] shadow-[0_4px_16px_rgba(22,20,15,0.12)] backdrop-blur-sm"
          style={{
            left: Math.min(pointer.x + 14, width - 232),
            top: pointer.y + 14,
          }}
        >
          {tooltip(hovered)}
        </div>
      )}
    </div>
  );
}
