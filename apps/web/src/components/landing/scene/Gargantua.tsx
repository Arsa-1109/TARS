import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../scrollState';
import { lerp } from './poses';

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float hole = 0.23;
    float ring = exp(-pow((r - 0.255) / 0.012, 2.0)) * 1.5 + exp(-pow((r - 0.28) / 0.06, 2.0)) * 0.3;
    float y = p.y + p.x * 0.05;
    float diskW = 0.012 + 0.03 * smoothstep(0.2, 1.0, abs(p.x));
    float disk = exp(-pow(y / diskW, 2.0)) * smoothstep(1.0, 0.26, abs(p.x));
    disk *= 0.75 + 0.25 * sin(p.x * 60.0 - uTime * 1.1) * sin(p.x * 23.0 + uTime * 0.6);
    float doppler = 1.0 - 0.45 * p.x;
    float arc = exp(-pow((r - 0.34) / 0.04, 2.0)) * (0.35 + 0.65 * abs(p.y) / max(r, 0.001)) * 0.7;
    float halo = exp(-r * 3.4) * 0.3;
    vec3 amber = vec3(1.0, 0.7, 0.4);
    vec3 hot = vec3(1.0, 0.93, 0.82);
    vec3 col = amber * (arc + halo) + mix(amber, hot, 0.6) * ring + mix(amber, hot, clamp(disk, 0.0, 1.0)) * disk * doppler * 1.7;
    float inside = 1.0 - smoothstep(hole - 0.01, hole + 0.004, r);
    float front = clamp(disk * 1.6, 0.0, 1.0);
    col = mix(col, vec3(0.0), inside * (1.0 - front));
    float alpha = clamp(max(max(ring, arc), max(disk, halo)) * 1.2, 0.0, 1.0);
    alpha = max(alpha, inside);
    alpha *= smoothstep(1.0, 0.8, r) + disk;
    gl_FragColor = vec4(col * uIntensity, clamp(alpha, 0.0, 1.0));
  }
`;

export function Gargantua() {
  const ref = useRef<THREE.Mesh>(null!);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 0.8 } },
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useFrame((state) => {
    const p = scrollState.progress;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uIntensity.value = lerp(0.75, 1.05, p);
    const mobile = state.viewport.width < 6;
    ref.current.position.set(lerp(mobile ? 4 : 17, 0, p), lerp(mobile ? 12 : 8, 4.5, p), -62);
    ref.current.scale.setScalar(lerp(34, 48, p));
    ref.current.rotation.z = lerp(-0.18, 0.04, p);
  });

  return (
    <mesh ref={ref} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
