import * as THREE from 'three';

function createLd2490Texture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // High-frequency Rogers/dark-green radar substrate
    ctx.fillStyle = '#0e3b2e';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(234, 179, 8, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 484, 484);

    // 24 GHz Gold Microstrip Patch Antenna Array (iconic mmWave radar look!)
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 3;

    // 4 vertical columns of gold series-fed patch elements
    const colXs = [92, 188, 324, 420];
    for (const cx of colXs) {
      // Microstrip feed line
      ctx.fillRect(cx - 4, 58, 8, 250);
      // 4 diamond/square patch radiators per column
      for (let r = 0; r < 4; r++) {
        const cy = 84 + r * 62;
        ctx.fillRect(cx - 24, cy - 18, 48, 36);
        ctx.strokeRect(cx - 24, cy - 18, 48, 36);
      }
    }

    // Center RF splitter feed trace
    ctx.fillStyle = '#eab308';
    ctx.fillRect(92, 304, 328, 7);

    // Crisp white silkscreen branding
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 42px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HLK-LD2490', 256, 375);

    ctx.fillStyle = '#5eead4';
    ctx.font = 'bold 24px JetBrains Mono, monospace';
    ctx.fillText('24 GHz mmWave RADAR', 256, 412);

    // 5-Pin Header labels along bottom
    const pins = ['5V', 'GND', 'TX', 'RX', 'OUT'];
    ctx.font = 'bold 22px JetBrains Mono, monospace';
    pins.forEach((label, i) => {
      const px = 96 + i * 80;
      ctx.fillStyle = label === '5V' ? '#fca5a5' : label === 'OUT' ? '#fde047' : '#e2e8f0';
      ctx.fillText(label, px, 474);
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const SHARED_LD2490_TEX = createLd2490Texture();

/**
 * Detailreiches 3D-Modell des HLK-LD2490 24-GHz-mmWave-Präsenz-Radarsensors:
 * - Hochfrequenz-PCB mit goldenen 24-GHz-Patch-Antennen-Arrays
 * - 5-Pin-Steckleiste (5V, GND, TX, RX, OUT)
 * - Status-LED und live animierte 24-GHz-Radar-Erfassungswellen
 */
export class Ld2490Mesh {
  public readonly group = new THREE.Group();
  private readonly pinWorldOffsets: THREE.Vector3[] = [];
  private readonly waveRings: THREE.Mesh[] = [];
  private readonly waveMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly targetMarker: THREE.Mesh;
  private readonly targetMarkerMat: THREE.MeshStandardMaterial;
  private readonly ledMat: THREE.MeshStandardMaterial;
  private readonly ledLight: THREE.PointLight;

  constructor(pinPositions: THREE.Vector3[]) {
    this.group.name = 'LD2490_mmWave_Radar';

    // Anchor center to middle pin (index 2 = TX)
    const center = pinPositions[2].clone();
    this.group.position.copy(center);

    // 5 metallic header pins plunging into breadboard
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.88, roughness: 0.22 });
    const pinGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.52, 10);
    pinPositions.forEach((wp) => {
      const local = wp.clone().sub(center);
      this.pinWorldOffsets.push(local);
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(local.x, 0.22, local.z);
      this.group.add(pin);
    });

    // Black pin header collar
    const headerBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.16, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 }),
    );
    headerBar.position.set(0, 0.36, 0);
    this.group.add(headerBar);

    // Standing HF Radar PCB (slightly angled backward so antenna array is super visible!)
    const boardW = 1.95;
    const boardH = 1.95;
    const boardT = 0.11;

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x0b2d23, roughness: 0.55 });
    const frontMat = new THREE.MeshStandardMaterial({
      map: SHARED_LD2490_TEX,
      roughness: 0.32,
      metalness: 0.25,
    });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x0c3428, roughness: 0.55 });

    const pcbMesh = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardH, boardT), [
      sideMat,
      sideMat,
      sideMat,
      sideMat,
      frontMat, // +z faces user
      backMat,
    ]);
    pcbMesh.position.set(0, 0.44 + boardH / 2, 0);
    pcbMesh.castShadow = true;
    pcbMesh.receiveShadow = true;
    this.group.add(pcbMesh);

    // Rear mmWave ASIC RF shield on back of module
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.75, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.25 }),
    );
    shield.position.set(0, 0.44 + boardH / 2, -0.1);
    this.group.add(shield);

    // Presence indicator SMD LED on the front corner
    this.ledMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), this.ledMat);
    led.position.set(0.72, 0.78, 0.08);
    this.group.add(led);

    this.ledLight = new THREE.PointLight(0x22c55e, 0, 3.0, 2);
    this.ledLight.position.set(0.72, 0.85, 0.35);
    this.group.add(this.ledLight);

    // 3 Concentric animated 24 GHz mmWave propagation arcs extending forward (+z)
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringGeo = new THREE.RingGeometry(0.32, 0.39, 32, 1, -Math.PI * 0.35, Math.PI * 0.7);
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.rotation.z = -Math.PI / 2;
      ring.position.set(0, 1.4, 0.25);
      this.waveMaterials.push(mat);
      this.waveRings.push(ring);
      this.group.add(ring);
    }

    // Subtle holographic target blip floating in front of radar at scaled distance
    this.targetMarkerMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.85,
    });
    this.targetMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 1), this.targetMarkerMat);
    this.targetMarker.position.set(0, 1.4, 1.4);
    this.group.add(this.targetMarker);
  }

  public updateVisuals(
    detected: boolean,
    present: boolean,
    distanceM: number,
    moving: boolean,
    elapsedSeconds: number,
  ): void {
    // Onboard presence LED
    if (detected) {
      this.ledMat.color.setHex(0x4ade80);
      this.ledMat.emissive.setHex(0x22c55e);
      this.ledMat.emissiveIntensity = 3.2;
      this.ledLight.intensity = 1.4;
    } else {
      this.ledMat.color.setHex(0x1e293b);
      this.ledMat.emissiveIntensity = 0;
      this.ledLight.intensity = 0;
    }

    // Animate 24 GHz radar wavefront rings
    const waveColor = detected ? 0x34d399 : 0x38bdf8;
    const speed = moving ? 1.15 : 0.65;
    this.waveRings.forEach((ring, idx) => {
      const phase = (elapsedSeconds * speed + idx / 3) % 1;
      const scale = 0.65 + phase * 3.6;
      ring.scale.set(scale, scale, 1);
      ring.position.z = 0.22 + phase * 1.65;
      const mat = this.waveMaterials[idx];
      mat.color.setHex(waveColor);
      mat.opacity = (1 - phase) * (detected ? 0.58 : 0.26);
    });

    // Position virtual target marker proportionally (0.2m..6m -> z = 0.65..2.5)
    this.targetMarker.visible = present;
    if (present) {
      const normDist = Math.max(0, Math.min(1, distanceM / 6.0));
      const wobbleX = moving ? Math.sin(elapsedSeconds * 3.2) * 0.32 : 0;
      const breathY = Math.sin(elapsedSeconds * 2.1) * 0.04;
      this.targetMarker.position.set(wobbleX, 1.42 + breathY, 0.58 + normDist * 1.9);
      this.targetMarker.rotation.y = elapsedSeconds * (moving ? 2.4 : 0.6);

      const col = detected ? 0x34d399 : 0xf59e0b;
      this.targetMarkerMat.color.setHex(col);
      this.targetMarkerMat.emissive.setHex(col);
      this.targetMarkerMat.emissiveIntensity = detected ? 2.2 : 0.9;
    }
  }
}
