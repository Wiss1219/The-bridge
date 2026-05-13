import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Torus, Octahedron, MeshDistortMaterial, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Define Three.js elements as any to bypass TypeScript intrinsic element checks
const Group = 'group' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;

interface AvatarProps {
  isSpeaking: boolean;
  color: string;
}

const CoreGeometry = ({ isSpeaking, color }: AvatarProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    
    // Idle rotation
    meshRef.current.rotation.y = t * 0.5;
    meshRef.current.rotation.z = t * 0.2;

    // Speaking pulse
    const scale = isSpeaking ? 1 + Math.sin(t * 10) * 0.2 : 1;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Octahedron ref={meshRef} args={[1.5, 0]} position={[0, 0, 0]}>
         <MeshDistortMaterial 
            color={color} 
            envMapIntensity={1} 
            clearcoat={1} 
            clearcoatRoughness={0.1} 
            metalness={0.5}
            distort={isSpeaking ? 0.6 : 0.3}
            speed={isSpeaking ? 5 : 2}
         />
      </Octahedron>
    </Float>
  );
};

const Rings = ({ color }: { color: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y -= 0.01;
    groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2;
  });

  return (
    <Group ref={groupRef}>
      <Torus args={[2.5, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <MeshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.3} />
      </Torus>
      <Torus args={[3.2, 0.02, 16, 100]} rotation={[Math.PI / 3, 0, 0]}>
        <MeshStandardMaterial color="#ffffff" transparent opacity={0.1} />
      </Torus>
    </Group>
  );
};

export const Avatar3D: React.FC<AvatarProps> = ({ isSpeaking, color }) => {
  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <AmbientLight intensity={0.5} />
        <PointLight position={[10, 10, 10]} intensity={1} />
        <PointLight position={[-10, -10, -10]} color={color} intensity={2} />
        
        <CoreGeometry isSpeaking={isSpeaking} color={color} />
        <Rings color={color} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  );
};