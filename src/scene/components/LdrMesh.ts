import * as THREE from 'three';

function createLdrFaceTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Ceramic off-white base
    ctx.fillStyle = '#e7dfd3';
    ctx.fillRect(0, 0, size, size);

    // Subtle metallic outer ring
    ctx.strokeStyle = '#c4b8a6';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(128, 128, 114, 0, Math.PI * 2);
    ctx.stroke();

    // Iconic red/terracotta CdS serpentine trace
    ctx.strokeStyle = '#b93822';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rows = 5;
    const startY = 58;
    const stepY = 35;
    ctx.beginPath();
    for (let i = 0; i < rows; i++) {
      const y = startY + i * stepY;
      const halfW = i === 0 || i === rows - 1 ? 56 : 78;
      if (i === 0) {
        ctx.moveTo(128 - halfW, y);
        ctx.lineTo(128 + halfW, y);
      } else if (i % 2 === 1) {
        ctx.lineTo(128 + halfW, y);
        ctx.lineTo(128 - halfW, y);
      } else {
        ctx.lineTo(128 - halfW, y);
        ctx.lineTo(128 + halfW, y);
      }
    }
    ctx.stroke();

    // Two solder contact pads at left & right edges
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(46, 128, 13, 0, Math.PI * 2);
    ctx.arc(210, 128, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWarmGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 6, cx, cx, cx);
    grad.addColorStop(0.0, 'rgba(254, 240, 138, 0.95)');
    grad.addColorStop(0.35, 'rgba(253, 224, 71, 0.35)');
    grad.addColorStop(0.7, 'rgba(250, 204, 21, 0.08)');
    grad.addColorStop(1.0, 'rgba(250, 204, 21, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SHARED_LDR_TEX = createLdrFaceTexture();
const SHARED_LDR_GLOW_TEX = createWarmGlowTexture();

/**
 * 3D-Fotowiderstand (LDR GL5528) mit charakteristischer roter CdS-Mäanderbahn
 * und dynamischem Umgebungslicht-Effekt je nach eingestellter Helligkeit.
 */
export class LdrMesh {
  public readonly group = new THREE.Group();
  private readonly ambientGlowLight: THREE.PointLight;
  private readonly sunHaloMat: THREE.SpriteMaterial;
  private readonly sunHaloSprite: THREE.Sprite;

  constructor(pinAPos: THREE.Vector3, pinBPos: THREE.Vector3) {
    this.group.name = 'LDR_Sensor';

    const midpoint = new THREE.Vector3().addVectors(pinAPos, pinBPos).multiplyScalar(0.5);
    this.group.position.copy(midpoint);

    const dx = pinBPos.x - pinAPos.x;
    const dz = pinBPos.z - pinAPos.z;
    const span = Math.hypot(dx, dz);
    this.group.rotation.y = Math.atan2(-dz, dx);

    const leadMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.25,
    });
    const leadGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.72, 10);
    for (const x of [-span / 2, span / 2]) {
      const lead = new THREE.Mesh(leadGeo, leadMat);
      lead.position.set(x, 0.34, 0);
      this.group.add(lead);
    }

    // Ceramic disc head
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xd6cfc2,
      roughness: 0.5,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: SHARED_LDR_TEX,
      roughness: 0.22,
      metalness: 0.05,
    });
    const discGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.14, 28);
    const discMesh = new THREE.Mesh(discGeo, [sideMat, topMat, sideMat]);
    discMesh.position.set(0, 0.72, 0);
    discMesh.castShadow = true;
    this.group.add(discMesh);

    // Clear epoxy coating on top
    const coatMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      transparent: true,
      opacity: 0.28,
      clearcoat: 1.0,
    });
    const coatMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.03, 24), coatMat);
    coatMesh.position.set(0, 0.805, 0);
    this.group.add(coatMesh);

    // Soft warm ambient light halo above the LDR showing simulated light level
    this.sunHaloMat = new THREE.SpriteMaterial({
      map: SHARED_LDR_GLOW_TEX,
      color: 0xfef08a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.sunHaloSprite = new THREE.Sprite(this.sunHaloMat);
    this.sunHaloSprite.position.set(0, 1.35, 0);
    this.sunHaloSprite.scale.set(1.5, 1.5, 1);
    this.group.add(this.sunHaloSprite);

    this.ambientGlowLight = new THREE.PointLight(0xfef08a, 0.8, 3.2, 2);
    this.ambientGlowLight.position.set(0, 1.45, 0);
    this.group.add(this.ambientGlowLight);
  }

  public setLightLevel(percent: number): void {
    const t = Math.max(0, Math.min(1, percent / 100));
    this.sunHaloMat.opacity = t * 0.65;
    const scale = 0.7 + t * 1.4;
    this.sunHaloSprite.scale.set(scale, scale, 1);
    this.ambientGlowLight.intensity = t * 2.4;
  }
}
