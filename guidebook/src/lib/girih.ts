/* Star-and-cross (khatam) tiling, the 8-point girih of Samarkand tilework.
   Stars sit on a square lattice, crosses in the cell centres; together they tile the plane exactly.
   Shared by the server components (hero, bands, guide) and the client page-transition cover. */

const R = 0.5; // star tip radius, in lattice units: neighbouring tips meet
const r = (R * Math.SQRT1_2) / Math.cos(Math.PI / 8); // inner radius of the {8/2} star

/** 16 vertices of a star centred at (cx, cy), lattice spacing s. */
export function star(cx: number, cy: number, s: number): [number, number][] {
  return Array.from({ length: 16 }, (_, k) => {
    const a = (k * Math.PI) / 8;
    const d = (k % 2 ? r : R) * s;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  });
}

/** 16 vertices of the cross between four stars, centred at (cx, cy). */
export function cross(cx: number, cy: number, s: number): [number, number][] {
  // One quadrant, walking the edge of the star at the cross's upper-left corner:
  // tip junction, inner vertex, diagonal tip, inner vertex.
  const a = 0.5 - R * Math.SQRT1_2;
  const near = 0.5 - r * Math.cos(Math.PI / 8);
  const far = 0.5 - r * Math.sin(Math.PI / 8);
  const q: [number, number][] = [
    [0, -0.5],
    [-near, -far],
    [-a, -a],
    [-far, -near],
  ];
  const pts: [number, number][] = [];
  for (let k = 0; k < 4; k++) {
    for (const [x, y] of q) {
      const [rx, ry] = k === 0 ? [x, y] : k === 1 ? [y, -x] : k === 2 ? [-x, -y] : [-y, x];
      pts.push([cx + rx * s, cy + ry * s]);
    }
  }
  return pts;
}

export function d(pts: [number, number][]): string {
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
}

export type Tile = { kind: 'star' | 'cross'; x: number; y: number; path: string };

/** Every star and cross whose centre falls inside the box, with a one-tile margin. */
export function tiling(width: number, height: number, s: number, ox = 0, oy = 0): Tile[] {
  const out: Tile[] = [];
  for (let j = -1; j <= Math.ceil(height / s) + 1; j++) {
    for (let i = -1; i <= Math.ceil(width / s) + 1; i++) {
      const x = ox + i * s;
      const y = oy + j * s;
      out.push({ kind: 'star', x, y, path: d(star(x, y, s)) });
      out.push({ kind: 'cross', x: x + s / 2, y: y + s / 2, path: d(cross(x + s / 2, y + s / 2, s)) });
    }
  }
  return out;
}
