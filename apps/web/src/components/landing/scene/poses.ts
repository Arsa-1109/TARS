export type Pose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  s: number;
  spread: number;
  stagger: number;
  fan: number;
  emblem: number;
  glow: number;
  ring: number;
  pulse: number;
};

const BASE: Pose = {
  x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1,
  spread: 0, stagger: 0, fan: 0, emblem: 0, glow: 1, ring: 0, pulse: 0,
};

export const POSE_KEYS = Object.keys(BASE) as (keyof Pose)[];

const P = (p: Partial<Pose>): Pose => ({ ...BASE, ...p });

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Fraction of each chapter spent standing still before TARS walks to the next pose
export const HOLD = [0.5, 0.58, 0.9, 0.58, 0.58, 0.62, 1];

const TAU = Math.PI * 2;

// x / y are fractions of the half-viewport so poses adapt to any screen
export function poseAt(i: number, l: number): Pose {
  switch (i) {
    case 0:
      return P({ x: 0.44, y: -0.02, rx: 0.06, ry: -0.55 });
    case 1:
      return P({ x: -0.5, z: -0.6, rx: 0.12, ry: 0.75, rz: 0.04, s: 0.94, spread: 0.35, stagger: 1, glow: 0.35 });
    case 2: {
      const u = smoothstep(0.06, 0.86, l);
      return P({ x: -0.48, rx: 0.05, ry: -0.4 + u * Math.PI * 1.25, fan: 0.1 + 0.4 * u, spread: 0.1 + 0.08 * u, glow: 0.8 + 0.4 * u });
    }
    case 3:
      return P({ x: 0.5, z: 0.4, ry: TAU - 0.25, s: 1.04, ring: 1, glow: 1.25 });
    case 4:
      return P({ x: -0.44, y: -0.14, rx: 0.4, ry: TAU + 0.55, rz: -1.3, fan: 0.06, pulse: 1 });
    case 5:
      return P({ x: 0, y: 0.3, z: -7, ry: TAU + 0.3, s: 0.85, emblem: 0.6, glow: 0.6 });
    default:
      return P({ x: 0, y: 0.34, z: -2.4, rx: 0.04, ry: TAU, s: 0.9, emblem: 1, glow: 1.4 });
  }
}
