import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CYLINDER_VARIANTS, createContactShadowTexture } from './cylinderTexture';
import { buildGasCylinder, BuiltCylinder } from './CylinderMeshBuilder';
import { CylinderFallback } from './CylinderFallback';

interface CylinderSceneProps {
  activeVariantId?: string;
  onSelectVariant?: (id: string) => void;
  className?: string;
}

export const CylinderScene: React.FC<CylinderSceneProps> = ({
  activeVariantId = '13kg',
  onSelectVariant,
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGLError, setHasWebGLError] = useState(false);
  const [isInteractiveHover, setIsInteractiveHover] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGLError(true);
        return;
      }
    } catch {
      setHasWebGLError(true);
      return;
    }

    let animationFrameId: number;
    let isDisposed = false;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup with cinematic perspective
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 7.8);
    camera.lookAt(0, 0.1, 0);

    // 3. Renderer with high-DPI and alpha transparency
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
    } catch {
      setHasWebGLError(true);
      return;
    }

    // 4. Lighting design
    // Ambient light - warm soft baseline
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.95);
    scene.add(ambientLight);

    // Key Light - strong white directional light with soft shadow
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Fill Light - warm amber orange bounce from bottom-left
    const fillLight = new THREE.DirectionalLight(0xf97316, 1.3);
    fillLight.position.set(-6, 2, 4);
    scene.add(fillLight);

    // Rim Light - cool white edge highlight from top-back
    const rimLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    rimLight.position.set(0, 8, -6);
    scene.add(rimLight);

    // Subtle bottom bounce light to illuminate under the shrouds
    const groundBounce = new THREE.PointLight(0xffedd5, 1.0, 10);
    groundBounce.position.set(0, -2.5, 2);
    scene.add(groundBounce);

    // 5. Contact shadows under each cylinder
    const shadowTexture = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    shadowGeo.rotateX(-Math.PI / 2);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });

    const shadowMeshes: THREE.Mesh[] = [];

    // 6. Build the 3 Cylinders (6kg Blue, 13kg Orange, 50kg Yellow)
    const builtCylinders: BuiltCylinder[] = [];
    const cylinderGroup = new THREE.Group();
    scene.add(cylinderGroup);

    const trioVariants = [
      CYLINDER_VARIANTS[0], // 6kg Blue
      CYLINDER_VARIANTS[1], // 13kg Orange
      CYLINDER_VARIANTS[2]  // 50kg Yellow
    ];

    trioVariants.forEach(variant => {
      const built = buildGasCylinder(variant);
      builtCylinders.push(built);
      cylinderGroup.add(built.group);

      // Add contact shadow
      const sMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
      sMesh.position.set(variant.position[0], -1.5, variant.position[2]);
      const sScale = variant.radius * 1.5;
      sMesh.scale.set(sScale, sScale, sScale);
      scene.add(sMesh);
      shadowMeshes.push(sMesh);
    });

    // 7. Glowing Golden Orbital Ring (as shown in image.png)
    const ringRadius = 2.75;
    const ringTube = 0.022;
    const ringGeo = new THREE.TorusGeometry(ringRadius, ringTube, 16, 80);
    ringGeo.rotateX(Math.PI / 2.25);
    ringGeo.rotateZ(Math.PI / 10);

    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#FDE047'),
      transparent: true,
      opacity: 0.85
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, -1.0, 0);
    scene.add(ringMesh);

    // 8. Floating warm amber particle orbs (as seen in image.png)
    const particleCount = 18;
    const particleGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const particleMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#FED7AA'),
      transparent: true,
      opacity: 0.75
    });

    const particles: { mesh: THREE.Mesh; speed: number; phase: number; radius: number; baseY: number }[] = [];
    for (let i = 0; i < particleCount; i++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      const angle = (i / particleCount) * Math.PI * 2;
      const dist = 1.8 + Math.random() * 1.6;
      const y = -1.2 + Math.random() * 2.8;
      const scale = 0.4 + Math.random() * 1.0;
      pMesh.scale.set(scale, scale, scale);
      pMesh.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
      scene.add(pMesh);
      particles.push({
        mesh: pMesh,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        radius: dist,
        baseY: y
      });
    }

    // 9. Interactive mouse / touch parallax tracking
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((clientY - rect.top) / rect.height) * 2 - 1);

      targetRotationY = normX * 0.35;
      targetRotationX = normY * 0.18;
    };

    const handlePointerLeave = () => {
      targetRotationX = 0;
      targetRotationY = 0;
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('mouseleave', handlePointerLeave);
    container.addEventListener('touchmove', handlePointerMove, { passive: true });

    // 10. Responsive resize handler
    const handleResize = () => {
      if (!container || !renderer || isDisposed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      camera.aspect = w / h;

      // Adjust camera distance based on viewport width
      if (w < 480) {
        camera.position.z = 9.8;
        camera.position.y = 0.4;
      } else if (w < 768) {
        camera.position.z = 8.8;
        camera.position.y = 0.5;
      } else {
        camera.position.z = 7.8;
        camera.position.y = 0.6;
      }

      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 11. Animation render loop
    const clock = new THREE.Clock();
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        clock.start();
      } else {
        clock.stop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      if (!isTabVisible) return;

      const elapsedTime = clock.getElapsedTime();

      // Smooth lerp for user mouse parallax
      currentRotationX += (targetRotationX - currentRotationX) * 0.05;
      currentRotationY += (targetRotationY - currentRotationY) * 0.05;

      cylinderGroup.rotation.x = currentRotationX;
      cylinderGroup.rotation.y = currentRotationY;

      // Update individual cylinders
      if (!prefersReducedMotion) {
        builtCylinders.forEach((cyl, idx) => {
          cyl.update(elapsedTime, isInteractiveHover);

          // Update corresponding contact shadow scale with float height
          const sMesh = shadowMeshes[idx];
          if (sMesh) {
            const floatOffset = Math.sin(elapsedTime * 1.4 + cyl.variant.radius * 2) * 0.06;
            const dynamicScale = cyl.variant.radius * 1.5 * (1 - floatOffset * 0.6);
            sMesh.scale.set(dynamicScale, dynamicScale, dynamicScale);
            (sMesh.material as THREE.MeshBasicMaterial).opacity = 0.72 - floatOffset * 0.5;
          }
        });

        // Gently pulse the orbital ring
        ringMesh.rotation.z = Math.PI / 10 + Math.sin(elapsedTime * 0.5) * 0.04;
        ringMat.opacity = 0.75 + Math.sin(elapsedTime * 1.8) * 0.15;

        // Floating ambient orbs
        particles.forEach(p => {
          p.mesh.position.y = p.baseY + Math.sin(elapsedTime * p.speed + p.phase) * 0.25;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // 12. Cleanup & disposal
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('mouseleave', handlePointerLeave);
      container.removeEventListener('touchmove', handlePointerMove);
      resizeObserver.disconnect();

      builtCylinders.forEach(cyl => cyl.dispose());
      shadowTexture.dispose();
      shadowGeo.dispose();
      shadowMaterial.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [isInteractiveHover]);

  if (hasWebGLError) {
    return <CylinderFallback className={className} />;
  }

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      onMouseEnter={() => setIsInteractiveHover(true)}
      onMouseLeave={() => setIsInteractiveHover(false)}
    >
      {/* 3D Canvas Mounting Node */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
