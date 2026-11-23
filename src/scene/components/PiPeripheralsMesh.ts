import * as THREE from 'three';

/**
 * 3D 40mm 5V-Axiallüfter mit rotierendem 7-Blatt-Rotor (für Raspberry Pi PWM-Lüftersteuerung).
 */
export class CoolingFanMesh {
  public readonly group = new THREE.Group();
  private readonly rotorGroup = new THREE.Group();
  private currentSpeedPct = 0;

  constructor(centerPos: THREE.Vector3) {
    this.group.name = 'Cooling_Fan_5V';
    this.group.position.copy(centerPos);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x161b26,
      roughness: 0.5,
      metalness: 0.15,
    });

    // Square outer fan housing (4 edge walls forming hollow air tunnel)
    const size = 2.0;
    const h = 0.56;
    const wall = 0.22;

    const topW = new THREE.Mesh(new THREE.BoxGeometry(size, h, wall), frameMat);
    topW.position.set(0, h / 2 + 0.08, -size / 2 + wall / 2);
    topW.castShadow = true;
    this.group.add(topW);

    const botW = new THREE.Mesh(new THREE.BoxGeometry(size, h, wall), frameMat);
    botW.position.set(0, h / 2 + 0.08, size / 2 - wall / 2);
    botW.castShadow = true;
    this.group.add(botW);

    const leftW = new THREE.Mesh(new THREE.BoxGeometry(wall, h, size - wall * 2), frameMat);
    leftW.position.set(-size / 2 + wall / 2, h / 2 + 0.08, 0);
    leftW.castShadow = true;
    this.group.add(leftW);

    const rightW = new THREE.Mesh(new THREE.BoxGeometry(wall, h, size - wall * 2), frameMat);
    rightW.position.set(size / 2 - wall / 2, h / 2 + 0.08, 0);
    rightW.castShadow = true;
    this.group.add(rightW);

    // Circular shroud ring
    const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.07, 12, 32), frameMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.y = h + 0.06;
    this.group.add(shroud);

    // 7-blade spinning rotor hub
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.25 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.32, 20), hubMat);
    hub.position.y = 0.34;
    this.rotorGroup.add(hub);

    // Subtle Raspberry/Cyan center sticker
    const sticker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.02, 18),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.35 }),
    );
    sticker.position.y = 0.51;
    this.rotorGroup.add(sticker);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.2 });
    const bladeGeo = new THREE.BoxGeometry(0.54, 0.05, 0.22);
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const bladeWrap = new THREE.Group();
      bladeWrap.rotation.y = ang;
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(0.5, 0.34, 0);
      blade.rotation.x = 0.38; // aerodynamic pitch
      bladeWrap.add(blade);
      this.rotorGroup.add(bladeWrap);
    }

    this.group.add(this.rotorGroup);
  }

  public setSpeed(speedPct: number): void {
    this.currentSpeedPct = Math.max(0, Math.min(100, speedPct));
  }

  public update(deltaSeconds: number): void {
    if (this.currentSpeedPct <= 0.5) return;
    // Rotate smoothly up to 24 rad/s at 100 %
    const omega = 2.5 + (this.currentSpeedPct / 100) * 22.0;
    this.rotorGroup.rotation.y -= omega * deltaSeconds;
  }
}

/**
 * 0,96" SSD1306 I²C OLED-Display (128×64 Pixel) mit leuchtendem Gelb/Cyan-Pixelscreen.
 */
export class OledDisplayMesh {
  public readonly group = new THREE.Group();
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly screenTex: THREE.CanvasTexture;
  private readonly screenMat: THREE.MeshStandardMaterial;
  private readonly glowLight: THREE.PointLight;
  private lastKey = '';

  constructor(pinPositions: THREE.Vector3[]) {
    this.group.name = 'SSD1306_OLED_Display';
    const center = new THREE.Vector3();
    pinPositions.forEach((p) => center.add(p));
    center.divideScalar(pinPositions.length);
    this.group.position.copy(center);

    // 4 Header pins
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
    pinPositions.forEach((wp) => {
      const l = wp.clone().sub(center);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.45, 8), pinMat);
      leg.position.set(l.x, 0.18, l.z);
      this.group.add(leg);
    });

    // Blue SSD1306 carrier PCB standing at slight viewing tilt
    const holder = new THREE.Group();
    holder.position.set(0, 1.05, 0.05);
    holder.rotation.x = -0.28; // slightly angled toward user camera for perfect readability!

    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 1.85, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.45, metalness: 0.12 }),
    );
    pcb.castShadow = true;
    holder.add(pcb);

    // Glossy black glass bezel
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 1.32, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.15, metalness: 0.2 }),
    );
    bezel.position.set(0, -0.05, 0.08);
    holder.add(bezel);

    // Live 128x64 OLED Canvas Texture (Yellow top bar + Cyan main region — classic dual-color SSD1306!)
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d');

    this.screenTex = new THREE.CanvasTexture(this.canvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    this.screenTex.anisotropy = 8;

    this.screenMat = new THREE.MeshStandardMaterial({
      map: this.screenTex,
      emissiveMap: this.screenTex,
      emissive: 0xffffff,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 1.04), this.screenMat);
    screenMesh.position.set(0, -0.05, 0.126);
    holder.add(screenMesh);

    this.group.add(holder);

    // Soft cyan OLED light illuminating nearby breadboard holes (amazing in dimmed room!)
    this.glowLight = new THREE.PointLight(0x38bdf8, 0.9, 4.2, 2);
    this.glowLight.position.set(0, 1.1, 0.85);
    this.group.add(this.glowLight);
  }

  public updateScreen(lines: string[], contrastPct: number): void {
    const key = `${lines.join('|')}:${Math.round(contrastPct)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const ctx = this.ctx;
    if (!ctx) return;

    ctx.fillStyle = '#03060c';
    ctx.fillRect(0, 0, 512, 256);

    if (lines.length === 0) {
      this.screenMat.emissiveIntensity = 0;
      this.glowLight.intensity = 0;
      this.screenTex.needsUpdate = true;
      return;
    }

    const norm = Math.max(0.15, Math.min(1, contrastPct / 100));

    // Top yellow header zone (first 16px band of classic SSD1306)
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 34px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(lines[0] ?? '', 24, 48);

    // Thin yellow separator line
    ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.fillRect(20, 66, 472, 3);

    // Lower cyan-blue zone (lines 1..3)
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 31px JetBrains Mono, monospace';
    lines.slice(1, 4).forEach((line, idx) => {
      ctx.fillText(line, 24, 118 + idx * 52);
    });

    this.screenMat.emissiveIntensity = 0.5 + norm * 2.2;
    this.glowLight.intensity = norm * 1.45;
    this.screenTex.needsUpdate = true;
  }
}
