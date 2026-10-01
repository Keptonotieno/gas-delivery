import * as THREE from 'three';
import { CylinderVariant, createCylinderLabelTexture } from './cylinderTexture';

export interface BuiltCylinder {
  group: THREE.Group;
  mainMesh: THREE.Mesh;
  labelTexture: THREE.CanvasTexture;
  variant: CylinderVariant;
  update: (time: number, isHovered?: boolean) => void;
  dispose: () => void;
}

/**
 * Builds a realistic 3D LPG cylinder model with true-to-life proportions,
 * top handle shroud, brass safety valve, bottom foot-ring, and baked enamel finish.
 */
export function buildGasCylinder(variant: CylinderVariant): BuiltCylinder {
  const group = new THREE.Group();
  group.name = `cylinder-${variant.id}`;

  const { radius, height, color } = variant;
  const cylinderHeight = height * 0.65;
  const domeHeight = radius * 0.52;

  // Create high-resolution label texture
  const labelTexture = createCylinderLabelTexture(variant.weight, color);

  // Materials
  // 1. Main Painted Steel Body Material (Baked Powder-Coat Enamel)
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    map: labelTexture,
    metalness: 0.2,
    roughness: 0.32,
    clearcoat: 0.45,
    clearcoatRoughness: 0.18,
    reflectivity: 0.85
  });

  // 2. Unpainted / Solid Enamel Accent for Domes & Seams
  const solidPaintMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 0.2,
    roughness: 0.32,
    clearcoat: 0.45,
    clearcoatRoughness: 0.18,
    reflectivity: 0.85
  });

  // 3. Brass Valve Assembly Material
  const brassMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D4AF37'),
    metalness: 0.88,
    roughness: 0.22
  });

  // 4. Valve Handwheel / Safety Seal (High-visibility Red / Safety Yellow)
  const valveWheelMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#DC2626'), // Safety Red
    metalness: 0.35,
    roughness: 0.45
  });

  // 5. Metal Bracket / Shroud Material
  const shroudMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 0.25,
    roughness: 0.36,
    side: THREE.DoubleSide
  });

  // 6. Rubber / Valve Washer
  const rubberMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1F2937'),
    roughness: 0.85,
    metalness: 0.05
  });

  // Collect geometries and materials for clean disposal
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [
    bodyMaterial,
    solidPaintMaterial,
    brassMaterial,
    valveWheelMaterial,
    shroudMaterial,
    rubberMaterial
  ];

  // =========================================================================
  // 1. Central Cylindrical Tank Barrel
  // =========================================================================
  const barrelGeo = new THREE.CylinderGeometry(radius, radius, cylinderHeight, 64, 1, false);
  geometries.push(barrelGeo);
  const barrelMesh = new THREE.Mesh(barrelGeo, bodyMaterial);
  barrelMesh.castShadow = true;
  barrelMesh.receiveShadow = true;
  group.add(barrelMesh);

  // =========================================================================
  // 2. Upper and Lower Domes (Welded Spherical Caps)
  // =========================================================================
  // Upper Dome
  const topDomeGeo = new THREE.SphereGeometry(radius, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  topDomeGeo.scale(1, domeHeight / radius, 1);
  geometries.push(topDomeGeo);
  const topDomeMesh = new THREE.Mesh(topDomeGeo, solidPaintMaterial);
  topDomeMesh.position.y = cylinderHeight / 2;
  topDomeMesh.castShadow = true;
  group.add(topDomeMesh);

  // Lower Dome
  const bottomDomeGeo = new THREE.SphereGeometry(radius, 64, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  bottomDomeGeo.scale(1, domeHeight / radius, 1);
  geometries.push(bottomDomeGeo);
  const bottomDomeMesh = new THREE.Mesh(bottomDomeGeo, solidPaintMaterial);
  bottomDomeMesh.position.y = -cylinderHeight / 2;
  bottomDomeMesh.castShadow = true;
  group.add(bottomDomeMesh);

  // =========================================================================
  // 3. Welded Circumferential Bead Rings (Authentic Steel Cylinder Seams)
  // =========================================================================
  const weldTopGeo = new THREE.TorusGeometry(radius * 1.002, 0.018, 12, 64);
  weldTopGeo.rotateX(Math.PI / 2);
  geometries.push(weldTopGeo);
  const weldTopMesh = new THREE.Mesh(weldTopGeo, solidPaintMaterial);
  weldTopMesh.position.y = cylinderHeight / 2;
  group.add(weldTopMesh);

  const weldBottomGeo = new THREE.TorusGeometry(radius * 1.002, 0.018, 12, 64);
  weldBottomGeo.rotateX(Math.PI / 2);
  geometries.push(weldBottomGeo);
  const weldBottomMesh = new THREE.Mesh(weldBottomGeo, solidPaintMaterial);
  weldBottomMesh.position.y = -cylinderHeight / 2;
  group.add(weldBottomMesh);

  // Center weld ring (common in heavy LPG cylinders)
  const weldCenterGeo = new THREE.TorusGeometry(radius * 1.003, 0.014, 12, 64);
  weldCenterGeo.rotateX(Math.PI / 2);
  geometries.push(weldCenterGeo);
  const weldCenterMesh = new THREE.Mesh(weldCenterGeo, solidPaintMaterial);
  group.add(weldCenterMesh);

  // =========================================================================
  // 4. Top Protective Collar / Carry Handle Shroud
  // =========================================================================
  const collarHeight = height * 0.22;
  const collarRadius = radius * 0.74;
  const collarBaseY = cylinderHeight / 2 + domeHeight * 0.75;

  // Upper rolled rim of collar
  const collarRimGeo = new THREE.TorusGeometry(collarRadius, 0.032, 16, 48);
  collarRimGeo.rotateX(Math.PI / 2);
  geometries.push(collarRimGeo);
  const collarRimMesh = new THREE.Mesh(collarRimGeo, shroudMaterial);
  collarRimMesh.position.y = collarBaseY + collarHeight;
  collarRimMesh.castShadow = true;
  group.add(collarRimMesh);

  // Collar vertical shroud cylinder
  const collarGeo = new THREE.CylinderGeometry(collarRadius, collarRadius * 1.04, collarHeight, 48, 1, true);
  geometries.push(collarGeo);
  const collarMesh = new THREE.Mesh(collarGeo, shroudMaterial);
  collarMesh.position.y = collarBaseY + collarHeight / 2;
  collarMesh.castShadow = true;
  group.add(collarMesh);

  // Collar handle cutouts / openings (Simulated with ergonomic carry handles)
  const handleGripGeo = new THREE.TorusGeometry(0.16, 0.024, 12, 24, Math.PI);
  geometries.push(handleGripGeo);

  // Left handle
  const handleLeft = new THREE.Mesh(handleGripGeo, shroudMaterial);
  handleLeft.position.set(-collarRadius * 0.96, collarBaseY + collarHeight * 0.55, 0);
  handleLeft.rotation.y = Math.PI / 2;
  group.add(handleLeft);

  // Right handle
  const handleRight = new THREE.Mesh(handleGripGeo, shroudMaterial);
  handleRight.position.set(collarRadius * 0.96, collarBaseY + collarHeight * 0.55, 0);
  handleRight.rotation.y = -Math.PI / 2;
  group.add(handleRight);

  // 3 Support legs welding collar to top dome
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const legGeo = new THREE.BoxGeometry(0.045, collarHeight * 0.8, 0.08);
    geometries.push(legGeo);
    const legMesh = new THREE.Mesh(legGeo, shroudMaterial);
    legMesh.position.set(
      Math.cos(angle) * (collarRadius * 0.98),
      collarBaseY + collarHeight * 0.25,
      Math.sin(angle) * (collarRadius * 0.98)
    );
    legMesh.rotation.y = -angle;
    group.add(legMesh);
  }

  // =========================================================================
  // 5. Authentic Brass Safety Valve Assembly
  // =========================================================================
  const valveGroup = new THREE.Group();
  valveGroup.position.y = cylinderHeight / 2 + domeHeight * 0.92;

  // Brass valve boss neck
  const valveNeckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.22, 24);
  geometries.push(valveNeckGeo);
  const valveNeckMesh = new THREE.Mesh(valveNeckGeo, brassMaterial);
  valveNeckMesh.position.y = 0.11;
  valveGroup.add(valveNeckMesh);

  // Brass hexagonal nut collar
  const hexNutGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.07, 6);
  geometries.push(hexNutGeo);
  const hexNutMesh = new THREE.Mesh(hexNutGeo, brassMaterial);
  hexNutMesh.position.y = 0.22;
  valveGroup.add(hexNutMesh);

  // Horizontal gas outlet spigot nozzle (where regulator clicks on)
  const nozzleGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.18, 16);
  nozzleGeo.rotateZ(Math.PI / 2);
  geometries.push(nozzleGeo);
  const nozzleMesh = new THREE.Mesh(nozzleGeo, brassMaterial);
  nozzleMesh.position.set(0.11, 0.26, 0);
  valveGroup.add(nozzleMesh);

  // Rubber safety O-ring on nozzle
  const oRingGeo = new THREE.TorusGeometry(0.048, 0.012, 10, 24);
  oRingGeo.rotateY(Math.PI / 2);
  geometries.push(oRingGeo);
  const oRingMesh = new THREE.Mesh(oRingGeo, rubberMaterial);
  oRingMesh.position.set(0.17, 0.26, 0);
  valveGroup.add(oRingMesh);

  // Red Valve Handwheel / On-Off Safety Knob
  const knobGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.045, 16);
  geometries.push(knobGeo);
  const knobMesh = new THREE.Mesh(knobGeo, valveWheelMaterial);
  knobMesh.position.y = 0.35;
  valveGroup.add(knobMesh);

  // Brass center retaining screw on knob
  const screwGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12);
  geometries.push(screwGeo);
  const screwMesh = new THREE.Mesh(screwGeo, brassMaterial);
  screwMesh.position.y = 0.38;
  valveGroup.add(screwMesh);

  group.add(valveGroup);

  // =========================================================================
  // 6. Welded Foot Ring (Base Stand Ring with Drainage Slots)
  // =========================================================================
  const footRingHeight = height * 0.16;
  const footRingRadius = radius * 0.88;
  const footBaseY = -cylinderHeight / 2 - domeHeight * 0.65;

  const footRingGeo = new THREE.CylinderGeometry(footRingRadius, footRingRadius * 1.02, footRingHeight, 48, 1, true);
  geometries.push(footRingGeo);
  const footRingMesh = new THREE.Mesh(footRingGeo, shroudMaterial);
  footRingMesh.position.y = footBaseY - footRingHeight / 2;
  footRingMesh.castShadow = true;
  group.add(footRingMesh);

  // Rolled bottom lip on foot ring
  const footRimGeo = new THREE.TorusGeometry(footRingRadius * 1.02, 0.026, 12, 48);
  footRimGeo.rotateX(Math.PI / 2);
  geometries.push(footRimGeo);
  const footRimMesh = new THREE.Mesh(footRimGeo, shroudMaterial);
  footRimMesh.position.y = footBaseY - footRingHeight;
  footRimMesh.castShadow = true;
  group.add(footRimMesh);

  // Base bracket connectors
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const baseLegGeo = new THREE.BoxGeometry(0.045, footRingHeight * 0.9, 0.08);
    geometries.push(baseLegGeo);
    const baseLegMesh = new THREE.Mesh(baseLegGeo, shroudMaterial);
    baseLegMesh.position.set(
      Math.cos(angle) * (footRingRadius * 0.96),
      footBaseY - footRingHeight * 0.35,
      Math.sin(angle) * (footRingRadius * 0.96)
    );
    baseLegMesh.rotation.y = -angle;
    group.add(baseLegMesh);
  }

  // Set initial position based on variant
  group.position.set(...variant.position);
  group.rotation.y = variant.rotationYOffset;

  return {
    group,
    mainMesh: barrelMesh,
    labelTexture,
    variant,
    update: (time: number, isHovered = false) => {
      // Continuous smooth Y rotation with subtle breathing
      const rotationSpeed = isHovered ? 0.35 : 0.6;
      group.rotation.y = variant.rotationYOffset + time * rotationSpeed;

      // Subtle gentle X-axis tilt oscillation
      group.rotation.x = Math.sin(time * 0.9 + variant.radius) * 0.035;

      // Subtle gentle Z-axis tilt
      group.rotation.z = Math.cos(time * 0.7 + variant.radius) * 0.02;

      // Gentle floating motion on Y position
      const floatAmp = 0.06;
      const floatOffset = Math.sin(time * 1.4 + variant.radius * 2) * floatAmp;
      group.position.y = variant.position[1] + floatOffset;
    },
    dispose: () => {
      geometries.forEach(geo => geo.dispose());
      materials.forEach(mat => mat.dispose());
      labelTexture.dispose();
    }
  };
}
