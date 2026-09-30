import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../scrollState';

const COUNT = 5200;

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPR;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vTw = 0.6 + 0.4 * sin(uTime * (0.4 + aSeed * 1.4) + aSeed * 40.0);
    gl_PointSize = aSize * uPR * (240.0 / -mv.z);
    vColor = aColor;
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor * vTw * 1.3, a * vTw);
  }
`;

export function Starfield() {
  const ref = useRef<THREE.Points>(null!);
  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const size = new Float32Array(COUNT);
    const seed = new Float32Array(COUNT);
    const warm = new THREE.Color('#FFE6C4');
    const cool = new THREE.Color('#CFE0FF');
    const white = new THREE.Color('#F4F6FB');
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 110;
      const s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
      const pick = Math.random();
      c.copy(pick < 0.2 ? warm : pick < 0.45 ? cool : white);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = 0.5 + Math.pow(Math.random(), 9) * 4.5;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio, 2) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    material.uniforms.uTime.value = t;
    const p = scrollState.progress;
    ref.current.rotation.y = t * 0.004 + p * 0.7;
    ref.current.rotation.x = p * 0.18;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}
