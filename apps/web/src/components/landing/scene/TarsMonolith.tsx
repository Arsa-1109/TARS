import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { scrollState } from '../scrollState';
import { HOLD, POSE_KEYS, Pose, lerp, poseAt, smoothstep } from './poses';

const W = 0.42;
const H = 2.5;
const D = 0.56;
const GAP = 0.035;
const BASE_X = [-1.5, -0.5, 0.5, 1.5].map((k) => k * (W + GAP));
const FAN = [-1, -0.35, 0.35, 1];
const EMB_RZ = [-0.34, -0.06, 0.3, -0.14];
const EMB_Y = [0.12, -0.32, -0.08, 0.34];
const STG_Y = [0.3, -0.2, 0.12, -0.34];
const STG_RX = [0.12, -0.08, 0.1, -0.14];
const WHITE = new THREE.Color('#FFFFFF');
const SILVER = new THREE.Color('#CCCCCC');
const damp = THREE.MathUtils.damp;

export function TarsMonolith() {
  const rig = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const pivots = useRef<THREE.Group[]>([]);
  const blades = useRef<THREE.Mesh[]>([]);
  const ring = useRef<THREE.Group>(null!);
  const light = useRef<THREE.PointLight>(null!);
  const cur = useRef<Pose>({ ...poseAt(0, 0.5) });
  const walk = useRef({ phase: 0, amp: 0 });

  const slabMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#111111',
        metalness: 0.88,
        roughness: 0.35,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.1,
      }),
    []
  );
  const stripMats = useMemo(
    () => [0, 1, 2, 3].map(() => new THREE.MeshBasicMaterial({ color: WHITE.clone(), toneMapped: false })),
    []
  );
  const bladeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: WHITE.clone(), toneMapped: false, transparent: true }),
    []
  );
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: SILVER.clone().multiplyScalar(2.0), toneMapped: false, transparent: true, opacity: 0 }),
    []
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { chapter, local, velocity } = scrollState;
    const blend = smoothstep(HOLD[chapter] ?? 0.58, 1, local);
    const a = poseAt(chapter, local);
    const b = poseAt(Math.min(chapter + 1, 6), 0);
    const c = cur.current;
    for (const k of POSE_KEYS) c[k] = damp(c[k], lerp(a[k], b[k], blend), 2.4, dt);

    const w = walk.current;
    w.amp = damp(w.amp, chapter < 6 ? Math.sin(Math.PI * blend) : 0, 3, dt);
    w.phase += dt * (2.2 + Math.min(Math.abs(velocity), 40) * 0.1);

    const t = state.clock.elapsedTime;
    const vw = state.viewport.width;
    const vh = state.viewport.height;
    const mobile = vw < 6;

    rig.current.position.set(
      mobile ? 0 : c.x * vw * 0.5,
      c.y * vh * 0.5 + (mobile ? 0.9 : 0) + Math.sin(t * 0.6) * 0.06 + Math.abs(Math.sin(w.phase)) * 0.09 * w.amp,
      c.z - (mobile ? 2 : 0)
    );
    rig.current.scale.setScalar(c.s * (mobile ? 0.8 : 1));
    body.current.rotation.set(c.rx + Math.sin(t * 0.4) * 0.02, c.ry + Math.sin(t * 0.25) * 0.06, c.rz);

    const spreadK = 1 + c.spread * 1.6;
    pivots.current.forEach((p, i) => {
      const outer = i === 0 || i === 3;
      const swing = Math.sin(w.phase) * 0.42 * w.amp * (outer ? 1 : -1);
      p.position.set(BASE_X[i] * spreadK, H / 2 + STG_Y[i] * c.stagger + EMB_Y[i] * c.emblem, 0);
      p.rotation.set(swing + STG_RX[i] * c.stagger, 0, FAN[i] * c.fan + EMB_RZ[i] * c.emblem);
    });

    blades.current.forEach((m, i) => {
      m.position.x = (i - 1) * (W + GAP) * spreadK;
    });
    const pulse = c.pulse * (0.5 + 0.5 * Math.sin(t * 6));
    bladeMat.color.copy(WHITE).multiplyScalar(c.glow * (1.1 + pulse * 1.2));
    bladeMat.opacity = 0.35 + 0.65 * Math.min(1, c.glow);
    stripMats.forEach((m, i) => {
      const wave = Math.max(0, Math.sin(t * 5 - i * 1.3)) * c.pulse * 3;
      m.color.copy(WHITE).multiplyScalar(c.glow * 1.8 * (0.85 + 0.15 * Math.sin(t * 2 + i)) + wave);
    });
    light.current.intensity = 1.4 + c.glow * 2.8;

    ringMat.opacity = c.ring * 0.9;
    ring.current.rotation.y += dt * 0.25;
    ring.current.rotation.z = Math.sin(t * 0.3) * 0.15;
    ring.current.scale.setScalar(0.85 + c.ring * 0.15);
    ring.current.visible = c.ring > 0.01;
  });

  return (
    <group ref={rig}>
      <group ref={body}>
        {BASE_X.map((x, i) => (
          <group key={i} ref={(el) => { if (el) pivots.current[i] = el; }} position={[x, H / 2, 0]}>
            <RoundedBox args={[W, H, D]} radius={0.022} smoothness={3} position={[0, -H / 2, 0]} material={slabMat} />
            <mesh position={[0, -0.34, D / 2 + 0.003]} material={stripMats[i]}>
              <planeGeometry args={[W * (i === 1 || i === 2 ? 0.66 : 0.34), 0.04]} />
            </mesh>
            <mesh position={[0, -H + 0.16, D / 2 + 0.003]} material={stripMats[i]}>
              <planeGeometry args={[W * 0.12, 0.012]} />
            </mesh>
          </group>
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={i} ref={(el) => { if (el) blades.current[i] = el; }} material={bladeMat}>
            <boxGeometry args={[0.012, H * 0.9, D * 0.6]} />
          </mesh>
        ))}
        <pointLight ref={light} color="#FFFFFF" distance={6} decay={2} position={[0, 0.2, 0.9]} />
      </group>
      <group ref={ring}>
        <mesh rotation={[Math.PI / 2.3, 0, 0]} material={ringMat}>
          <torusGeometry args={[2.05, 0.006, 8, 220]} />
        </mesh>
        <mesh rotation={[Math.PI / 1.8, 0.4, 0]} material={ringMat}>
          <torusGeometry args={[2.35, 0.004, 8, 220]} />
        </mesh>
      </group>
    </group>
  );
}
