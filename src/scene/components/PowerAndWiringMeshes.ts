import * as THREE from 'three';
import type { WledPowerSourceId } from '../../engine/types';

function createMeanWellTopTexture(isBatteryMode: boolean, capacityMah: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Brushed aluminum enclosure
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#cfd6df');
    grad.addColorStop(0.5, '#b6c0cc');
    grad.addColorStop(1, '#98a4b3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Classic Mean Well honeycomb/perforated cooling vent holes
    ctx.fillStyle = '#334155';
    for (let y = 36; y <= 230; y += 26) {
      for (let x = 36; x <= 476; x += 28) {
        const offset = ((y / 26) % 2) * 14;
        ctx.beginPath();
        ctx.arc(x + offset * 0.5, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Crisp white/navy technical specification sticker
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(36, 260, 440, 212);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 260, 440, 212);

    // Mean Well branding header bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(36, 260, 440, 56);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 34px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MEAN WELL', 56, 300);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(isBatteryMode ? 'DC-UPS 5V' : 'LRS-50-5', 456, 298);

    // Specs text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px JetBrains Mono, monospace';
    ctx.fillText('OUTPUT: +5V DC · 10A', 56, 354);

    ctx.fillStyle = '#334155';
    ctx.font = '600 19px JetBrains Mono, monospace';
    ctx.fillText(
      isBatteryMode
        ? `AKKU-PACK: ${Math.round(capacityMah / 1000)} Ah Li-Ion`
        : 'INPUT: 100-240VAC 50/60Hz',
      56,
      392,
    );
    ctx.fillStyle = '#0284c7';
    ctx.fillText('WLED HIGH-CURRENT POWER', 56, 434);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * 3D-Modell einer Mean Well 5V-Stromversorgung (LRS-50-5 Netzteil + optionales blaues Li-Ion Akku-Pack
 * mit 4-Segment-Ladezustands-LEDs und Schraubklemmenleiste +V / -V).
 */
export class MeanWellPowerMesh {
  public readonly group = new THREE.Group();
  private readonly batteryGroup = new THREE.Group();
  private readonly socLedMats: THREE.MeshStandardMaterial[] = [];
  private readonly powerLedMat: THREE.MeshStandardMaterial;
  private readonly vPosLocal = new THREE.Vector3(1.48, 0.42, 0.45);
  private readonly gndLocal = new THREE.Vector3(1.48, 0.42, -0.15);

  constructor(mode: WledPowerSourceId, capacityMah: number, socPct: number) {
    this.group.name = 'MeanWell_Power_Supply';
    const isBattery = mode === 'meanwell-battery';

    // Metallic perforated Mean Well enclosure
    const topTex = createMeanWellTopTexture(isBattery, capacityMah);
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xbac4d0,
      metalness: 0.78,
      roughness: 0.3,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      metalness: 0.45,
      roughness: 0.35,
    });

    const box = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.15, 2.35), [
      sideMat,
      sideMat,
      topMat,
      sideMat,
      sideMat,
      sideMat,
    ]);
    box.position.set(0, 0.575, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    this.group.add(box);

    // Black screw terminal strip on the right edge (+x facing breadboard)
    const termBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.48, 1.95),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 }),
    );
    termBlock.position.set(1.42, 0.32, 0);
    termBlock.castShadow = true;
    this.group.add(termBlock);

    // 5 metallic screw terminals (+V, -V, PE, N, L)
    const screwMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
    });
    for (let i = 0; i < 5; i++) {
      const z = -0.7 + i * 0.35;
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 14), screwMat);
      screw.position.set(1.45, 0.58, z);
      this.group.add(screw);
    }

    // Green DC OK power LED
    this.powerLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 2.8,
    });
    const pwrLed = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), this.powerLedMat);
    pwrLed.position.set(1.18, 1.18, 0.88);
    this.group.add(pwrLed);

    // Attached blue Li-Ion / LiFePO4 Battery Pack mounted behind/beside Mean Well DC-UPS
    this.buildBatteryPack();
    this.batteryGroup.visible = isBattery;
    this.group.add(this.batteryGroup);

    this.updateBatteryVisuals(socPct, true);
  }

  private buildBatteryPack(): void {
    // Blue shrink-wrapped 3S/1P 18650 Li-Ion pack look
    const cellMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.32,
      metalness: 0.12,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
    });

    // 3 visible cylindrical 18650 cells wrapped tightly together
    for (let i = 0; i < 3; i++) {
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.35, 22), cellMat);
      cell.rotation.z = Math.PI / 2;
      cell.position.set(0, 0.36, -1.55 - i * 0.6);
      cell.castShadow = true;
      this.batteryGroup.add(cell);
    }

    // End protective caps on battery pack
    for (const sx of [-1.22, 1.22]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.68, 1.88), capMat);
      cap.position.set(sx, 0.36, -2.15);
      this.batteryGroup.add(cap);
    }

    // BMS top plate with 4-LED State-of-Charge bar
    const bmsPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
    );
    bmsPlate.position.set(0, 0.72, -2.15);
    this.batteryGroup.add(bmsPlate);

    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 2.2,
      });
      this.socLedMats.push(mat);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.16), mat);
      led.position.set(-0.45 + i * 0.3, 0.78, -2.15);
      this.batteryGroup.add(led);
    }
  }

  public updateBatteryVisuals(socPct: number, powered: boolean): void {
    this.powerLedMat.emissiveIntensity = powered ? 2.8 : 0;
    const activeBars = powered ? Math.ceil((Math.max(0, Math.min(100, socPct)) / 100) * 4) : 0;
    this.socLedMats.forEach((mat, idx) => {
      const lit = idx < activeBars;
      const col = socPct <= 25 ? 0xef4444 : socPct <= 50 ? 0xf59e0b : 0x22c55e;
      mat.color.setHex(lit ? col : 0x1e293b);
      mat.emissive.setHex(col);
      mat.emissiveIntensity = lit ? 2.6 : 0;
    });
  }

  public getVPosWorld(): THREE.Vector3 {
    this.group.updateMatrixWorld(true);
    return this.vPosLocal.clone().applyMatrix4(this.group.matrixWorld);
  }

  public getGndWorld(): THREE.Vector3 {
    this.group.updateMatrixWorld(true);
    return this.gndLocal.clone().applyMatrix4(this.group.matrixWorld);
  }
}

/**
 * Authentische 3D WAGO 221-415 Hebelklemme (für den Aufbau OHNE Breadboard):
 * Transluzentes Gehäuse, kupferfarbene Stromschiene und 5 markante orange Hebel.
 */
export class WagoClampMesh {
  public readonly group = new THREE.Group();
  private readonly portLocals: THREE.Vector3[] = [];

  constructor(labelColorHex: number, ports = 5) {
    this.group.name = 'WAGO_221_Clamp';

    const width = ports * 0.34 + 0.22;
    const height = 0.44;
    const depth = 0.82;

    // Clear polycarbonate WAGO housing
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      transmission: 0.52,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1.0,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    this.group.add(body);

    // Internal copper busbar visible through clear housing
    const copperBar = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.18, 0.08, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.88, roughness: 0.25 }),
    );
    copperBar.position.set(0, 0.14, 0.06);
    this.group.add(copperBar);

    // Color-coded base accent strip (Red = +V, Black = GND)
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.04, 0.06, 0.14),
      new THREE.MeshStandardMaterial({ color: labelColorHex, roughness: 0.45 }),
    );
    accent.position.set(0, 0.04, -depth / 2 + 0.08);
    this.group.add(accent);

    // Iconic WAGO bright orange clamping levers
    const leverMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.35,
      metalness: 0.05,
    });
    const leverGeo = new THREE.BoxGeometry(0.24, 0.11, 0.56);

    for (let i = 0; i < ports; i++) {
      const x = -((ports - 1) * 0.34) / 2 + i * 0.34;
      const lever = new THREE.Mesh(leverGeo, leverMat);
      lever.position.set(x, height + 0.04, -0.05);
      lever.castShadow = true;
      this.group.add(lever);

      // Wire insertion point at front edge (+z)
      this.portLocals.push(new THREE.Vector3(x, 0.22, depth / 2 - 0.04));
    }
  }

  public getPortWorld(index: number): THREE.Vector3 {
    const safeIdx = Math.max(0, Math.min(this.portLocals.length - 1, index));
    this.group.updateMatrixWorld(true);
    return this.portLocals[safeIdx].clone().applyMatrix4(this.group.matrixWorld);
  }
}
