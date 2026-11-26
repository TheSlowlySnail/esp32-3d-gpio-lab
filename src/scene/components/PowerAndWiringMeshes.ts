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

    // 5 metallic screw terminals (+V, -V, PE, N, L) mit Kreuzschlitz-Kerbe & isolierenden Trennstegen
    const screwMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.18,
    });
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const dividerMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
    for (let i = 0; i < 5; i++) {
      const z = -0.7 + i * 0.35;
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), screwMat);
      screw.position.set(1.45, 0.58, z);
      this.group.add(screw);
      // Kreuzschlitz
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.025), slotMat);
      s1.position.set(1.45, 0.625, z);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.13), slotMat);
      s2.position.set(1.45, 0.625, z);
      this.group.add(s1, s2);
      if (i < 4) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.04), dividerMat);
        wall.position.set(1.44, 0.54, z + 0.175);
        this.group.add(wall);
      }
    }

    // Gelber Feintrimmer (V-ADJ Potentiometer) neben der DC-OK-LED
    const trimRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }),
    );
    trimRing.position.set(1.18, 1.18, 0.58);
    this.group.add(trimRing);
    const trimSlot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), slotMat);
    trimSlot.position.set(1.18, 1.225, 0.58);
    this.group.add(trimSlot);

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

/**
 * Authentische grüne FR-4 Lochrasterplatine (Perfboard) für den Aufbau OHNE Breadboard:
 * - Zeigt hunderte goldene Kupfer-Lötaugen im 2,54-mm-Raster
 * - Rendert für jedes eingelötete Bauteil-Beinchen / Kabelende einen glänzenden 3D-Lötzinn-Kegel (Fillet)
 * - Zeichnet sichtbare, erhabene silberne 3D-Zinn-Leiterbrücken genau dort, wo Widerstand, LED & Kabel verlötet werden!
 * - Im Modus „Nur Gelötet“ (showBusRails = true) ersetzen zwei verzinnte Kupferschienen (+V & GND) die WAGO-Klemmen.
 */
export class SolderPerfboardMesh {
  public readonly group = new THREE.Group();
  public readonly surfaceY = 0.22;

  private readonly solderMat = new THREE.MeshStandardMaterial({
    color: 0xe8eff7,
    metalness: 0.96,
    roughness: 0.13,
  });
  private readonly goldPadMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.9,
    roughness: 0.22,
  });
  private readonly fluxHaloMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  private readonly coneGeo = new THREE.CylinderGeometry(0.036, 0.105, 0.115, 16);
  private readonly padGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.014, 16);
  private readonly ringGeo = new THREE.RingGeometry(0.115, 0.145, 18);

  constructor(showSolderBusRails: boolean) {
    this.group.name = 'Solder_Perfboard_FR4';
    const width = 9.2;
    const depth = 5.5;
    const thickness = 0.18;

    const canvas = document.createElement('canvas');
    canvas.width = 1840;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Sattes FR-4 Platinengrün mit feiner Glasfaser-Struktur
      const grad = ctx.createLinearGradient(0, 0, 1840, 1100);
      grad.addColorStop(0, '#0f5132');
      grad.addColorStop(0.5, '#0c4329');
      grad.addColorStop(1, '#093722');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1840, 1100);

      // Weißer Silkscreen-Außenrahmen
      ctx.strokeStyle = 'rgba(226, 244, 232, 0.55)';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 1800, 1060);

      // Beschriftung oben
      ctx.fillStyle = '#d1fae5';
      ctx.font = 'bold 26px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        showSolderBusRails
          ? 'FR-4 LOCHRASTER-PLATINE • KOMPLETT GELÖTET (OHNE WAGO)'
          : 'FR-4 LOCHRASTER-PLATINE • WAGO + LÖTVERBINDUNGEN',
        72,
        62,
      );

      ctx.textAlign = 'right';
      ctx.fillStyle = '#fde047';
      ctx.fillText('2,54 mm RASTER • 350 °C BLEIFREI', 1768, 62);

      // Farbige Bus-Markierungen oben & unten wenn ohne WAGO direkt auf Platine verlötet wird
      if (showSolderBusRails) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(90, 146);
        ctx.lineTo(1750, 146);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(90, 82);
        ctx.lineTo(1750, 82);
        ctx.stroke();

        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 26px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('+V LÖTSCHIENE', 96, 178);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('GND LÖTSCHIENE', 96, 114);
      }

      // Hunderte goldene Kupfer-Lötaugen im exakten 30x10-Raster!
      const toX = (lx: number) => ((lx + width / 2) / width) * 1840;
      const toY = (lz: number) => ((lz + depth / 2) / depth) * 1100;
      const rowZs = [-2.35, -2.03, -1.46, -1.16, -0.86, -0.56, -0.26, 0.26, 0.56, 0.86, 1.16, 1.46, 2.03, 2.35];

      for (let col = 1; col <= 30; col++) {
        const lx = (col - 15.5) * 0.28;
        const cx = toX(lx);
        for (const lz of rowZs) {
          const cy = toY(lz);
          // Goldener Kupfer-Ring
          ctx.fillStyle = '#d4a62a';
          ctx.beginPath();
          ctx.arc(cx, cy, 13, 0, Math.PI * 2);
          ctx.fill();
          // Dunkles Bohrloch in der Mitte
          ctx.fillStyle = '#071a11';
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        // Spaltennummern 1, 5, 10, 15, 20, 25, 30
        if (col === 1 || col % 5 === 0) {
          ctx.fillStyle = 'rgba(209, 250, 229, 0.72)';
          ctx.font = 'bold 20px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(col), cx, toY(0) + 6);
        }
      }

      // 4 goldene Eck-Befestigungslöcher
      for (const [ex, ey] of [
        [52, 52],
        [1788, 52],
        [52, 1048],
        [1788, 1048],
      ] as const) {
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(ex, ey, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#06150e';
        ctx.beginPath();
        ctx.arc(ex, ey, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const topTex = new THREE.CanvasTexture(canvas);
    topTex.colorSpace = THREE.SRGBColorSpace;
    topTex.anisotropy = 8;

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x0b3b24,
      roughness: 0.55,
      metalness: 0.1,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.36,
      metalness: 0.22,
    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), [
      sideMat,
      sideMat,
      topMat,
      sideMat,
      sideMat,
      sideMat,
    ]);
    board.position.y = this.surfaceY - thickness / 2;
    board.castShadow = true;
    board.receiveShadow = true;
    this.group.add(board);

    // 4 kleine Messing-Abstandshalter unter den Ecken
    const footMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.88, roughness: 0.22 });
    for (const fx of [-width / 2 + 0.35, width / 2 - 0.35]) {
      for (const fz of [-depth / 2 + 0.35, depth / 2 - 0.35]) {
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), footMat);
        foot.position.set(fx, 0.04, fz);
        this.group.add(foot);
      }
    }

    // Im Modus "Nur Gelötet" (ohne WAGO): zwei durchgehende, glänzend verzinnte 3D-Sammelschienen!
    if (showSolderBusRails) {
      const railGeo = new THREE.CylinderGeometry(0.052, 0.068, width - 0.85, 14);
      railGeo.rotateZ(Math.PI / 2);

      const posRail = new THREE.Mesh(railGeo, this.solderMat);
      posRail.position.set(0, this.surfaceY + 0.032, -2.03);
      posRail.castShadow = true;
      this.group.add(posRail);

      const gndRail = new THREE.Mesh(railGeo, this.solderMat);
      gndRail.position.set(0, this.surfaceY + 0.032, -2.35);
      gndRail.castShadow = true;
      this.group.add(gndRail);
    }
  }

  /**
   * Erzeugt glänzende 3D-Lötzinn-Kegel an jedem Bauteil-/Kabel-Pin sowie eine sichtbare
   * erhabene silberne 3D-Lötbrücke zwischen allen zusammengehörenden Punkten einer Spalte!
   */
  public addSolderNodeGroup(worldPoints: THREE.Vector3[], hoverTag?: (obj: THREE.Object3D) => void): void {
    if (worldPoints.length === 0) return;
    this.group.updateMatrixWorld(true);
    const inv = this.group.matrixWorld.clone().invert();
    const localPts = worldPoints.map((wp) => wp.clone().applyMatrix4(inv));

    const nodeGroup = new THREE.Group();

    // 1. An jedem einzelnen Pin: Goldpad + glänzender Lötzinn-Kegel + dezenter amber Highlight-Ring
    for (const lp of localPts) {
      const pad = new THREE.Mesh(this.padGeo, this.goldPadMat);
      pad.position.set(lp.x, this.surfaceY + 0.008, lp.z);
      nodeGroup.add(pad);

      const cone = new THREE.Mesh(this.coneGeo, this.solderMat);
      cone.position.set(lp.x, this.surfaceY + 0.06, lp.z);
      cone.castShadow = true;
      nodeGroup.add(cone);

      const halo = new THREE.Mesh(this.ringGeo, this.fluxHaloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(lp.x, this.surfaceY + 0.016, lp.z);
      nodeGroup.add(halo);
    }

    // 2. Wenn >= 2 Punkte in dieser Spalte verbunden sind (z.B. Kabel <-> Widerstand <-> LED):
    //    dicke glänzende 3D-Zinn-Leiterbahn (Lötbrücke) quer über alle beteiligten Lötaugen!
    if (localPts.length >= 2) {
      let minZ = Infinity;
      let maxZ = -Infinity;
      let avgX = 0;
      for (const lp of localPts) {
        if (lp.z < minZ) minZ = lp.z;
        if (lp.z > maxZ) maxZ = lp.z;
        avgX += lp.x;
      }
      avgX /= localPts.length;
      const spanZ = maxZ - minZ;
      if (spanZ > 0.04) {
        const bridgeGeo = new THREE.CylinderGeometry(0.056, 0.072, spanZ, 12);
        bridgeGeo.rotateX(Math.PI / 2);
        const bridge = new THREE.Mesh(bridgeGeo, this.solderMat);
        bridge.position.set(avgX, this.surfaceY + 0.036, (minZ + maxZ) / 2);
        bridge.castShadow = true;
        nodeGroup.add(bridge);
      }
    }

    if (hoverTag) {
      hoverTag(nodeGroup);
    }
    this.group.add(nodeGroup);
  }
}
