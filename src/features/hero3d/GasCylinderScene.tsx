import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Eye, EyeOff } from 'lucide-react';
import { createCylinderLabelTexture } from './cylinderTexture';

export interface GasCylinderSceneProps {
  /** Cylinder variant or weight label (e.g. '13KG', '6KG', '50KG') */
  weight?: string;
  /** Cylinder base color, defaults to GasDeliver brand orange #E04F11 */
  color?: string;
  /** Specular highlight color */
  specularColor?: string;
  /** Cylinder tank height scale */
  height?: number;
  /** Cylinder tank radius scale */
  radius?: number;
  /** Optional override to force reduced motion, otherwise detects user preference */
  reducedMotion?: boolean;
  /** Show an interactive motion toggle button for accessibility testing */
  showAccessibilityToggle?: boolean;
  /** Custom CSS class names for the container */
  className?: string;
}

/**
 * Procedural detailed 3D Gas Cylinder Mesh
 */
const CylinderModel: React.FC<{
  weight: string;
  color: string;
  radius: number;
  height: number;
  isReducedMotion: boolean;
}> = ({ weight, color, radius, height, isReducedMotion }) => {
  const modelGroupRef = useRef<THREE.Group>(null);
  const cylinderHeight = height * 0.7;
  const domeHeight = radius * 0.52;

  // Generate crisp brand texture with GasDeliver insignia & weight badge
  const labelTexture = useMemo(() => {
    return createCylinderLabelTexture(weight, color);
  }, [weight, color]);

  // Clean up texture on unmount or re-creation
  useEffect(() => {
    return () => {
      labelTexture.dispose();
    };
  }, [labelTexture]);

  // Frame animation for smooth rotation and subtle breathing oscillation
  useFrame((state, delta) => {
    if (!modelGroupRef.current) return;
    if (!isReducedMotion) {
      // Gentle continuous rotation
      modelGroupRef.current.rotation.y += delta * 0.65;
      // Very subtle organic tilting
      const t = state.clock.getElapsedTime();
      modelGroupRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
    }
  });

  const collarHeight = height * 0.22;
  const collarRadius = radius * 0.74;
  const collarBaseY = cylinderHeight / 2 + domeHeight * 0.75;
  const footRingHeight = height * 0.16;
  const footRingRadius = radius * 0.88;
  const footBaseY = -cylinderHeight / 2 - domeHeight * 0.65;

  return (
    <group ref={modelGroupRef} position={[0, 0.1, 0]}>
      {/* 1. Main Cylindrical Tank Body with Baked Enamel finish & Branded Label */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, cylinderHeight, 64, 1, false]} />
        <meshPhysicalMaterial
          color={color}
          map={labelTexture}
          metalness={0.2}
          roughness={0.32}
          clearcoat={0.45}
          clearcoatRoughness={0.18}
          reflectivity={0.85}
        />
      </mesh>

      {/* 2. Upper Welded Spherical Dome */}
      <mesh position={[0, cylinderHeight / 2, 0]} castShadow>
        <sphereGeometry args={[radius, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2]} scale={[1, domeHeight / radius, 1]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.2}
          roughness={0.32}
          clearcoat={0.45}
          clearcoatRoughness={0.18}
        />
      </mesh>

      {/* 3. Lower Welded Spherical Dome */}
      <mesh position={[0, -cylinderHeight / 2, 0]} castShadow>
        <sphereGeometry args={[radius, 64, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} scale={[1, domeHeight / radius, 1]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.2}
          roughness={0.32}
          clearcoat={0.45}
          clearcoatRoughness={0.18}
        />
      </mesh>

      {/* 4. Welded Circumferential Bead Seams */}
      <mesh position={[0, cylinderHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.002, 0.018, 12, 64]} />
        <meshPhysicalMaterial color={color} metalness={0.2} roughness={0.35} />
      </mesh>
      <mesh position={[0, -cylinderHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.002, 0.018, 12, 64]} />
        <meshPhysicalMaterial color={color} metalness={0.2} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.003, 0.014, 12, 64]} />
        <meshPhysicalMaterial color={color} metalness={0.2} roughness={0.35} />
      </mesh>

      {/* 5. Top Protective Shroud / Carry Collar */}
      <group>
        {/* Shroud Cylindrical Wall */}
        <mesh position={[0, collarBaseY + collarHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[collarRadius, collarRadius * 1.04, collarHeight, 48, 1, true]} />
          <meshPhysicalMaterial color={color} metalness={0.25} roughness={0.36} side={THREE.DoubleSide} />
        </mesh>
        {/* Shroud Upper Rolled Rim */}
        <mesh position={[0, collarBaseY + collarHeight, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[collarRadius, 0.032, 16, 48]} />
          <meshPhysicalMaterial color={color} metalness={0.25} roughness={0.36} />
        </mesh>
        {/* Ergonomic Carry Grip Handles */}
        <mesh position={[-collarRadius * 0.96, collarBaseY + collarHeight * 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.16, 0.024, 12, 24, Math.PI]} />
          <meshPhysicalMaterial color={color} metalness={0.25} roughness={0.36} />
        </mesh>
        <mesh position={[collarRadius * 0.96, collarBaseY + collarHeight * 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <torusGeometry args={[0.16, 0.024, 12, 24, Math.PI]} />
          <meshPhysicalMaterial color={color} metalness={0.25} roughness={0.36} />
        </mesh>
      </group>

      {/* 6. Authentic Brass Safety Valve Assembly */}
      <group position={[0, cylinderHeight / 2 + domeHeight * 0.92, 0]}>
        {/* Brass neck */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.22, 24]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.88} roughness={0.22} />
        </mesh>
        {/* Brass hex nut */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.07, 6]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.88} roughness={0.22} />
        </mesh>
        {/* Gas outlet nozzle */}
        <mesh position={[0.11, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.18, 16]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.88} roughness={0.22} />
        </mesh>
        {/* Safety Red Handwheel */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.045, 16]} />
          <meshStandardMaterial color="#DC2626" metalness={0.35} roughness={0.45} />
        </mesh>
        {/* Center retaining brass screw */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 12]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.88} roughness={0.22} />
        </mesh>
      </group>

      {/* 7. Welded Bottom Foot Ring / Base Stand */}
      <group>
        <mesh position={[0, footBaseY - footRingHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[footRingRadius, footRingRadius * 1.02, footRingHeight, 48, 1, true]} />
          <meshPhysicalMaterial color={color} metalness={0.25} roughness={0.36} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, footBaseY - footRingHeight, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[footRingRadius * 1.02, 0.026, 12, 48]} />
          <meshPhysicalMaterial color={color} metalness={0.25} roughness={0.36} />
        </mesh>
      </group>
    </group>
  );
};

/**
 * GasCylinderScene Component
 * 
 * Uses @react-three/fiber and @react-three/drei to render a rotating, floating
 * cylinder with a subtle floor contact shadow, fully respecting the
 * 'prefers-reduced-motion' media query for accessibility.
 */
export const GasCylinderScene: React.FC<GasCylinderSceneProps> = ({
  weight = '13KG',
  color = '#E04F11',
  height = 2.25,
  radius = 0.94,
  reducedMotion: overrideReducedMotion,
  showAccessibilityToggle = true,
  className = ''
}) => {
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(false);
  const [manualMotionToggle, setManualMotionToggle] = useState<boolean | null>(null);

  // Detect and listen to OS/browser 'prefers-reduced-motion' media query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const isReducedMotion = overrideReducedMotion !== undefined 
    ? overrideReducedMotion 
    : (manualMotionToggle !== null ? manualMotionToggle : systemPrefersReducedMotion);

  return (
    <div
      className={`relative w-full h-full min-h-[320px] flex items-center justify-center overflow-hidden select-none ${className}`}
      role="region"
      aria-label={`3D GasDeliver ${weight} LPG cylinder rendering with ${isReducedMotion ? 'static accessible view' : 'rotating and floating motion'}`}
    >
      <Canvas
        shadows
        camera={{ position: [0, 0.4, 6.8], fov: 38 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <PerspectiveCamera makeDefault position={[0, 0.4, 6.8]} fov={38} />

        {/* OrbitControls for smooth user interactive dragging */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.7}
          maxPolarAngle={Math.PI / 1.7}
          rotateSpeed={0.8}
        />

        {/* Ambient & Studio Directional Lighting */}
        <ambientLight intensity={0.9} color="#FFF7ED" />
        <directionalLight
          position={[4, 7, 5]}
          intensity={2.2}
          color="#FFFFFF"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-5, 2, 4]} intensity={1.2} color="#F97316" />
        <directionalLight position={[0, 6, -5]} intensity={1.5} color="#FFEDD5" />
        <pointLight position={[0, -2, 2]} intensity={0.8} color="#FFEDD5" />

        {/* Floating motion: paused when prefers-reduced-motion is active */}
        <Float
          speed={isReducedMotion ? 0 : 2}
          rotationIntensity={isReducedMotion ? 0 : 0.12}
          floatIntensity={isReducedMotion ? 0 : 0.45}
          floatingRange={isReducedMotion ? [0, 0] : [-0.08, 0.08]}
        >
          <CylinderModel
            weight={weight}
            color={color}
            radius={radius}
            height={height}
            isReducedMotion={isReducedMotion}
          />
        </Float>

        {/* Subtle floor contact shadow using @react-three/drei ContactShadows */}
        <ContactShadows
          position={[0, -1.9, 0]}
          opacity={0.65}
          scale={5.5}
          blur={2.4}
          far={4}
          resolution={512}
          color="#450A0A"
        />
      </Canvas>

      {/* Accessibility Controls & Status Badge */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
        {showAccessibilityToggle && (
          <button
            type="button"
            onClick={() => setManualMotionToggle(!isReducedMotion)}
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/35 hover:bg-black/50 text-white/90 border border-white/15 backdrop-blur-xs transition-colors cursor-pointer"
            title={isReducedMotion ? "Click to enable 3D animation" : "Click to enable reduced motion"}
          >
            {isReducedMotion ? (
              <>
                <EyeOff className="w-3 h-3 text-amber-300" />
                <span>Motion: Off</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 text-emerald-300" />
                <span>Motion: On</span>
              </>
            )}
          </button>
        )}

        <div className="pointer-events-none">
          <span className="text-[10px] text-white/70 font-medium tracking-wide bg-black/25 px-2 py-0.5 rounded backdrop-blur-xs">
            R3F + Drei 3D
          </span>
        </div>
      </div>
    </div>
  );
};

export default GasCylinderScene;
