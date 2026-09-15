/**
 * districts-geo.ts — REAL, simplified administrative boundaries of Tashkent's
 * 12 districts (tumans), reprojected onto a flat 0–100-ish drawing plane.
 *
 * Source: `akbartus/GeoJSON-Uzbekistan`, `geojson/tashkent_districts.geojson`
 * (branch `main`) — a `FeatureCollection` of all 12 Tashkent-city tumans as
 * `GeometryCollection → MultiPolygon`. Every tuman is drawn, Shayxontohur
 * included (it sits fully inside the other 11's combined footprint — the
 * office at ул. Абая, 6А falls inside it). Each district's largest ring was:
 *
 *   1. reprojected from lon/lat to a local planar `x,y` with a single shared
 *      projection computed once across all 12 districts combined (so
 *      relative shapes/adjacency stay correct):
 *        x = (lon - lonMin) * cos(latMean * PI / 180)
 *        y = (latMax - lat)                              (north stays up)
 *   2. uniformly scaled + translated (preserving aspect ratio — x/y share one
 *      scale factor) so the combined bounding box sits inside the drawing
 *      plane with a ~4-unit margin on every side;
 *   3. simplified with a hand-rolled Douglas-Peucker pass (tolerance tuned
 *      per district) down to ~20–60 points — enough to read as a real,
 *      slightly organic coastline-like shape without shipping hundreds of
 *      GeoJSON vertices into an inline SVG.
 *
 * Adding Shayxontohur left the combined bounding box, scale, translate and
 * `GEO_VIEWBOX` byte-for-byte unchanged from the original 11-district build —
 * it's an interior district, entirely enclosed by its neighbours' extent, so
 * every other district's coordinates below are untouched. Only Shayxontohur's
 * own ring is new.
 *
 * Neighbouring districts were simplified independently (not as a shared
 * planar subdivision), so shared borders can show a hairline gap/overlap of
 * a fraction of a unit where two tolerances disagree — invisible at the
 * hairline stroke widths this map uses. This is genuine simplified geometry,
 * not a schematic: districts keep their real footprint, size and adjacency.
 *
 *   yunusabad     — north band, wide
 *   almazar       — north-west
 *   uchtepa       — west
 *   chilanzar     — south-west, large
 *   mirabad       — centre
 *   yakkasaray    — centre-south, small
 *   shayxontohur  — centre-west, interior (historic Old City / Chorsu)
 *   mirzo-ulugbek — east, large, reaches far east
 *   yashnabad     — south-east, reaches far east
 *   yangihayot    — south
 *   sergeli       — south, next to Yangihayot
 *   bektemir      — far south-east
 *
 * No loaders, no runtime deps — the coordinate arrays below are the final,
 * static output of that one-time processing. Consumed by the inline SVG map
 * in `DistrictsMap.astro`.
 *
 * Coordinate space: x → west (0) … east; y → north (0) … south (matches SVG's
 * y-down). The view box adds a small margin around the drawn extent.
 */

export interface DistrictPoly {
  id: string;
  /** simplified real-boundary vertices in the drawing plane (y-down). */
  points: ReadonlyArray<readonly [number, number]>;
  /** optional label anchor override when the area centroid reads poorly. */
  labelAt?: readonly [number, number];
}

/** Shared shape of the per-district data the SVG map consumes. */
export interface DistrictDatum {
  id: string;
  title: string;
  order: number;
  metro: string;
  rentFrom: string;
  /** parsed integer of `rentFrom` ($350 → 350). */
  rentNum: number;
  excerpt: string;
  /** absolute permalink to the district guide. */
  href: string;
}

/** viewBox: drawn extent (incl. baked-in ~4-unit margin) is x[0..120] y[0..106.68]. */
export const GEO_VIEWBOX = { x: 0, y: 0, w: 120, h: 106.68 } as const;

/** Implied ring road — a soft ellipse drawn under the districts. */
export const GEO_RING = { cx: 60, cy: 53, rx: 58, ry: 52 } as const;

/**
 * ул. Абая, 6А — real-world geocode anchored on the Alisher Navoiy metro
 * station (41.321125°N, 69.254714°E), reprojected with the same shared
 * formula above and verified with a point-in-polygon test: it falls
 * genuinely inside Shayxontohur's own polygon, right by the Мирабад seam —
 * no nudge needed now that Shayxontohur is drawn.
 */
export const OFFICE_POINT = [45.93, 36.52] as const;

export const DISTRICTS_GEO: ReadonlyArray<DistrictPoly> = [
  {
    id: 'almazar', // north-west
    points: [
      [17.66, 25.09],
      [18.18, 22.83],
      [20.6, 19.55],
      [31.98, 10.14],
      [32.38, 8.89],
      [33.64, 8.72],
      [37.5, 5.49],
      [41.65, 12.63],
      [48.06, 18.89],
      [50.63, 22.03],
      [48.02, 25.27],
      [48.97, 26.05],
      [47.72, 28.42],
      [42.93, 34.55],
      [41.71, 34.64],
      [40.98, 33.32],
      [39.98, 33.09],
      [38.72, 34.82],
      [30.29, 28.45],
      [30.89, 26.42],
      [27.97, 25.16],
      [24.69, 24.35],
    ],
  },
  {
    id: 'yunusabad', // north band, wide
    points: [
      [37.5, 5.49],
      [41.65, 12.63],
      [50.63, 22.03],
      [48.02, 25.27],
      [48.97, 26.05],
      [48.54, 26.88],
      [52.3, 29.71],
      [48.98, 39.58],
      [47.59, 40.73],
      [49.99, 41.46],
      [50.92, 40.19],
      [54.17, 41.21],
      [54.12, 39.06],
      [57.55, 37.72],
      [57.61, 35.88],
      [59.52, 34.43],
      [59.07, 33.05],
      [60.73, 32.09],
      [61.01, 30.2],
      [63.65, 29.86],
      [64.38, 32],
      [65.09, 31.65],
      [65.15, 29.21],
      [68.33, 23.89],
      [70.79, 24.04],
      [74.06, 21.87],
      [67.96, 15.95],
      [65.56, 9.98],
      [55.51, 10.22],
      [46.88, 4.32],
      [39.99, 4.07],
    ],
  },
  {
    id: 'mirzo-ulugbek', // east, large — reaches far east
    points: [
      [54.05, 40.19],
      [59.69, 42.25],
      [60.75, 40.11],
      [62.62, 40.04],
      [63.67, 37.44],
      [69.29, 39.31],
      [73, 42.78],
      [83.98, 32.64],
      [85.81, 29.65],
      [90.94, 29.57],
      [94.8, 26.84],
      [95.14, 22.03],
      [93.19, 18.63],
      [88.9, 17.6],
      [80.31, 19.16],
      [77.38, 22.33],
      [73.85, 21.89],
      [70.79, 24.04],
      [68.33, 23.89],
      [65.15, 29.21],
      [65.4, 31.41],
      [64.38, 32],
      [63.65, 29.86],
      [61.01, 30.2],
      [60.73, 32.09],
      [59.07, 33.05],
      [59.52, 34.43],
      [57.61, 35.88],
      [57.55, 37.72],
      [55.81, 37.78],
    ],
  },
  {
    id: 'mirabad', // centre
    points: [
      [48.05, 59.12],
      [55.03, 57.35],
      [56.15, 57.86],
      [58.29, 60.06],
      [59.39, 60.27],
      [59.6, 60.91],
      [61.09, 61.32],
      [62.82, 60.25],
      [63.58, 61.85],
      [60.58, 63.35],
      [60.72, 68.79],
      [64.29, 68.94],
      [66.9, 71.46],
      [67.69, 71.49],
      [69.39, 70.14],
      [54.22, 41.26],
      [50.92, 40.19],
      [49.99, 41.46],
      [50.47, 41.61],
      [49.59, 44.45],
      [50.29, 47.28],
      [51.18, 48.48],
      [49.41, 50.67],
      [49.6, 51.4],
      [49.07, 51.94],
      [51.7, 54.67],
      [49.53, 57.85],
    ],
  },
  {
    id: 'shayxontohur', // centre-west, interior — historic Old City / Chorsu
    points: [
      [16.03, 33.55],
      [16.93, 31.4],
      [17.33, 29.89],
      [17.51, 25.98],
      [17.66, 25.09],
      [20.25, 25.1],
      [21.87, 24.68],
      [23.08, 24.65],
      [24.58, 24.36],
      [25.28, 24.4],
      [27.93, 25.15],
      [30.89, 26.42],
      [30.23, 28.27],
      [30.29, 28.45],
      [38.72, 34.82],
      [39.98, 33.09],
      [40.98, 33.32],
      [41.71, 34.64],
      [42.93, 34.55],
      [43.88, 33.23],
      [44.03, 33.34],
      [46.51, 29.84],
      [47.72, 28.42],
      [48.54, 26.88],
      [52.3, 29.71],
      [51.68, 31.31],
      [51.75, 31.92],
      [51.66, 32.75],
      [51.05, 33.24],
      [50.82, 33.86],
      [51.02, 34.29],
      [50.99, 34.54],
      [50.7, 34.95],
      [50.53, 35.72],
      [50.14, 36.22],
      [49.68, 37.74],
      [49.33, 38.28],
      [48.98, 39.58],
      [48.64, 40.21],
      [47.9, 40.26],
      [47.65, 40.46],
      [47.59, 40.73],
      [41.75, 40.37],
      [38.63, 45.55],
      [36.03, 44.43],
      [35.77, 44.45],
      [35.17, 44.82],
      [34.68, 44.97],
      [29.28, 45.14],
      [28.91, 45.12],
      [26.7, 44.18],
      [26.46, 34.94],
      [26.79, 34.26],
      [19.19, 33.56],
      [18.47, 33.6],
      [18.45, 32.55],
      [17.78, 32.22],
      [17.3, 32.34],
      [16.19, 33.62],
    ],
  },
  {
    id: 'uchtepa', // west
    points: [
      [4.15, 59.86],
      [4.34, 58.04],
      [5.13, 57.93],
      [6.23, 55.41],
      [7.1, 54.21],
      [7.7, 54.22],
      [8.17, 52.04],
      [7.28, 50.41],
      [9.22, 48.57],
      [9.28, 47.51],
      [12.45, 43.24],
      [12.63, 41.96],
      [11.84, 39.7],
      [12.37, 39.61],
      [14.27, 36.32],
      [14.04, 34.77],
      [14.51, 33.88],
      [16.19, 33.62],
      [17.78, 32.22],
      [18.45, 32.55],
      [18.47, 33.6],
      [26.79, 34.26],
      [26.46, 35.11],
      [26.95, 53.38],
      [28.02, 54.3],
      [26.68, 55.7],
      [21.52, 57.33],
      [19.93, 58.46],
      [19.6, 58.04],
      [18.54, 58.89],
      [17.39, 58.48],
      [15.54, 60.3],
      [12.57, 61.75],
      [11.99, 60.01],
      [12.15, 53.37],
      [11.83, 53.26],
      [10.09, 54.67],
      [9.73, 55.77],
      [7.08, 58.39],
      [4.45, 59.17],
    ],
  },
  {
    id: 'yakkasaray', // centre-south, small
    points: [
      [33.48, 64.98],
      [39.75, 61.23],
      [48.43, 58.93],
      [51.7, 54.67],
      [49.07, 51.94],
      [49.6, 51.4],
      [49.41, 50.67],
      [51.18, 48.48],
      [50.29, 47.28],
      [49.59, 44.45],
      [50.47, 41.61],
      [45.57, 43.23],
      [45.18, 44.43],
      [41.95, 46.47],
      [41.77, 47.47],
      [40.61, 48.78],
      [40.35, 50.72],
      [39.76, 51.21],
      [39.64, 53.14],
      [36.92, 55.55],
      [34.48, 60.17],
      [33.07, 63.99],
    ],
  },
  {
    id: 'chilanzar', // south-west, large
    points: [
      [12.57, 61.75],
      [17.17, 66.27],
      [18.3, 70.42],
      [17.78, 71.97],
      [20.36, 75.09],
      [19.82, 76.8],
      [20.63, 77.87],
      [24.92, 72.11],
      [33.52, 65.07],
      [33.07, 63.99],
      [34.48, 60.17],
      [36.92, 55.55],
      [39.64, 53.14],
      [40.61, 48.78],
      [47.59, 40.73],
      [41.75, 40.37],
      [38.63, 45.55],
      [36.03, 44.43],
      [29.28, 45.14],
      [26.7, 44.18],
      [26.95, 53.38],
      [28.02, 54.3],
      [27.41, 55.15],
      [19.93, 58.46],
      [17.39, 58.48],
    ],
  },
  {
    id: 'yashnabad', // south-east, reaches far east
    points: [
      [54.17, 41.21],
      [59.74, 42.24],
      [60.75, 40.11],
      [62.62, 40.04],
      [63.67, 37.44],
      [69.29, 39.31],
      [73, 42.78],
      [83.98, 32.64],
      [85.81, 29.65],
      [90.94, 29.57],
      [94.22, 27.67],
      [111.11, 26.24],
      [115.14, 24.77],
      [116, 25.69],
      [113.04, 30.7],
      [108.33, 34.5],
      [107.08, 36.65],
      [100.91, 41.08],
      [85.88, 57.67],
      [85.78, 58.94],
      [85.14, 59.06],
      [85.25, 56.26],
      [81.15, 59.25],
      [77.28, 66.28],
      [69.94, 71.35],
      [61.25, 50.86],
    ],
  },
  {
    id: 'yangihayot', // south
    points: [
      [20.63, 77.87],
      [27.09, 70.25],
      [35.02, 85.18],
      [42.87, 80.85],
      [43.82, 87.82],
      [45.81, 90.38],
      [52.68, 85.15],
      [62.53, 94.62],
      [54.27, 101.9],
      [50.37, 102.68],
      [39.59, 101.44],
      [29.38, 96.49],
      [24.39, 88.93],
      [24.22, 85.3],
      [23.13, 84.52],
      [24.03, 82.98],
      [22.86, 81.23],
      [23.58, 80.28],
      [22.57, 79.33],
      [21.24, 79.93],
    ],
  },
  {
    id: 'sergeli', // south, next to Yangihayot
    points: [
      [27.09, 70.25],
      [39.53, 61.32],
      [54.76, 57.34],
      [59.6, 60.91],
      [61.09, 61.32],
      [62.75, 60.23],
      [63.58, 61.67],
      [60.58, 63.35],
      [35.38, 69.08],
      [33.58, 70.51],
      [33.12, 72.01],
      [35.64, 77.37],
      [38.59, 72.5],
      [42.04, 72.56],
      [42.99, 80.7],
      [48.25, 77.95],
      [51.28, 81.46],
      [56.95, 78.67],
      [52.68, 85.15],
      [45.81, 90.38],
      [43.82, 87.82],
      [42.87, 80.85],
      [35.02, 85.18],
    ],
    // the area centroid falls just outside this crescent-shaped district —
    // nudged onto the nearest interior point instead.
    labelAt: [42.09, 73.24],
  },
  {
    id: 'bektemir', // far south-east
    points: [
      [52.68, 85.15],
      [56.07, 80.91],
      [56.95, 78.67],
      [59.73, 76.81],
      [59.48, 76.34],
      [62.73, 74.72],
      [62.82, 73.95],
      [64.07, 73.55],
      [65.68, 71.73],
      [67.69, 71.49],
      [69.39, 70.14],
      [69.94, 71.35],
      [70.28, 71.22],
      [72.33, 69.05],
      [76.21, 67.23],
      [77.89, 65.49],
      [81.48, 58.91],
      [83.76, 57.85],
      [85.25, 56.26],
      [85.14, 59.06],
      [85.92, 58.93],
      [86.24, 59.69],
      [87.28, 60],
      [90.94, 59.91],
      [90.43, 60.96],
      [87.27, 63.76],
      [86.97, 63.47],
      [86.18, 64.14],
      [89.22, 67.32],
      [89.5, 69.27],
      [77.09, 80.05],
      [62.53, 94.62],
      [56.53, 89.7],
    ],
  },
];

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** `points` → an SVG path `d` string (`M x,y L … Z`). */
export function polyPath(points: DistrictPoly['points']): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${r2(x)},${r2(y)}`).join(' ') + ' Z';
}

/** Area-weighted centroid of a simple polygon. */
export function polyCentroid(points: DistrictPoly['points']): [number, number] {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) {
    const n = points.length;
    return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
  }
  return [r2(cx / (6 * a)), r2(cy / (6 * a))];
}

/** Label anchor: an explicit `labelAt` if given, else the area centroid. */
export function polyLabelPoint(poly: DistrictPoly): [number, number] {
  return poly.labelAt ? [poly.labelAt[0], poly.labelAt[1]] : polyCentroid(poly.points);
}

/** Axis-aligned bounds `{ minX, minY, maxX, maxY }`. */
export function polyBounds(points: DistrictPoly['points']): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}
