import * as THREE from 'three';
import { LED_SPECS } from '../../engine/ComponentRegistry';
import type { LedColorId } from '../../engine/types';

function createHaloTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 4, cx, cx, cx);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(255, 255, 255, 0.78)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SHARED_HALO_TEXTURE = createHaloTexture();

/**
 * 5mm Standard-LED in 3D:
 * - Ausgeschaltet: dunkel, leicht transluzent in LED-Farbe mit sichtbarem innerem Reflektor
 * - Eingeschaltet: starkes emissiveIntensity, additiver Halo-Glow und farbige PointLight-Abstrahlung aufs Board
 */
export class LedMesh {
  public readonly group = new THREE.Group();

  private readonly bodyMat: THREE.MeshPhysicalMaterial;
  private readonly coreMat: THREE.MeshStandardMaterial;
  private readonly haloMat: THREE.SpriteMaterial;
  private readonly haloSprite: THREE.Sprite;
  private readonly pointLight: THREE.PointLight;

  private currentColorId: LedColorId = 'red';

  constructor(anodePos: THREE.Vector3, cathodePos: THREE.Vector3) {
    this.group.name = 'LED_5mm';

    const midpoint = new THREE.Vector3().addVectors(anodePos, cathodePos).multiplyScalar(0.5);
    this.group.position.copy(midpoint);

    const dx = cathodePos.x - anodePos.x;
    const dz = cathodePos.z - anodePos.z;
    const spacing = Math.hypot(dx, dz);
    const angleY = Math.atan2(-dz, dx);
    this.group.rotation.y = angleY;

    // Two metallic leads plunging into the breadboard
    const leadMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.9,
      roughness: 0.22,
    });

    const leadHeight = 0.78;
    const leadGeo = new THREE.CylinderGeometry(0.028, 0.028, leadHeight, 10);
    const leftLead = new THREE.Mesh(leadGeo, leadMat);
    leftLead.position.set(-spacing / 2, leadHeight / 2 - 0.1, 0);
    this.group.add(leftLead);

    const rightLead = new THREE.Mesh(leadGeo, leadMat);
    rightLead.position.set(spacing / 2, leadHeight / 2 - 0.1, 0);
    this.group.add(rightLead);

    // Inner metal anvil / reflector cup (visible when LED is off)
    const cupGeo = new THREE.CylinderGeometry(0.09, 0.05, 0.22, 12);
    const cupMesh = new THREE.Mesh(cupGeo, leadMat);
    cupMesh.position.set(0, 0.96, 0);
    this.group.add(cupMesh);

    // Bright internal die core
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x330808,
      emissive: 0xff2a2a,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), this.coreMat);
    coreMesh.position.set(0, 1.14, 0);
    this.group.add(coreMesh);

    // Outer 5mm epoxy lens (collar + cylinder + hemisphere dome)
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x5c1111,
      emissive: 0xff2a2a,
      emissiveIntensity: 0,
      roughness: 0.14,
      metalness: 0.0,
      transmission: 0.35,
      transparent: true,
      opacity: 0.86,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const flangeGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 24);
    const flangeMesh = new THREE.Mesh(flangeGeo, this.bodyMat);
    flangeMesh.position.set(0, 0.74, 0);
    flangeMesh.castShadow = true;
    this.group.add(flangeMesh);

    const barrelGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.48, 24);
    const barrelMesh = new THREE.Mesh(barrelGeo, this.bodyMat);
    barrelMesh.position.set(0, 1.04, 0);
    barrelMesh.castShadow = true;
    this.group.add(barrelMesh);

    const domeGeo = new THREE.SphereGeometry(0.27, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, this.bodyMat);
    domeMesh.position.set(0, 1.28, 0);
    domeMesh.castShadow = true;
    this.group.add(domeMesh);

    // Additive billboard halo glow
    this.haloMat = new THREE.SpriteMaterial({
      map: SHARED_HALO_TEXTURE,
      color: 0xff4d4d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloSprite = new THREE.Sprite(this.haloMat);
    this.haloSprite.position.set(0, 1.18, 0);
    this.haloSprite.scale.set(0.01, 0.01, 1);
    this.group.add(this.haloSprite);

    // Colored PointLight radiating onto the breadboard & neighbors
    this.pointLight = new THREE.PointLight(0xff2a2a, 0, 5.5, 1.7);
    this.pointLight.position.set(0, 1.25, 0);
    this.group.add(this.pointLight);

    this.updateVisuals('red', 0, false, false, 0);
  }

  public updateVisuals(
    colorId: LedColorId,
    brightnessPercent: number,
    isOvercurrent: boolean,
    isCriticalOvercurrent: boolean,
    elapsedSeconds: number,
  ): void {
    const spec = LED_SPECS[colorId];
    this.currentColorId = colorId;
    void this.currentColorId;

    const baseColor = new THREE.Color(spec.hex);
    const glowColor = new THREE.Color(spec.glowHex);
    const darkOffColor = baseColor.clone().multiplyScalar(0.22);

    const norm = Math.max(0, Math.min(1, brightnessPercent / 100));

    // Flicker slightly when critically overloaded (> 40 mA)
    let overloadFactor = 1.0;
    if (isCriticalOvercurrent && norm > 0.01) {
      overloadFactor = 1.25 + Math.sin(elapsedSeconds * 48) * 0.28;
      glowColor.lerp(new THREE.Color('#fffbeb'), 0.45);
    } else if (isOvercurrent && norm > 0.01) {
      overloadFactor = 1.15 + Math.sin(elapsedSeconds * 14) * 0.08;
    }

    if (norm <= 0.005) {
      // Turned off: dark translucent epoxy
      this.bodyMat.color.copy(darkOffColor);
      this.bodyMat.emissive.copy(baseColor);
      this.bodyMat.emissiveIntensity = 0;
      this.bodyMat.opacity = 0.78;

      this.coreMat.color.copy(darkOffColor);
      this.coreMat.emissiveIntensity = 0;

      this.haloMat.opacity = 0;
      this.haloSprite.scale.set(0.01, 0.01, 1);
      this.pointLight.intensity = 0;
    } else {
      const litColor = darkOffColor.clone().lerp(baseColor, 0.35 + norm * 0.65);
      this.bodyMat.color.copy(litColor);
      this.bodyMat.emissive.copy(glowColor);
      this.bodyMat.emissiveIntensity = (0.45 + norm * 3.8) * overloadFactor;
      this.bodyMat.opacity = 0.88 + norm * 0.12;

      this.coreMat.color.setHex(0xffffff);
      this.coreMat.emissive.copy(glowColor);
      this.coreMat.emissiveIntensity = (1.5 + norm * 5.0) * overloadFactor;

      this.haloMat.color.copy(glowColor);
      this.haloMat.opacity = Math.min(0.95, (0.18 + norm * 0.72) * overloadFactor);
      const haloSize = (0.95 + norm * 1.95) * Math.min(1.35, overloadFactor);
      this.haloSprite.scale.set(haloSize, haloSize, 1);

      this.pointLight.color.copy(glowColor);
      this.pointLight.intensity = (0.5 + norm * 4.8) * overloadFactor;
    }
  }
}
