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

    // Circular shroud ring + 4 Eck-Schraublöcher + 4 Stator-Streben + Anschlusskabel
    const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.075, 14, 36), frameMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.y = h + 0.06;
    this.group.add(shroud);

    const holeMat = new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.9 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.35 });
    for (const cx of [-size / 2 + 0.16, size / 2 - 0.16]) {
      for (const cz of [-size / 2 + 0.16, size / 2 - 0.16]) {
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, h + 0.04, 14), holeMat);
        bore.position.set(cx, h / 2 + 0.08, cz);
        this.group.add(bore);
        const grommet = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.018, 8, 16), ringMat);
        grommet.rotation.x = Math.PI / 2;
        grommet.position.set(cx, h + 0.085, cz);
        this.group.add(grommet);
      }
    }

    // 4 Stator-Streben unter dem Rotor zur Motor-Nabe
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.055, 0.075), frameMat);
      strut.position.set(Math.cos(ang) * 0.44, 0.14, Math.sin(ang) * 0.44);
      strut.rotation.y = -ang;
      this.group.add(strut);
    }

    // Rot/Schwarzes 5V-Lüfter-Anschlusskabel an der linken Gehäuseseite
    for (const [cz, col] of [
      [-0.08, 0xef4444],
      [0.08, 0x1e293b],
    ] as const) {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.46, 8),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }),
      );
      wire.rotation.z = Math.PI / 2;
      wire.position.set(-size / 2 - 0.18, 0.22, cz);
      this.group.add(wire);
    }

    // 7-blade spinning rotor hub mit detailliertem Typ-Aufkleber
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.32, metalness: 0.28 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.35, 0.34, 24), hubMat);
    hub.position.y = 0.35;
    this.rotorGroup.add(hub);

    const hubCanvas = document.createElement('canvas');
    hubCanvas.width = 256;
    hubCanvas.height = 256;
    const hctx = hubCanvas.getContext('2d');
    if (hctx) {
      hctx.fillStyle = '#0f172a';
      hctx.fillRect(0, 0, 256, 256);
      hctx.strokeStyle = '#38bdf8';
      hctx.lineWidth = 10;
      hctx.beginPath();
      hctx.arc(128, 128, 114, 0, Math.PI * 2);
      hctx.stroke();
      hctx.fillStyle = '#38bdf8';
      hctx.font = 'bold 34px JetBrains Mono, monospace';
      hctx.textAlign = 'center';
      hctx.fillText('5V DC', 128, 112);
      hctx.fillStyle = '#e2e8f0';
      hctx.font = 'bold 22px JetBrains Mono, monospace';
      hctx.fillText('BRUSHLESS', 128, 152);
      hctx.fillStyle = '#94a3b8';
      hctx.font = '600 18px JetBrains Mono, monospace';
      hctx.fillText('0.20A PWM', 128, 184);
    }
    const hubTex = new THREE.CanvasTexture(hubCanvas);
    hubTex.colorSpace = THREE.SRGBColorSpace;

    const sticker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.02, 24),
      new THREE.MeshStandardMaterial({ map: hubTex, roughness: 0.3 }),
    );
    sticker.position.y = 0.53;
    this.rotorGroup.add(sticker);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.34, metalness: 0.22 });
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.26, -0.06);
    bladeShape.quadraticCurveTo(0.56, -0.15, 0.78, -0.05);
    bladeShape.lineTo(0.76, 0.14);
    bladeShape.quadraticCurveTo(0.52, 0.19, 0.26, 0.08);
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.036, bevelEnabled: false });
    bladeGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const bladeWrap = new THREE.Group();
      bladeWrap.rotation.y = ang;
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(0, 0.36, 0);
      blade.rotation.x = 0.42; // aerodynamic pitch
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

    // 4 Header pins mit schwarzer Stiftleisten-Basis
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, metalness: 0.92, roughness: 0.18 });
    const hdrMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55 });
    pinPositions.forEach((wp) => {
      const l = wp.clone().sub(center);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.45, 8), pinMat);
      leg.position.set(l.x, 0.18, l.z);
      this.group.add(leg);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), hdrMat);
      base.position.set(l.x, 0.3, l.z);
      this.group.add(base);
    });

    // Blue SSD1306 carrier PCB standing at slight viewing tilt mit Silkscreen, Eck-Löchern & Kupfer-FPC
    const holder = new THREE.Group();
    holder.position.set(0, 1.05, 0.05);
    holder.rotation.x = -0.28; // slightly angled toward user camera for perfect readability!

    const pcbCanvas = document.createElement('canvas');
    pcbCanvas.width = 512;
    pcbCanvas.height = 400;
    const pctx = pcbCanvas.getContext('2d');
    if (pctx) {
      pctx.fillStyle = '#1e3a8a';
      pctx.fillRect(0, 0, 512, 400);
      pctx.strokeStyle = 'rgba(147,197,253,0.4)';
      pctx.lineWidth = 4;
      pctx.strokeRect(10, 10, 492, 380);
      pctx.fillStyle = '#f8fafc';
      pctx.font = 'bold 22px JetBrains Mono, monospace';
      pctx.textAlign = 'center';
      pctx.fillText('GND   VCC   SCL   SDA', 256, 46);
      // 4 goldene Lötpads oben
      for (const px of [154, 222, 290, 358]) {
        pctx.fillStyle = '#eab308';
        pctx.beginPath();
        pctx.arc(px, 22, 11, 0, Math.PI * 2);
        pctx.fill();
        pctx.fillStyle = '#0f172a';
        pctx.beginPath();
        pctx.arc(px, 22, 5, 0, Math.PI * 2);
        pctx.fill();
      }
      pctx.fillStyle = '#93c5fd';
      pctx.font = 'bold 18px JetBrains Mono, monospace';
      pctx.fillText('0.96" I2C OLED • 0x3C', 256, 376);
    }
    const pcbTex = new THREE.CanvasTexture(pcbCanvas);
    pcbTex.colorSpace = THREE.SRGBColorSpace;
    const pcbSide = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.45 });
    const pcbFront = new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.4, metalness: 0.14 });

    const pcb = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.85, 0.12), [
      pcbSide,
      pcbSide,
      pcbSide,
      pcbSide,
      pcbFront,
      pcbSide,
    ]);
    pcb.castShadow = true;
    holder.add(pcb);

    // 4 goldene Eck-Montagelöcher
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.2 });
    for (const mx of [-0.98, 0.98]) {
      for (const my of [-0.74, 0.74]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 10, 18), goldMat);
        ring.position.set(mx, my, 0.068);
        holder.add(ring);
      }
    }

    // Authentisches kupfer-oranges FPC-Flachbandkabel am unteren Display-Rand
    const fpc = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.22, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.55 }),
    );
    fpc.position.set(0, -0.78, 0.09);
    holder.add(fpc);

    // Glossy black glass bezel
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 1.32, 0.08),
      new THREE.MeshPhysicalMaterial({ color: 0x05080f, roughness: 0.08, metalness: 0.15, clearcoat: 1.0 }),
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
