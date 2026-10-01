import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TarsMonolith } from './TarsMonolith';
import { Starfield } from './Starfield';
import { Gargantua } from './Gargantua';
import { scrollState } from '../scrollState';

function CameraRig() {
  useFrame((state, dt) => {
    const cam = state.camera;
    const d = Math.min(dt, 0.05);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, scrollState.pointerX * 0.45, 1.8, d);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, scrollState.pointerY * 0.28, 1.8, d);
    cam.lookAt(0, 0, 0);
  });
  return null;
}

export default function TarsScene() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-label="TARS monolith walking through deep space"
      role="img"
      data-testid="tars-3d-canvas"
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 10], fov: 35, near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={['#05060A']} />
        <ambientLight intensity={0.08} />
        <directionalLight position={[5, 6, 4]} intensity={1.6} color="#FFE2BD" />
        <directionalLight position={[-6, -2, -5]} intensity={1.3} color="#8FB8FF" />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.6} color="#FFDDB0" position={[4, 3, 6]} scale={[6, 2, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.6} color="#9EC2FF" position={[-6, 1, -4]} scale={[3, 8, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={1} color="#ffffff" position={[0, 6, -2]} scale={4} target={[0, 0, 0]} />
        </Environment>
        <Starfield />
        <Gargantua />
        <TarsMonolith />
        <Sparkles count={90} scale={[16, 9, 8]} size={1.6} speed={0.12} opacity={0.35} color="#F4DDBB" />
        <CameraRig />
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.22} luminanceSmoothing={0.3} />
          <Noise opacity={0.035} premultiply />
          <Vignette offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
