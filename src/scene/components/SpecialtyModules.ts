import * as THREE from 'three';

function createSoftHaloTex(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 4, cx, cx, cx);
    grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    grad.addColorStop(0.22, 'rgba(255,255,255,0.72)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const HALO_TEX = createSoftHaloTex();

/**
 * 4-Pin Common-Cathode 5mm RGB-LED mit echter Echtzeit-Mischfarbe + PointLight.
 */
export class RgbLedMesh {
  public readonly group = new THREE.Group();
  private readonly bodyMat: THREE.MeshPhysicalMaterial;
  private readonly haloMat: THREE.SpriteMaterial;
  private readonly haloSprite: THREE.Sprite;
  private readonly pointLight: THREE.PointLight;

  constructor(pinPositions: THREE.Vector3[]) {
    this.group.name = 'RGB_LED_5mm';
    const center = new THREE.Vector3();
    pinPositions.forEach((p) => center.add(p));
    center.divideScalar(pinPositions.length);
    this.group.position.copy(center);

    const leadMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.22 });
    const leadGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.78, 8);
    pinPositions.forEach((wp) => {
      const l = wp.clone().sub(center);
      const lead = new THREE.Mesh(leadGeo, leadMat);
      lead.position.set(l.x, 0.34, l.z);
      this.group.add(lead);
    });

    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.22,
      transmission: 0.25,
      transparent: true,
      opacity: 0.92,
      clearcoat: 1.0,
    });

    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 24), this.bodyMat);
    flange.position.y = 0.76;
    this.group.add(flange);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.5, 24), this.bodyMat);
    barrel.position.y = 1.06;
    barrel.castShadow = true;
    this.group.add(barrel);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      this.bodyMat,
    );
    dome.position.y = 1.31;
    this.group.add(dome);

    this.haloMat = new THREE.SpriteMaterial({
      map: HALO_TEX,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloSprite = new THREE.Sprite(this.haloMat);
    this.haloSprite.position.y = 1.22;
    this.group.add(this.haloSprite);

    this.pointLight = new THREE.PointLight(0xffffff, 0, 6.0, 1.7);
    this.pointLight.position.y = 1.3;
    this.group.add(this.pointLight);
  }

  public updateRgb(hex: string, brightnessPercent: number): void {
    const col = new THREE.Color(hex);
    const norm = Math.max(0, Math.min(1, brightnessPercent / 100));
    if (norm <= 0.01) {
      this.bodyMat.color.setHex(0xdbe2ea);
      this.bodyMat.emissiveIntensity = 0;
      this.haloMat.opacity = 0;
      this.haloSprite.scale.set(0.01, 0.01, 1);
      this.pointLight.intensity = 0;
    } else {
      this.bodyMat.color.copy(col);
      this.bodyMat.emissive.copy(col);
      this.bodyMat.emissiveIntensity = 0.6 + norm * 3.6;
      this.haloMat.color.copy(col);
      this.haloMat.opacity = 0.2 + norm * 0.7;
      const sz = 1.0 + norm * 2.1;
      this.haloSprite.scale.set(sz, sz, 1);
      this.pointLight.color.copy(col);
      this.pointLight.intensity = 0.6 + norm * 4.5;
    }
  }
}

/**
 * Zylindrischer Elektrolyt-Kondensator (Elko) mit Lade-Indikatorring.
 */
export class CapacitorMesh {
  public readonly group = new THREE.Group();
  private readonly chargeRingMat: THREE.MeshStandardMaterial;

  constructor(posPin: THREE.Vector3, negPin: THREE.Vector3) {
    this.group.name = 'Electrolytic_Capacitor';
    const mid = new THREE.Vector3().addVectors(posPin, negPin).multiplyScalar(0.5);
    this.group.position.copy(mid);

    const dx = negPin.x - posPin.x;
    const dz = negPin.z - posPin.z;
    const span = Math.hypot(dx, dz);
    this.group.rotation.y = Math.atan2(-dz, dx);

    const leadMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.22 });
    const leadGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.5, 10);
    for (const lx of [-span / 2, span / 2]) {
      const lead = new THREE.Mesh(leadGeo, leadMat);
      lead.position.set(lx, 0.22, 0);
      this.group.add(lead);
    }

    // Blue-black shrink sleeve with silver polarity stripe
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f2744';
      ctx.fillRect(0, 0, 512, 256);
      // Silver negative band on right side
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(380, 0, 72, 256);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 46px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('−', 416, 86);
      ctx.fillText('−', 416, 178);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 34px JetBrains Mono, monospace';
      ctx.fillText('16V LOW-ESR', 190, 118);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px JetBrains Mono, monospace';
      ctx.fillText('RC FILTER', 190, 162);
    }
    const sleeveTex = new THREE.CanvasTexture(canvas);
    sleeveTex.colorSpace = THREE.SRGBColorSpace;

    // Aluminium-Deckel mit eingepresstem K- / Kreuz-Sollbruchstellen-Relief
    const capTopCanvas = document.createElement('canvas');
    capTopCanvas.width = 256;
    capTopCanvas.height = 256;
    const tctx = capTopCanvas.getContext('2d');
    if (tctx) {
      const grad = tctx.createRadialGradient(128, 128, 12, 128, 128, 128);
      grad.addColorStop(0, '#eef2f6');
      grad.addColorStop(0.7, '#cbd5e1');
      grad.addColorStop(1, '#94a3b8');
      tctx.fillStyle = grad;
      tctx.fillRect(0, 0, 256, 256);
      tctx.strokeStyle = '#64748b';
      tctx.lineWidth = 10;
      tctx.beginPath();
      tctx.moveTo(48, 48);
      tctx.lineTo(208, 208);
      tctx.moveTo(208, 48);
      tctx.lineTo(48, 208);
      tctx.stroke();
      tctx.strokeStyle = '#0f2744';
      tctx.lineWidth = 22;
      tctx.beginPath();
      tctx.arc(128, 128, 118, 0, Math.PI * 2);
      tctx.stroke();
    }
    const capTopTex = new THREE.CanvasTexture(capTopCanvas);
    capTopTex.colorSpace = THREE.SRGBColorSpace;

    const topMetal = new THREE.MeshStandardMaterial({ map: capTopTex, metalness: 0.85, roughness: 0.22 });
    const botRubber = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const sleeveMat = new THREE.MeshPhysicalMaterial({
      map: sleeveTex,
      roughness: 0.28,
      metalness: 0.14,
      clearcoat: 0.55,
    });

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.96, 32),
      [sleeveMat, topMetal, botRubber],
    );
    body.position.y = 0.86;
    body.castShadow = true;
    this.group.add(body);

    // Subtle charge level glow ring around cap top
    this.chargeRingMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.032, 12, 28), this.chargeRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.32;
    this.group.add(ring);
  }

  public setChargeRatio(ratio: number): void {
    const r = Math.max(0, Math.min(1, ratio));
    this.chargeRingMat.emissiveIntensity = r * 2.8;
  }
}

/**
 * TO-220 Logic-Level N-Kanal MOSFET (IRLZ44N) mit Kühlfahne und 3 Beinchen (G/D/S).
 */
export class MosfetMesh {
  public readonly group = new THREE.Group();

  constructor(pinPositions: THREE.Vector3[]) {
    this.group.name = 'MOSFET_TO220';
    const center = pinPositions[1].clone();
    this.group.position.copy(center);

    const leadMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, metalness: 0.92, roughness: 0.18 });
    pinPositions.forEach((wp) => {
      const l = wp.clone().sub(center);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.62, 0.032), leadMat);
      leg.position.set(l.x, 0.26, l.z);
      this.group.add(leg);
      // Authentische breite TO-220 Beinchen-Schulter direkt unter dem Epoxid-Gehäuse
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.16, 0.042), leadMat);
      shoulder.position.set(l.x, 0.54, l.z);
      this.group.add(shoulder);
    });

    // Black epoxy TO-220 package mit gelaserter Beschriftung (IRLZ44N · G D S)
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 256;
    faceCanvas.height = 256;
    const fctx = faceCanvas.getContext('2d');
    if (fctx) {
      fctx.fillStyle = '#141821';
      fctx.fillRect(0, 0, 256, 256);
      fctx.strokeStyle = 'rgba(255,255,255,0.08)';
      fctx.lineWidth = 6;
      fctx.strokeRect(8, 8, 240, 240);
      fctx.fillStyle = '#cbd5e1';
      fctx.font = 'bold 34px JetBrains Mono, monospace';
      fctx.textAlign = 'center';
      fctx.fillText('IRLZ44N', 128, 92);
      fctx.fillStyle = '#94a3b8';
      fctx.font = '600 20px JetBrains Mono, monospace';
      fctx.fillText('LOGIC 55V 47A', 128, 136);
      fctx.fillStyle = '#38bdf8';
      fctx.font = 'bold 26px JetBrains Mono, monospace';
      fctx.fillText('G     D     S', 128, 214);
    }
    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x161922, roughness: 0.42, metalness: 0.12 });
    const frontMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.38, metalness: 0.14 });
    const pkg = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.8, 0.36), [
      bodyMat,
      bodyMat,
      bodyMat,
      bodyMat,
      frontMat,
      bodyMat,
    ]);
    pkg.position.set(0, 0.98, 0);
    pkg.castShadow = true;
    this.group.add(pkg);

    // Metallic heatsink tab sticking up at back + beveled top + metallic hole collar
    const tabMat = new THREE.MeshStandardMaterial({ color: 0xd4dbe3, metalness: 0.9, roughness: 0.2 });
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 0.095), tabMat);
    tab.position.set(0, 1.58, -0.12);
    tab.castShadow = true;
    this.group.add(tab);

    const holeRim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.025, 10, 20), tabMat);
    holeRim.position.set(0, 1.63, -0.07);
    this.group.add(holeRim);

    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.115, 18),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 }),
    );
    hole.rotation.x = Math.PI / 2;
    hole.position.set(0, 1.63, -0.12);
    this.group.add(hole);
  }
}

/**
 * GY-BME280 I2C Umweltsensor-Breakout-Platine (lila PCB mit Silkscreen, SMDs & Bosch Metall-Sensor).
 */
export class Bme280Mesh {
  public readonly group = new THREE.Group();
  private readonly actLedMat: THREE.MeshStandardMaterial;

  constructor(pinPositions: THREE.Vector3[]) {
    this.group.name = 'BME280_I2C_Sensor';
    const center = new THREE.Vector3();
    pinPositions.forEach((p) => center.add(p));
    center.divideScalar(pinPositions.length);
    this.group.position.copy(center);

    const pinMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.2 });
    const headerMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    pinPositions.forEach((wp) => {
      const l = wp.clone().sub(center);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 8), pinMat);
      pin.position.set(l.x, 0.2, l.z);
      this.group.add(pin);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), headerMat);
      sleeve.position.set(l.x, 0.34, l.z);
      this.group.add(sleeve);
    });

    // Hochauflösende lila GY-BME280 PCB-Textur mit Silkscreen, Leiterbahnen & Goldpads
    const pcbCanvas = document.createElement('canvas');
    pcbCanvas.width = 256;
    pcbCanvas.height = 256;
    const ctx = pcbCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(216,180,254,0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, 240, 240);
      // Kupfer-Leiterbahnen
      ctx.strokeStyle = 'rgba(168,85,247,0.45)';
      ctx.lineWidth = 5;
      for (const x of [52, 102, 154, 204]) {
        ctx.beginPath();
        ctx.moveTo(x, 224);
        ctx.lineTo(x, 140);
        ctx.lineTo(128, 108);
        ctx.stroke();
        // Gold-Pad
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(x, 226, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(x, 226, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 24px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GY-BME280', 128, 42);
      ctx.font = 'bold 16px JetBrains Mono, monospace';
      ctx.fillText('VCC  GND  SCL  SDA', 128, 200);
    }
    const pcbTex = new THREE.CanvasTexture(pcbCanvas);
    pcbTex.colorSpace = THREE.SRGBColorSpace;
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.45 });
    const topMat = new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.38, metalness: 0.14 });

    const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.12, 1.08), [
      sideMat,
      sideMat,
      topMat,
      sideMat,
      sideMat,
      sideMat,
    ]);
    pcb.position.set(0, 0.46, -0.25);
    pcb.castShadow = true;
    this.group.add(pcb);

    // Metallic Bosch BME280 sensor die with pressure vent hole + 4 SMD Pull-Ups & LDO
    const sensorCan = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.16 }),
    );
    sensorCan.position.set(0, 0.56, -0.35);
    this.group.add(sensorCan);

    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.025, 14),
      new THREE.MeshStandardMaterial({ color: 0x05080f }),
    );
    vent.position.set(0.06, 0.625, -0.35);
    this.group.add(vent);

    const smdDark = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45 });
    const smdCap = new THREE.MeshStandardMaterial({ color: 0x9a6b3e, roughness: 0.35 });
    const ldo = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.16), smdDark);
    ldo.position.set(0.38, 0.55, -0.45);
    this.group.add(ldo);
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.06), i === 0 ? smdCap : smdDark);
      r.position.set(-0.36 + i * 0.18, 0.54, -0.08);
      this.group.add(r);
    }

    this.actLedMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.8,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.08), this.actLedMat);
    led.position.set(-0.42, 0.54, -0.38);
    this.group.add(led);
  }

  public setActive(active: boolean): void {
    this.actLedMat.emissiveIntensity = active ? 3.0 : 0.2;
  }
}

/**
 * HC-SR04 Ultraschallsensor mit zwei silbernen 40-kHz-Transducer-Kapseln & Metallgitter.
 */
export class UltrasonicMesh {
  public readonly group = new THREE.Group();
  private readonly pingRing: THREE.Mesh;
  private readonly pingMat: THREE.MeshBasicMaterial;

  constructor(pinPositions: THREE.Vector3[]) {
    this.group.name = 'HCSR04_Ultrasonic';
    const center = new THREE.Vector3();
    pinPositions.forEach((p) => center.add(p));
    center.divideScalar(pinPositions.length);
    this.group.position.copy(center);

    const pinMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, metalness: 0.9, roughness: 0.2 });
    pinPositions.forEach((wp) => {
      const l = wp.clone().sub(center);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.46, 8), pinMat);
      pin.position.set(l.x, 0.2, l.z);
      this.group.add(pin);
    });

    // Classic blue HC-SR04 standing PCB mit Silkscreen
    const pcbCanvas = document.createElement('canvas');
    pcbCanvas.width = 512;
    pcbCanvas.height = 256;
    const pctx = pcbCanvas.getContext('2d');
    if (pctx) {
      pctx.fillStyle = '#1d4ed8';
      pctx.fillRect(0, 0, 512, 256);
      pctx.strokeStyle = 'rgba(255,255,255,0.45)';
      pctx.lineWidth = 4;
      pctx.strokeRect(10, 10, 492, 236);
      pctx.fillStyle = '#f8fafc';
      pctx.font = 'bold 28px JetBrains Mono, monospace';
      pctx.textAlign = 'center';
      pctx.fillText('HC-SR04', 256, 224);
      pctx.font = 'bold 22px JetBrains Mono, monospace';
      pctx.fillText('T', 68, 224);
      pctx.fillText('R', 444, 224);
      pctx.font = 'bold 16px JetBrains Mono, monospace';
      pctx.fillText('VCC  TRIG  ECHO  GND', 256, 248);
    }
    const pcbTex = new THREE.CanvasTexture(pcbCanvas);
    pcbTex.colorSpace = THREE.SRGBColorSpace;
    const pcbSide = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.45 });
    const pcbFront = new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.4, metalness: 0.12 });

    const pcb = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.24, 0.12), [
      pcbSide,
      pcbSide,
      pcbSide,
      pcbSide,
      pcbFront,
      pcbSide,
    ]);
    pcb.position.set(0, 1.02, 0);
    pcb.castShadow = true;
    this.group.add(pcb);

    // 3 kleine SMD-ICs (MAX232 + LM324) auf der Rückseite des HC-SR04
    const icMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45 });
    for (const ix of [-0.68, 0, 0.68]) {
      const ic = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.08), icMat);
      ic.position.set(ix, 1.02, -0.09);
      this.group.add(ic);
    }

    // Feine Waben-/Gitter-Textur für die beiden 40-kHz-Ultraschallkapseln
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 128;
    gridCanvas.height = 128;
    const gctx = gridCanvas.getContext('2d');
    if (gctx) {
      gctx.fillStyle = '#111827';
      gctx.fillRect(0, 0, 128, 128);
      gctx.strokeStyle = '#94a3b8';
      gctx.lineWidth = 3;
      for (let i = 0; i <= 128; i += 10) {
        gctx.beginPath();
        gctx.moveTo(i, 0);
        gctx.lineTo(i, 128);
        gctx.moveTo(0, i);
        gctx.lineTo(128, i);
        gctx.stroke();
      }
    }
    const gridTex = new THREE.CanvasTexture(gridCanvas);
    gridTex.colorSpace = THREE.SRGBColorSpace;

    const canMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.18 });
    const meshFaceMat = new THREE.MeshStandardMaterial({ map: gridTex, metalness: 0.65, roughness: 0.35 });

    for (const sx of [-0.66, 0.66]) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.62, 28), canMat);
      cyl.rotation.x = Math.PI / 2;
      cyl.position.set(sx, 1.05, 0.34);
      cyl.castShadow = true;
      this.group.add(cyl);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.035, 10, 28), canMat);
      rim.position.set(sx, 1.05, 0.65);
      this.group.add(rim);

      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.03, 24), meshFaceMat);
      face.rotation.x = Math.PI / 2;
      face.position.set(sx, 1.05, 0.64);
      this.group.add(face);
    }

    // Center metallic crystal oscillator
    const xtal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.18), canMat);
    xtal.position.set(0, 1.48, 0.1);
    this.group.add(xtal);

    // Animated ultrasonic ping wave
    this.pingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.pingRing = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 24), this.pingMat);
    this.pingRing.position.set(-0.66, 1.05, 0.8);
    this.group.add(this.pingRing);
  }

  public updateWave(distanceCm: number, elapsedSeconds: number): void {
    const phase = (elapsedSeconds * 1.6) % 1;
    const maxDist = 0.6 + (Math.min(400, distanceCm) / 400) * 1.4;
    this.pingRing.position.z = 0.72 + phase * maxDist;
    const scale = 0.7 + phase * 1.8;
    this.pingRing.scale.set(scale, scale, 1);
    this.pingMat.opacity = (1 - phase) * 0.55;
  }
}

/**
 * 5V Relais-Modul (Songle-Blau) + 1N4007-Freilaufdiode (ein-/ausblendbar) + Kickback-Flash.
 */
export class RelayModuleMesh {
  public readonly group = new THREE.Group();
  private readonly diodeGroup = new THREE.Group();
  private readonly statusLedMat: THREE.MeshStandardMaterial;
  private readonly sparkLight: THREE.PointLight;

  constructor(centerPos: THREE.Vector3) {
    this.group.name = 'Relay_5V_Module';
    this.group.position.copy(centerPos);

    // Classic Songle SRD-05VDC blue relay cube
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 28px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SRD-05VDC', 128, 92);
      ctx.font = 'bold 20px JetBrains Mono, monospace';
      ctx.fillText('10A 250VAC', 128, 134);
      ctx.fillText('5V COIL', 128, 174);
    }
    const topTex = new THREE.CanvasTexture(canvas);
    topTex.colorSpace = THREE.SRGBColorSpace;

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
    const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35 });

    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.12, 1.15), [
      sideMat,
      sideMat,
      topMat,
      sideMat,
      sideMat,
      sideMat,
    ]);
    cube.position.set(-0.22, 0.66, 0);
    cube.castShadow = true;
    this.group.add(cube);

    // Träger-Platine + grüne 3-fach-Schraubklemme (NO / COM / NC) + Optokoppler PC817
    const carrierPcb = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 0.12, 1.52),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.45 }),
    );
    carrierPcb.position.set(0.05, 0.09, 0.05);
    carrierPcb.castShadow = true;
    this.group.add(carrierPcb);

    const terminalMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
    const termBlock = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 1.16), terminalMat);
    termBlock.position.set(0.86, 0.42, 0);
    termBlock.castShadow = true;
    this.group.add(termBlock);

    const screwMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.18 });
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    for (const sz of [-0.34, 0, 0.34]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 14), screwMat);
      screw.position.set(0.86, 0.72, sz);
      this.group.add(screw);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.025), slotMat);
      slot.position.set(0.86, 0.755, sz);
      this.group.add(slot);
    }

    // Optokoppler IC
    const opto = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 }),
    );
    opto.position.set(-0.72, 0.22, 0.56);
    this.group.add(opto);

    // Contact closed indicator LED
    this.statusLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0,
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), this.statusLedMat);
    led.position.set(0.36, 0.22, 0.62);
    this.group.add(led);

    // 1N4007 Flyback diode sitting right in front of the relay coil pins
    const leadMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
    const leadBar = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1.1, 8), leadMat);
    leadBar.rotation.z = Math.PI / 2;
    leadBar.position.set(0, 0.35, 0.82);
    this.diodeGroup.add(leadBar);

    const diodeBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.48, 18),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45 }),
    );
    diodeBody.rotation.z = Math.PI / 2;
    diodeBody.position.set(0, 0.35, 0.82);
    diodeBody.castShadow = true;
    this.diodeGroup.add(diodeBody);

    // Iconic silver cathode stripe on 1N4007
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.135, 0.09, 18),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 }),
    );
    stripe.rotation.z = Math.PI / 2;
    stripe.position.set(-0.14, 0.35, 0.82);
    this.diodeGroup.add(stripe);

    this.group.add(this.diodeGroup);

    // Kickback warning flash light (red/orange spike when diode is missing!)
    this.sparkLight = new THREE.PointLight(0xff4400, 0, 5.0, 1.8);
    this.sparkLight.position.set(0, 1.2, 0.6);
    this.group.add(this.sparkLight);
  }

  public updateState(energized: boolean, flybackPresent: boolean, spikeActive: boolean): void {
    this.diodeGroup.visible = flybackPresent;
    this.statusLedMat.emissiveIntensity = energized ? 3.2 : 0;
    this.sparkLight.intensity = spikeActive ? 7.5 : 0;
  }
}

/**
 * SG90 Mikro-Servo mit live animiertem weißem Servo-Horn (0°–180°).
 */
export class ServoMesh {
  public readonly group = new THREE.Group();
  private readonly hornGroup = new THREE.Group();
  private currentAngleDeg = 90;

  constructor(centerPos: THREE.Vector3) {
    this.group.name = 'SG90_Servo';
    this.group.position.copy(centerPos);

    const blueMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      transmission: 0.35,
      transparent: true,
      opacity: 0.84,
      clearcoat: 0.9,
    });

    // Main rectangular servo body + TowerPro SG90 Seiten-Aufkleber
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 160;
    const sctx = labelCanvas.getContext('2d');
    if (sctx) {
      sctx.fillStyle = '#f8fafc';
      sctx.fillRect(0, 0, 256, 160);
      sctx.fillStyle = '#0284c7';
      sctx.fillRect(0, 0, 256, 48);
      sctx.fillStyle = '#ffffff';
      sctx.font = 'bold 26px Inter, sans-serif';
      sctx.textAlign = 'center';
      sctx.fillText('TowerPro™', 128, 34);
      sctx.fillStyle = '#0f172a';
      sctx.font = 'bold 34px JetBrains Mono, monospace';
      sctx.fillText('SG90 9g', 128, 102);
      sctx.fillStyle = '#475569';
      sctx.font = '600 18px JetBrains Mono, monospace';
      sctx.fillText('Micro Servo 5V', 128, 138);
    }
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.35, 0.92), blueMat);
    body.position.y = 0.72;
    body.castShadow = true;
    this.group.add(body);

    const sticker = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, 0.78),
      new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.35 }),
    );
    sticker.position.set(-0.08, 0.62, 0.466);
    this.group.add(sticker);

    // Sichtbare weiße Nylon-Zahnräder im transluzenten SG90-Getriebekopf!
    const gearMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
    for (const [gx, gy, gr] of [
      [-0.22, 1.24, 0.2],
      [0.12, 1.28, 0.24],
      [0.35, 1.36, 0.28],
    ] as const) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, 0.14, 16), gearMat);
      g.position.set(gx, gy, 0);
      this.group.add(g);
    }

    // 3-adriges Servo-Flachbandkabel (Braun/Rot/Orange) an der linken Seite
    const cableColors = [0x78350f, 0xef4444, 0xf97316];
    cableColors.forEach((c, idx) => {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.55, 8),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }),
      );
      wire.rotation.z = Math.PI / 2;
      wire.position.set(-1.12, 0.24, -0.07 + idx * 0.07);
      this.group.add(wire);
    });

    // Side mounting tabs + Schraub-Löcher
    const tabs = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.14, 0.92), blueMat);
    tabs.position.y = 1.08;
    this.group.add(tabs);

    const holeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    for (const hx of [-1.02, 1.02]) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12), holeMat);
      h.position.set(hx, 1.08, 0);
      this.group.add(h);
    }

    // Cylindrical gearbox turret on top
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.36, 26), blueMat);
    turret.position.set(0.35, 1.52, 0);
    this.group.add(turret);

    // Rotating white servo horn mit 5 authentischen Anlenk-Bohrungen
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 20), whiteMat);
    hub.position.y = 0.08;
    this.hornGroup.add(hub);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.095, 0.22), whiteMat);
    arm.position.set(0.55, 0.1, 0);
    arm.castShadow = true;
    this.hornGroup.add(arm);

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.095, 14), whiteMat);
    tip.position.set(1.18, 0.1, 0);
    this.hornGroup.add(tip);

    for (let i = 0; i < 5; i++) {
      const pinhole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.11, 8), holeMat);
      pinhole.position.set(0.36 + i * 0.19, 0.1, 0);
      this.hornGroup.add(pinhole);
    }

    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.23, 14),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.92, roughness: 0.18 }),
    );
    screw.position.y = 0.1;
    this.hornGroup.add(screw);

    this.hornGroup.position.set(0.35, 1.72, 0);
    this.group.add(this.hornGroup);
  }

  public setAngle(targetDeg: number, deltaSeconds = 0.05): void {
    const step = Math.min(1, deltaSeconds * 12);
    this.currentAngleDeg += (targetDeg - this.currentAngleDeg) * step;
    // Map 0..180° to smooth visual sweep (-90°..+90°)
    const rad = ((this.currentAngleDeg - 90) * Math.PI) / 180;
    this.hornGroup.rotation.y = -rad;
  }
}

/**
 * Passiver Piezo-Buzzer mit animierten Schallwellen-Ringen.
 */
export class BuzzerMesh {
  public readonly group = new THREE.Group();
  private readonly soundRings: THREE.Mesh[] = [];
  private readonly soundMats: THREE.MeshBasicMaterial[] = [];

  constructor(posPin: THREE.Vector3, negPin: THREE.Vector3) {
    this.group.name = 'Piezo_Buzzer';
    const mid = new THREE.Vector3().addVectors(posPin, negPin).multiplyScalar(0.5);
    this.group.position.copy(mid);

    const leadMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
    const span = posPin.distanceTo(negPin);
    for (const lx of [-span / 2, span / 2]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.4, 8), leadMat);
      leg.position.set(lx, 0.15, 0);
      this.group.add(leg);
    }

    // Deckel mit '+'-Polaritäts-Prägung + Sockelring + versenkte Messing-Piezo-Membran
    const bzCanvas = document.createElement('canvas');
    bzCanvas.width = 256;
    bzCanvas.height = 256;
    const bctx = bzCanvas.getContext('2d');
    if (bctx) {
      bctx.fillStyle = '#111827';
      bctx.fillRect(0, 0, 256, 256);
      bctx.strokeStyle = 'rgba(226,232,240,0.3)';
      bctx.lineWidth = 6;
      bctx.beginPath();
      bctx.arc(128, 128, 108, 0, Math.PI * 2);
      bctx.stroke();
      bctx.fillStyle = '#e2e8f0';
      bctx.font = 'bold 46px JetBrains Mono, monospace';
      bctx.textAlign = 'center';
      bctx.fillText('+', 64, 144);
      bctx.font = 'bold 16px JetBrains Mono, monospace';
      bctx.fillStyle = '#94a3b8';
      bctx.fillText('PIEZO 5V', 128, 214);
    }
    const bzTopTex = new THREE.CanvasTexture(bzCanvas);
    bzTopTex.colorSpace = THREE.SRGBColorSpace;
    const bzSideMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.12 });
    const bzTopMat = new THREE.MeshStandardMaterial({ map: bzTopTex, roughness: 0.35, metalness: 0.12 });

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.56, 0.56, 32),
      [bzSideMat, bzTopMat, bzSideMat],
    );
    body.position.y = 0.56;
    body.castShadow = true;
    this.group.add(body);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 10, 22), bzSideMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.855;
    this.group.add(rim);

    // Center acoustic aperture hole with recessed brass piezo disc
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.145, 0.04, 18),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.22 }),
    );
    hole.position.y = 0.84;
    this.group.add(hole);

    // 2 expanding sound wave rings above the piezo
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.38, 28), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.95;
      this.soundMats.push(mat);
      this.soundRings.push(ring);
      this.group.add(ring);
    }
  }

  public updateSound(active: boolean, frequencyHz: number, elapsedSeconds: number): void {
    const rate = 1.2 + (frequencyHz / 4000) * 2.5;
    this.soundRings.forEach((ring, idx) => {
      if (!active) {
        this.soundMats[idx].opacity = 0;
        return;
      }
      const phase = (elapsedSeconds * rate + idx * 0.5) % 1;
      const scale = 0.8 + phase * 2.6;
      ring.scale.set(scale, scale, 1);
      ring.position.y = 0.95 + phase * 1.15;
      this.soundMats[idx].opacity = (1 - phase) * 0.65;
    });
  }
}
