import * as THREE from 'three';

export interface CylinderVariant {
  id: string;
  weight: string;
  name: string;
  color: string;
  specularColor: string;
  height: number;
  radius: number;
  position: [number, number, number];
  rotationYOffset: number;
  description: string;
  tag: string;
}

export const CYLINDER_VARIANTS: CylinderVariant[] = [
  {
    id: '6kg',
    weight: '6KG',
    name: '6kg Compact LPG Refill',
    color: '#1D4ED8', // Royal Blue (like Shell/Vivo / K-Gas compact)
    specularColor: '#60A5FA',
    height: 1.65,
    radius: 0.78,
    position: [-1.45, -0.15, -0.35],
    rotationYOffset: 0.4,
    description: 'Fast express refill for small kitchens and apartments',
    tag: 'Quick Refill'
  },
  {
    id: '13kg',
    weight: '13KG',
    name: '13kg Household LPG Cylinder',
    color: '#E04F11', // Signature GasDeliver Vibrant Orange
    specularColor: '#FB923C',
    height: 2.25,
    radius: 0.94,
    position: [0, 0.05, 0.45],
    rotationYOffset: 0,
    description: 'Kenya’s top choice for family cooking and dining',
    tag: 'Most Popular'
  },
  {
    id: '50kg',
    weight: '50KG',
    name: '50kg Commercial Heavy LPG',
    color: '#EAB308', // Safety Gold / Yellow
    specularColor: '#FDE047',
    height: 2.85,
    radius: 1.02,
    position: [1.45, 0.12, -0.35],
    rotationYOffset: -0.4,
    description: 'Heavy duty commercial LPG for hotels and restaurants',
    tag: 'Commercial'
  },
  {
    id: '22kg',
    weight: '22.5KG',
    name: '22.5kg Catering LPG Tank',
    color: '#059669', // Emerald Green (Rubis / K-Gas style)
    specularColor: '#34D399',
    height: 2.5,
    radius: 0.98,
    position: [0, 0, 0],
    rotationYOffset: 0,
    description: 'Ideal for bakeries, catering businesses and large homes',
    tag: 'Catering Pro'
  }
];

/**
 * Procedurally generates a crisp high-resolution cylindrical wrap texture
 * containing the official GasDeliver flame badge, brand name, "Safe Gas. On Time.",
 * weight label ("13KG", "6KG", etc.), and safety inspection mark.
 */
export function createCylinderLabelTexture(
  weight: string,
  baseColor: string
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 64;
    fallbackCanvas.height = 64;
    return new THREE.CanvasTexture(fallbackCanvas);
  }

  // Base background matches cylinder color with ultra-smooth gradient
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle powder-coat texture overlay
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  grad.addColorStop(0.75, 'rgba(0,0,0,0.15)');
  grad.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // The label is centered at x = width / 2 (front face of cylinder)
  const cx = width / 2;
  const cy = height * 0.48;

  // 1. GasDeliver Flame Emblem Badge (White circle with flame icon)
  const badgeRadius = 38;
  const badgeY = cy - 85;

  ctx.save();
  // Soft glow around badge
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.arc(cx, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // Draw Flame icon inside white badge
  ctx.save();
  ctx.translate(cx, badgeY);
  ctx.scale(0.85, 0.85);

  // Outer Flame (GasDeliver Orange)
  ctx.beginPath();
  ctx.fillStyle = '#E04F11';
  ctx.moveTo(0, -28);
  ctx.bezierCurveTo(-14, -6, -22, 8, -22, 18);
  ctx.bezierCurveTo(-22, 30, -12, 34, 0, 34);
  ctx.bezierCurveTo(12, 34, 22, 30, 22, 18);
  ctx.bezierCurveTo(22, 8, 14, -6, 0, -28);
  ctx.fill();

  // Inner Teardrop
  ctx.beginPath();
  ctx.fillStyle = '#FFFFFF';
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-6, 12, -7, 18, -7, 22);
  ctx.bezierCurveTo(-7, 28, -3, 30, 0, 30);
  ctx.bezierCurveTo(3, 30, 7, 28, 7, 22);
  ctx.bezierCurveTo(7, 18, 6, 12, 0, 4);
  ctx.fill();
  ctx.restore();

  // 2. Brand Name: "GasDeliver"
  ctx.save();
  ctx.font = '900 52px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillText('GasDeliver', cx, cy - 15);
  ctx.restore();

  // 3. Brand Slogan: "Safe Gas. On Time."
  ctx.save();
  ctx.font = '600 20px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.letterSpacing = '1px';
  ctx.fillText('Safe Gas. On Time.', cx, cy + 24);
  ctx.restore();

  // 4. Weight Label: "13KG", "6KG", "50KG"
  ctx.save();
  ctx.font = '900 68px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillText(weight, cx, cy + 95);
  ctx.restore();

  // 5. Official Safety Certification Tag
  ctx.save();
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText('KEBS CERTIFIED · TESTED 30 BAR', cx, cy + 145);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates soft ground contact shadow texture
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const cx = 128;
  const cy = 128;
  const radius = 110;

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
  grad.addColorStop(0, 'rgba(80, 20, 0, 0.65)');
  grad.addColorStop(0.35, 'rgba(120, 30, 0, 0.4)');
  grad.addColorStop(0.7, 'rgba(180, 50, 0, 0.15)');
  grad.addColorStop(1, 'rgba(200, 70, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
