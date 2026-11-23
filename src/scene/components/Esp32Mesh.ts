import * as THREE from 'three';
import type { BoardPinAssignment, EspBoardSpec } from '../../engine/types';

/**
 * Universeller 3D-ESP-Board-Generator für alle 6 ESP-Modelle
 * (ESP32 DevKit V1, C3 SuperMini, S3-Zero Mini, D1 Mini, S3 DevKitC-1, C6 DevKitC-1).
 */
export class Esp32Mesh {
  public readonly group = new THREE.Group();
  public readonly spec: EspBoardSpec;
  private readonly pinLocalPositions = new Map<string, THREE.Vector3>();
  private statusLedMat!: THREE.MeshStandardMaterial;
  private statusLedLight!: THREE.PointLight;

  private readonly pcbHeight = 0.15;
  private readonly pcbElevation = 0.56;

  constructor(spec: EspBoardSpec) {
    this.spec = spec;
    this.group.name = `Board_${spec.id}`;
    this.buildPcb();
    if (spec.family === 'raspberry-pi-sbc') {
      this.buildRaspberryPiSbcHardware();
      this.buildRaspberryPi40PinHeader();
    } else {
      this.buildModuleOrChip();
      this.buildUsbAndButtons();
      this.buildPinHeaders();
    }
    this.buildOnboardLeds();
  }

  private buildPcb(): void {
    const { width, depth, pcbColorHex, accentHex, leftPinLabels, rightPinLabels, isMini, hasCeramicAntenna } =
      this.spec;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = Math.round((depth / width) * 640);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = pcbColorHex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle copper traces
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 3;
      const traceCount = Math.min(10, leftPinLabels.length);
      for (let i = 0; i < traceCount; i++) {
        const y = canvas.height * 0.22 + (i / Math.max(1, traceCount)) * canvas.height * 0.58;
        ctx.beginPath();
        ctx.moveTo(80, y);
        ctx.lineTo(220, y);
        ctx.lineTo(260, y + 18);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width - 80, y);
        ctx.lineTo(canvas.width - 220, y);
        ctx.lineTo(canvas.width - 260, y + 18);
        ctx.stroke();
      }

      // Silkscreen border
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.lineWidth = 5;
      ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

      // Gold PCB meander antenna for non-ceramic ESP boards (skip on Raspberry Pi SBCs & classic Arduinos)
      if (!hasCeramicAntenna && this.spec.family !== 'raspberry-pi-sbc' && this.spec.family !== 'arduino') {
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 10;
        const topY = 44;
        const botY = 128;
        ctx.beginPath();
        ctx.moveTo(190, botY);
        ctx.lineTo(190, topY);
        ctx.lineTo(245, topY);
        ctx.lineTo(245, botY - 18);
        ctx.lineTo(300, botY - 18);
        ctx.lineTo(300, topY);
        ctx.lineTo(355, topY);
        ctx.lineTo(355, botY - 18);
        ctx.lineTo(410, botY - 18);
        ctx.lineTo(410, topY);
        ctx.lineTo(455, topY);
        ctx.stroke();
      }

      // Board silkscreen name near bottom
      ctx.fillStyle = '#e2e8f0';
      ctx.font = isMini ? 'bold 26px JetBrains Mono, monospace' : 'bold 24px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.spec.shortName.toUpperCase(), canvas.width / 2, canvas.height - 155);

      ctx.fillStyle = accentHex;
      ctx.font = '600 17px JetBrains Mono, monospace';
      ctx.fillText(
        this.spec.family === 'raspberry-pi-sbc'
          ? 'LINUX SBC • 40-PIN GPIO'
          : this.spec.family === 'arduino'
            ? this.spec.id === 'arduino-nano-esp32'
              ? 'ARDUINO • 3.3V ESP32-S3'
              : 'ARDUINO • 5V LOGIC'
            : isMini
              ? 'MINI • 3.3V LOGIC'
              : `${this.spec.esphomeVariant} • 3.3V`,
        canvas.width / 2,
        canvas.height - 125,
      );

      // Pin labels along edges (for SBCs both rows sit on right 40-pin header; skip left edge silkscreen)
      if (this.spec.family !== 'raspberry-pi-sbc') {
        const pinFont = isMini ? 'bold 24px JetBrains Mono, monospace' : 'bold 20px JetBrains Mono, monospace';
        ctx.font = pinFont;
        const n = this.spec.pinCountPerSide;
        const padTop = canvas.height * 0.13;
        const padBot = canvas.height * 0.13;
        const span = canvas.height - padTop - padBot;

        leftPinLabels.forEach((pin, idx) => {
          const y = padTop + (n > 1 ? (idx / (n - 1)) * span : span / 2);
          const clean = pin.replace(/[23B]$/, '');
          ctx.fillStyle = clean === '3V3' || clean === '5V' ? '#f87171' : clean === 'GND' ? '#94a3b8' : '#cbd5e1';
          ctx.textAlign = 'left';
          ctx.fillText(clean, 62, y + 7);
        });

        rightPinLabels.forEach((pin, idx) => {
          const y = padTop + (n > 1 ? (idx / (n - 1)) * span : span / 2);
          const clean = pin.replace(/[23B]$/, '');
          ctx.fillStyle = clean === '3V3' || clean === '5V' ? '#f87171' : clean === 'GND' ? '#94a3b8' : '#cbd5e1';
          ctx.textAlign = 'right';
          ctx.fillText(clean, canvas.width - 62, y + 7);
        });
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 22px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText('40-PIN GPIO', canvas.width - 42, 68);
      }
    }

    const pcbTex = new THREE.CanvasTexture(canvas);
    pcbTex.colorSpace = THREE.SRGBColorSpace;
    pcbTex.anisotropy = 8;

    const sideMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(pcbColorHex),
      roughness: 0.65,
      metalness: 0.1,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: pcbTex,
      roughness: 0.45,
      metalness: 0.15,
    });

    const pcbGeo = new THREE.BoxGeometry(width, this.pcbHeight, depth);
    const pcbMesh = new THREE.Mesh(pcbGeo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
    pcbMesh.position.y = this.pcbElevation;
    pcbMesh.castShadow = true;
    pcbMesh.receiveShadow = true;
    this.group.add(pcbMesh);
  }

  private buildModuleOrChip(): void {
    const { width, depth, hasCeramicAntenna, chipLabel, wireless, accentHex } = this.spec;
    const topY = this.pcbElevation + this.pcbHeight / 2;

    if (hasCeramicAntenna) {
      // Compact Mini board: visible QFN black silicon IC + iconic red ceramic Wi-Fi chip antenna at top
      const qfnCanvas = document.createElement('canvas');
      qfnCanvas.width = 256;
      qfnCanvas.height = 256;
      const ctx = qfnCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#181c24';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, 236, 236);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 30px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(chipLabel, 128, 122);
        ctx.fillStyle = accentHex;
        ctx.font = 'bold 20px JetBrains Mono, monospace';
        ctx.fillText('RISC-V / AI', 128, 160);
      }
      const qfnTex = new THREE.CanvasTexture(qfnCanvas);
      qfnTex.colorSpace = THREE.SRGBColorSpace;

      const chipSide = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.4, metalness: 0.2 });
      const chipTop = new THREE.MeshStandardMaterial({ map: qfnTex, roughness: 0.35, metalness: 0.25 });
      const chipGeo = new THREE.BoxGeometry(0.86, 0.14, 0.86);
      const chipMesh = new THREE.Mesh(chipGeo, [chipSide, chipSide, chipTop, chipSide, chipSide, chipSide]);
      chipMesh.position.set(0, topY + 0.07, -0.08);
      chipMesh.castShadow = true;
      this.group.add(chipMesh);

      // Iconic red/terracotta 2.4 GHz ceramic chip antenna at north edge (-z)
      const antMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.18, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xc83e2b, roughness: 0.35, metalness: 0.1 }),
      );
      antMesh.position.set(0, topY + 0.09, -depth / 2 + 0.28);
      antMesh.castShadow = true;
      this.group.add(antMesh);

      // Metallic antenna solder end-caps
      const capMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.88, roughness: 0.2 });
      for (const sx of [-0.36, 0.36]) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.29), capMat);
        cap.position.set(sx, topY + 0.09, -depth / 2 + 0.28);
        this.group.add(cap);
      }
      return;
    }

    // Standard RF Shield Can (ESP-WROOM-32 / ESP32-S3-WROOM-1 / ESP32-C6-WROOM-1)
    const shieldW = Math.min(1.9, width * 0.59);
    const shieldD = Math.min(2.05, depth * 0.37);
    const shieldZ = -depth * 0.15;

    const modSub = new THREE.Mesh(
      new THREE.BoxGeometry(shieldW + 0.16, 0.07, shieldD + 0.65),
      new THREE.MeshStandardMaterial({ color: 0x161d29, roughness: 0.55 }),
    );
    modSub.position.set(0, topY + 0.035, shieldZ - 0.28);
    this.group.add(modSub);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, '#cfd6df');
      grad.addColorStop(0.5, '#b8c2ce');
      grad.addColorStop(1, '#9aa6b5');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      ctx.strokeStyle = 'rgba(51,65,85,0.45)';
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, 472, 472);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 38px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chipLabel, 256, 172);

      ctx.fillStyle = '#334155';
      ctx.font = '600 22px JetBrains Mono, monospace';
      ctx.fillText(wireless, 256, 224);
      ctx.fillText(this.spec.esphomeVariant, 256, 264);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      for (const r of [22, 40, 58]) {
        ctx.beginPath();
        ctx.arc(256, 365, r, -Math.PI * 0.78, -Math.PI * 0.22);
        ctx.stroke();
      }
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(256, 365, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    const shieldTex = new THREE.CanvasTexture(canvas);
    shieldTex.colorSpace = THREE.SRGBColorSpace;
    shieldTex.anisotropy = 8;

    const metalSide = new THREE.MeshStandardMaterial({ color: 0xbac4d0, metalness: 0.78, roughness: 0.28 });
    const metalTop = new THREE.MeshStandardMaterial({ map: shieldTex, metalness: 0.65, roughness: 0.32 });

    const shieldMesh = new THREE.Mesh(new THREE.BoxGeometry(shieldW, 0.32, shieldD), [
      metalSide,
      metalSide,
      metalTop,
      metalSide,
      metalSide,
      metalSide,
    ]);
    shieldMesh.position.set(0, topY + 0.22, shieldZ);
    shieldMesh.castShadow = true;
    shieldMesh.receiveShadow = true;
    this.group.add(shieldMesh);
  }

  private buildUsbAndButtons(): void {
    const { depth, hasDualUsb, isMini } = this.spec;
    const topY = this.pcbElevation + this.pcbHeight / 2;

    const usbMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.86,
      roughness: 0.22,
    });
    const portMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 });

    const usbOffsets = hasDualUsb ? [-0.62, 0.62] : [0];
    const usbW = isMini ? 0.72 : 0.84;

    for (const ux of usbOffsets) {
      const usbMesh = new THREE.Mesh(new THREE.BoxGeometry(usbW, 0.3, 0.62), usbMat);
      usbMesh.position.set(ux, topY + 0.14, depth / 2 - 0.16);
      usbMesh.castShadow = true;
      this.group.add(usbMesh);

      const opening = new THREE.Mesh(new THREE.BoxGeometry(usbW * 0.72, 0.13, 0.05), portMat);
      opening.position.set(ux, topY + 0.14, depth / 2 + 0.14);
      this.group.add(opening);
    }

    // EN / BOOT micro buttons
    const btnBodyMat = new THREE.MeshStandardMaterial({ color: 0xd4dbe3, metalness: 0.55, roughness: 0.35 });
    const btnCapMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const btnX = isMini ? 0.48 : 0.78;
    const btnZ = depth / 2 - (isMini ? 0.62 : 0.75);

    for (const sx of [-btnX, btnX]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.22), btnBodyMat);
      b.position.set(sx, topY + 0.06, btnZ);
      this.group.add(b);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 12), btnCapMat);
      cap.position.set(sx, topY + 0.14, btnZ);
      this.group.add(cap);
    }
  }

    // Register 40-pin GPIO double row along the right edge of Raspberry Pi SBCs
  private buildRaspberryPiSbcHardware(): void {
    const { width, depth, isMini, id, chipLabel } = this.spec;
    const topY = this.pcbElevation + this.pcbHeight / 2;

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.24,
    });
    const darkIcMat = new THREE.MeshStandardMaterial({
      color: 0x161b26,
      roughness: 0.42,
      metalness: 0.15,
    });

    // Main Broadcom SoC Heatspreader / SiP
    const socSize = isMini ? 0.92 : 1.18;
    const socMesh = new THREE.Mesh(new THREE.BoxGeometry(socSize, 0.16, socSize), metalMat);
    socMesh.position.set(isMini ? -0.22 : -0.35, topY + 0.08, -0.55);
    socMesh.castShadow = true;
    this.group.add(socMesh);

    // Wi-Fi RF shield (silver metallic can)
    const wifiCan = new THREE.Mesh(
      new THREE.BoxGeometry(isMini ? 0.65 : 0.86, 0.16, isMini ? 0.72 : 0.95),
      metalMat,
    );
    wifiCan.position.set(isMini ? -0.25 : -1.25, topY + 0.08, -1.75);
    this.group.add(wifiCan);

    // LPDDR4 RAM IC
    if (!isMini) {
      const ram = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.68), darkIcMat);
      ram.position.set(-0.35, topY + 0.06, 0.62);
      this.group.add(ram);

      // Pi 5 RP1 Southbridge chip
      if (id === 'rpi-5') {
        const rp1 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.68), darkIcMat);
        rp1.position.set(0.55, topY + 0.06, 0.75);
        this.group.add(rp1);
      }

      // Iconic south-edge I/O stack: Gigabit Ethernet + USB 3.0 (blue) + USB 2.0 (black)
      const portH = 0.88;
      const portD = 1.15;
      const zPorts = depth / 2 - portD / 2 + 0.18;

      const eth = new THREE.Mesh(new THREE.BoxGeometry(0.96, portH, portD), metalMat);
      eth.position.set(-1.32, topY + portH / 2, zPorts);
      eth.castShadow = true;
      this.group.add(eth);

      const usb3 = new THREE.Mesh(new THREE.BoxGeometry(0.86, portH, portD), metalMat);
      usb3.position.set(-0.18, topY + portH / 2, zPorts);
      usb3.castShadow = true;
      this.group.add(usb3);
      // Blue USB 3.0 tongue
      const usb3Tongue = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.16, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 }),
      );
      usb3Tongue.position.set(-0.18, topY + portH * 0.52, zPorts + portD / 2 + 0.01);
      this.group.add(usb3Tongue);

      const usb2 = new THREE.Mesh(new THREE.BoxGeometry(0.86, portH, portD), metalMat);
      usb2.position.set(0.88, topY + portH / 2, zPorts);
      usb2.castShadow = true;
      this.group.add(usb2);

      // Left-edge USB-C power & Dual Micro-HDMI connectors
      for (const lz of [-1.85, -0.85, 0.05]) {
        const micro = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.52), metalMat);
        micro.position.set(-width / 2 + 0.12, topY + 0.12, lz);
        this.group.add(micro);
      }
    } else {
      // Pi Zero 2 W: Mini-HDMI + 2x Micro-USB along left edge
      for (const lz of [-1.4, 0.35, 1.35]) {
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.48), metalMat);
        port.position.set(-width / 2 + 0.1, topY + 0.11, lz);
        this.group.add(port);
      }
    }

    // 4 Brass corner mounting rings
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.25 });
    for (const sx of [-width / 2 + 0.24, width / 2 - 0.24]) {
      for (const sz of [-depth / 2 + 0.24, depth / 2 - 0.24]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 10, 18), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(sx, topY + 0.015, sz);
        this.group.add(ring);
      }
    }

    // Subtle rubber feet underneath SBC
    const footMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    for (const sx of [-width / 2 + 0.35, width / 2 - 0.35]) {
      for (const sz of [-depth / 2 + 0.35, depth / 2 - 0.35]) {
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.48, 12), footMat);
        foot.position.set(sx, 0.24, sz);
        this.group.add(foot);
      }
    }
    void chipLabel;
  }

  private buildRaspberryPi40PinHeader(): void {
    const { width, depth, leftPinLabels, rightPinLabels } = this.spec;
    const topY = this.pcbElevation + this.pcbHeight / 2;
    const headerHousingMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const goldPinMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.88, roughness: 0.22 });

    const pinCount = 20;
    const zSpan = Math.min(4.2, depth * 0.72);
    const zStart = -zSpan / 2 - (this.spec.isMini ? 0 : 0.35);
    const zStep = zSpan / (pinCount - 1);
    const headerX = width / 2 - 0.32;

    // 2x20 Black shrouded base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, zSpan + 0.22), headerHousingMat);
    base.position.set(headerX, topY + 0.11, zStart + zSpan / 2);
    base.castShadow = true;
    this.group.add(base);

    const pinGeo = new THREE.BoxGeometry(0.055, 0.48, 0.055);
    for (let i = 0; i < pinCount; i++) {
      const z = zStart + i * zStep;
      const xInner = headerX - 0.1;
      const xOuter = headerX + 0.1;

      const pInner = new THREE.Mesh(pinGeo, goldPinMat);
      pInner.position.set(xInner, topY + 0.24, z);
      this.group.add(pInner);

      const pOuter = new THREE.Mesh(pinGeo, goldPinMat);
      pOuter.position.set(xOuter, topY + 0.24, z);
      this.group.add(pOuter);

      const innerLabel = leftPinLabels[i];
      const outerLabel = rightPinLabels[i];

      if (innerLabel) {
        const v = new THREE.Vector3(xInner, topY + 0.42, z);
        this.pinLocalPositions.set(innerLabel, v);
        const clean = innerLabel.replace(/[2345678B]$/, '');
        if (!this.pinLocalPositions.has(clean)) this.pinLocalPositions.set(clean, v.clone());
      }
      if (outerLabel) {
        const v = new THREE.Vector3(xOuter, topY + 0.42, z);
        this.pinLocalPositions.set(outerLabel, v);
        const clean = outerLabel.replace(/[2345678B]$/, '');
        if (!this.pinLocalPositions.has(clean)) this.pinLocalPositions.set(clean, v.clone());
      }
    }
  }

  private buildPinHeaders(): void {
    const { width, depth, pinCountPerSide, leftPinLabels, rightPinLabels } = this.spec;
    const headerHousingMat = new THREE.MeshStandardMaterial({ color: 0x141923, roughness: 0.65 });
    const goldPinMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.25 });

    const edgeInset = 0.18;
    const zSpan = depth * 0.76;
    const zStart = -zSpan / 2;
    const zStep = pinCountPerSide > 1 ? zSpan / (pinCountPerSide - 1) : 0;

    const pinGeo = new THREE.BoxGeometry(0.06, 0.7, 0.06);
    const padGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.02, 12);

    for (const side of ['left', 'right'] as const) {
      const x = side === 'left' ? -(width / 2 - edgeInset) : width / 2 - edgeInset;
      const labels = side === 'left' ? leftPinLabels : rightPinLabels;

      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, zSpan + 0.22),
        headerHousingMat,
      );
      strip.position.set(x, this.pcbElevation - this.pcbHeight / 2 - 0.11, 0);
      strip.castShadow = true;
      this.group.add(strip);

      labels.forEach((label, idx) => {
        const z = zStart + idx * zStep;

        const pinMesh = new THREE.Mesh(pinGeo, goldPinMat);
        pinMesh.position.set(x, this.pcbElevation - 0.12, z);
        this.group.add(pinMesh);

        const padMesh = new THREE.Mesh(padGeo, goldPinMat);
        padMesh.position.set(x, this.pcbElevation + this.pcbHeight / 2 + 0.01, z);
        this.group.add(padMesh);

        const attach = new THREE.Vector3(x, this.pcbElevation + this.pcbHeight / 2 + 0.18, z);
        this.pinLocalPositions.set(label, attach);
        // Also register clean alias if not already taken
        const clean = label.replace(/[23B]$/, '');
        if (!this.pinLocalPositions.has(clean)) {
          this.pinLocalPositions.set(clean, attach.clone());
        }
      });
    }
  }

  private buildOnboardLeds(): void {
    const { depth, isMini, hasRgbOnboardLed } = this.spec;
    const topY = this.pcbElevation + this.pcbHeight / 2;
    const zLed = depth / 2 - (isMini ? 0.85 : 1.05);

    const pwrMat = new THREE.MeshStandardMaterial({
      color: 0xff2a2a,
      emissive: 0xff1e1e,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    const pwrMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.09), pwrMat);
    pwrMesh.position.set(-0.42, topY + 0.04, zLed);
    this.group.add(pwrMesh);

    this.statusLedMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      emissive: hasRgbOnboardLed ? 0x22d3ee : 0x38bdf8,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const statusSize = hasRgbOnboardLed ? 0.2 : 0.14;
    const statusMesh = new THREE.Mesh(
      new THREE.BoxGeometry(statusSize, 0.08, statusSize),
      this.statusLedMat,
    );
    statusMesh.position.set(0.42, topY + 0.04, zLed);
    this.group.add(statusMesh);

    this.statusLedLight = new THREE.PointLight(0x38bdf8, 0, 2.6, 2);
    this.statusLedLight.position.set(0.42, topY + 0.32, zLed);
    this.group.add(this.statusLedLight);
  }

  public setStatusLed(on: boolean, hexColor?: string): void {
    if (on) {
      const col = new THREE.Color(hexColor ?? (this.spec.hasRgbOnboardLed ? this.spec.accentHex : '#38bdf8'));
      this.statusLedMat.color.copy(col);
      this.statusLedMat.emissive.copy(col);
      this.statusLedMat.emissiveIntensity = 3.2;
      this.statusLedLight.color.copy(col);
      this.statusLedLight.intensity = 1.15;
    } else {
      this.statusLedMat.color.setHex(0x1e3a5f);
      this.statusLedMat.emissiveIntensity = 0;
      this.statusLedLight.intensity = 0;
    }
  }

  public getWorldPinPosition(pinLabel: string): THREE.Vector3 {
    const local =
      this.pinLocalPositions.get(pinLabel) ??
      this.pinLocalPositions.get('3V3') ??
      new THREE.Vector3(this.spec.width / 2 - 0.18, 0.85, 0);
    this.group.updateMatrixWorld(true);
    return local.clone().applyMatrix4(this.group.matrixWorld);
  }

  public getWorldRolePin(role: keyof BoardPinAssignment): THREE.Vector3 {
    const label = this.spec.pins[role].label;
    return this.getWorldPinPosition(label);
  }
}
