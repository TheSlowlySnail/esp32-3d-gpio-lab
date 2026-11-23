import * as THREE from 'three';
import type { WledEffectId } from '../../engine/types';

export type WledStripProfile = 'compact' | 'medium' | 'long';

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 1) + 1) % 1;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 1 / 6) [r, g, b] = [c, x, 0];
  else if (hue < 2 / 6) [r, g, b] = [x, c, 0];
  else if (hue < 3 / 6) [r, g, b] = [0, c, x];
  else if (hue < 4 / 6) [r, g, b] = [0, x, c];
  else if (hue < 5 / 6) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r + m, g + m, b + m];
}

/**
 * 3D-WS2812B WLED-Streifen in 3 physischen Längenprofilen (Kompakt / Mittel / Lang 5m):
 * - Flexibles weißes/schwarzes FPCB-Trägerband mit goldenen Kupfer-Lötpads
 * - Einzeln adressierbare 5050-SMD-LED-Chips mit Live-WLED-Effekten
 * - Realistische Voltage-Drop-Farbverfärbung (Weiß → Gelb → Rot zum Ende ohne Power Injection)
 * - Daten-Glitches bei fehlendem 330 Ω Datenwiderstand oder 74AHCT125 Pegelwandler
 */
export class WledStripMesh {
  public readonly group = new THREE.Group();
  private readonly ledMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly glowLightStart: THREE.PointLight;
  private readonly glowLightEnd: THREE.PointLight;
  private readonly startPoint: THREE.Vector3;
  private readonly endPoint: THREE.Vector3;

  constructor(profile: WledStripProfile, ledCount: number) {
    this.group.name = `WLED_Strip_${profile}`;

    const curvePoints = this.createPathPoints(profile, ledCount);
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal', 0.4);

    this.startPoint = curve.getPoint(0).clone();
    this.endPoint = curve.getPoint(1).clone();

    // Flexible flat PCB tape extruded along the curve
    const visualSegments = profile === 'compact' ? 14 : profile === 'medium' ? 24 : 36;
    const tapeSamples = visualSegments * 3;
    const tapePoints = curve.getPoints(tapeSamples);

    const tapeShape = new THREE.Shape();
    const halfW = 0.24;
    const halfH = 0.032;
    tapeShape.moveTo(-halfW, -halfH);
    tapeShape.lineTo(halfW, -halfH);
    tapeShape.lineTo(halfW, halfH);
    tapeShape.lineTo(-halfW, halfH);
    tapeShape.closePath();

    // Build flat ribbon geometry manually so tape always lies flat on the desk (y-up)
    const ribbonGeo = this.buildFlatRibbonGeometry(tapePoints, halfW, 0.06);
    const tapeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.45,
      metalness: 0.08,
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeo, tapeMat);
    ribbonMesh.castShadow = true;
    ribbonMesh.receiveShadow = true;
    this.group.add(ribbonMesh);

    // Individual 5050 SMD WS2812B LED chips & copper cut pads along the strip
    const housingMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 });
    const copperPadMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
    });

    const housingGeo = new THREE.BoxGeometry(0.24, 0.09, 0.24);
    const lensGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.05, 14);
    const padGeo = new THREE.BoxGeometry(0.07, 0.015, 0.055);

    for (let i = 0; i < visualSegments; i++) {
      const u = (i + 0.5) / visualSegments;
      const pt = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u).normalize();
      const yaw = Math.atan2(tangent.x, tangent.z);

      const ledNode = new THREE.Group();
      ledNode.position.set(pt.x, pt.y + 0.06, pt.z);
      ledNode.rotation.y = yaw;

      // White 5050 SMD housing
      const housing = new THREE.Mesh(housingGeo, housingMat);
      housing.position.y = 0.045;
      housing.castShadow = true;
      ledNode.add(housing);

      // Emissive RGB die lens inside 5050 housing
      const dieMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.5,
        roughness: 0.18,
      });
      this.ledMaterials.push(dieMat);

      const lens = new THREE.Mesh(lensGeo, dieMat);
      lens.position.y = 0.085;
      ledNode.add(lens);

      // 3 golden copper cut-pads between segments (+5V / DO / GND)
      if (i < visualSegments - 1) {
        const uPad = (i + 1) / visualSegments;
        const pPt = curve.getPointAt(uPad);
        const pTan = curve.getTangentAt(uPad).normalize();
        const padGroup = new THREE.Group();
        padGroup.position.set(pPt.x, pPt.y + 0.065, pPt.z);
        padGroup.rotation.y = Math.atan2(pTan.x, pTan.z);
        for (const ox of [-0.14, 0, 0.14]) {
          const pad = new THREE.Mesh(padGeo, copperPadMat);
          pad.position.x = ox;
          padGroup.add(pad);
        }
        this.group.add(padGroup);
      }

      this.group.add(ledNode);
    }

    // Two PointLights casting real colored glow from the strip onto the desk & breadboard
    this.glowLightStart = new THREE.PointLight(0x22d3ee, 1.5, 6.5, 1.8);
    const pStart = curve.getPointAt(0.22);
    this.glowLightStart.position.set(pStart.x, 0.85, pStart.z);
    this.group.add(this.glowLightStart);

    this.glowLightEnd = new THREE.PointLight(0x22d3ee, 1.5, 6.5, 1.8);
    const pEnd = curve.getPointAt(0.78);
    this.glowLightEnd.position.set(pEnd.x, 0.85, pEnd.z);
    this.group.add(this.glowLightEnd);
  }

  private createPathPoints(profile: WledStripProfile, ledCount: number): THREE.Vector3[] {
    const y = 0.06;
    if (profile === 'compact') {
      // Scales gently with ledCount (8..45 LEDs) along the front of the breadboard
      const t = Math.max(0, Math.min(1, (ledCount - 8) / 37));
      const xEnd = 1.6 + t * 4.4;
      return [
        new THREE.Vector3(-2.1, y, 3.65),
        new THREE.Vector3((-2.1 + xEnd) * 0.5, y, 3.72),
        new THREE.Vector3(xEnd, y, 3.65),
      ];
    }

    if (profile === 'medium') {
      // 2m strip curving along front & right side of the breadboard
      return [
        new THREE.Vector3(-2.2, y, 3.65),
        new THREE.Vector3(2.2, y, 3.75),
        new THREE.Vector3(6.8, y, 3.55),
        new THREE.Vector3(7.65, y, 1.2),
        new THREE.Vector3(7.45, y, -1.8),
      ];
    }

    // 5m long strip: dramatic S-curve wrapping front, right and far-front with visible tail for Power Injection!
    return [
      new THREE.Vector3(-2.4, y, 3.55),
      new THREE.Vector3(2.5, y, 3.65),
      new THREE.Vector3(7.4, y, 3.45),
      new THREE.Vector3(7.85, y, 1.4),
      new THREE.Vector3(7.55, y, -1.7),
      new THREE.Vector3(6.6, y, -3.55),
      new THREE.Vector3(2.2, y, -3.75),
      new THREE.Vector3(-1.4, y, -3.65),
    ];
  }

  private buildFlatRibbonGeometry(
    points: THREE.Vector3[],
    halfWidth: number,
    thickness: number,
  ): THREE.BufferGeometry {
    const positions: number[] = [];
    const indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const tan = new THREE.Vector3().subVectors(next, prev).normalize();
      const side = new THREE.Vector3().crossVectors(up, tan).normalize().multiplyScalar(halfWidth);

      // 4 vertices per ring: top-left, top-right, bottom-left, bottom-right
      const tl = p.clone().add(side).setY(p.y + thickness);
      const tr = p.clone().sub(side).setY(p.y + thickness);
      const bl = p.clone().add(side).setY(p.y);
      const br = p.clone().sub(side).setY(p.y);

      positions.push(tl.x, tl.y, tl.z, tr.x, tr.y, tr.z, bl.x, bl.y, bl.z, br.x, br.y, br.z);

      if (i > 0) {
        const a = (i - 1) * 4;
        const b = i * 4;
        // Top face
        indices.push(a, a + 1, b, a + 1, b + 1, b);
        // Left side
        indices.push(a + 2, a, b + 2, a, b, b + 2);
        // Right side
        indices.push(a + 1, a + 3, b + 1, a + 3, b + 3, b + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  public getStartPosition(): THREE.Vector3 {
    this.group.updateMatrixWorld(true);
    return this.startPoint.clone().applyMatrix4(this.group.matrixWorld);
  }

  public getEndPosition(): THREE.Vector3 {
    this.group.updateMatrixWorld(true);
    return this.endPoint.clone().applyMatrix4(this.group.matrixWorld);
  }

  public updateEffect(
    effect: WledEffectId,
    effectiveBrightnessPct: number,
    voltageDropRatio: number,
    dataGlitch: boolean,
    elapsedSeconds: number,
  ): void {
    const bright = Math.max(0, Math.min(1, effectiveBrightnessPct / 100));
    const count = this.ledMaterials.length;

    let startRgb: [number, number, number] = [0, 0, 0];
    let endRgb: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < count; i++) {
      const frac = count > 1 ? i / (count - 1) : 0;
      let r = 0;
      let g = 0;
      let b = 0;

      if (bright > 0.01) {
        if (effect === 'rainbow') {
          [r, g, b] = hslToRgb(frac - elapsedSeconds * 0.28, 1.0, 0.52);
        } else if (effect === 'solid-white') {
          [r, g, b] = [1.0, 0.98, 0.96];
        } else if (effect === 'chase') {
          const head = (elapsedSeconds * 0.65) % 1;
          const dist = Math.min(Math.abs(frac - head), 1 - Math.abs(frac - head));
          const pulse = Math.max(0, 1 - dist * 7.5);
          [r, g, b] = [0.08 + pulse * 0.15, 0.2 + pulse * 0.8, 0.35 + pulse * 0.65];
        } else if (effect === 'fire') {
          const flicker = 0.55 + 0.45 * Math.sin(elapsedSeconds * 11 + i * 2.1) * Math.cos(elapsedSeconds * 6.5 - i * 1.3);
          r = 1.0;
          g = Math.max(0, flicker * 0.58);
          b = Math.max(0, (flicker - 0.72) * 0.45);
        } else {
          // breathe
          const wave = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(elapsedSeconds * 2.4));
          [r, g, b] = [0.1 * wave, 0.78 * wave, 1.0 * wave];
        }

        // Data-glitch corruption when 330 Ohm resistor or 74AHCT125 Level Shifter is removed!
        if (dataGlitch) {
          const hash = Math.sin(elapsedSeconds * 57 + i * 19.7);
          if (hash > 0.52) {
            [r, g, b] = hslToRgb((hash * 3.7) % 1, 1.0, 0.55);
          } else if (hash < -0.58) {
            [r, g, b] = [0.05, 0.05, 0.05];
          }
        }

        // Authentic WLED Voltage Drop along the strip:
        // Blue (Vf ~3.0V) starves first, then Green (~2.2V), leaving dark yellow-orange/red at the far end!
        if (voltageDropRatio > 0.02) {
          const localDrop = Math.pow(frac, 1.35) * voltageDropRatio;
          b *= Math.max(0.02, 1 - localDrop * 1.45);
          g *= Math.max(0.18, 1 - localDrop * 0.82);
          r *= Math.max(0.45, 1 - localDrop * 0.32);
        }
      }

      const mat = this.ledMaterials[i];
      const col = new THREE.Color(r * bright, g * bright, b * bright);
      if (bright <= 0.01) {
        mat.color.setHex(0x94a3b8);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      } else {
        mat.color.copy(col);
        mat.emissive.copy(col);
        mat.emissiveIntensity = 0.8 + bright * 3.2;
      }

      if (i === Math.floor(count * 0.2)) startRgb = [r, g, b];
      if (i === Math.floor(count * 0.85)) endRgb = [r, g, b];
    }

    this.glowLightStart.color.setRGB(startRgb[0], startRgb[1], startRgb[2]);
    this.glowLightStart.intensity = bright * 2.6;

    this.glowLightEnd.color.setRGB(endRgb[0], endRgb[1], endRgb[2]);
    this.glowLightEnd.intensity = bright * (2.6 - voltageDropRatio * 1.1);
  }
}

/**
 * 74AHCT125 3,3V → 5V Logic-Level-Shifter IC (DIP-14 auf dem Steckbrett).
 */
export class LevelShifterMesh {
  public readonly group = new THREE.Group();

  constructor(centerPos: THREE.Vector3) {
    this.group.name = 'LevelShifter_74AHCT125';
    this.group.position.copy(centerPos);

    // Classic DIP-14 black IC package straddling the breadboard center channel
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#181c24';
      ctx.fillRect(0, 0, 512, 256);
      // Pin-1 notch on left
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(0, 128, 36, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 40px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('74AHCT125N', 270, 112);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 26px JetBrains Mono, monospace';
      ctx.fillText('3.3V -> 5V SHIFTER', 270, 162);
    }
    const topTex = new THREE.CanvasTexture(canvas);
    topTex.colorSpace = THREE.SRGBColorSpace;

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x161922, roughness: 0.5 });
    const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.4 });
    const icBody = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.34, 0.72), [
      sideMat,
      sideMat,
      topMat,
      sideMat,
      sideMat,
      sideMat,
    ]);
    icBody.position.y = 0.32;
    icBody.castShadow = true;
    this.group.add(icBody);

    // 14 metallic DIP legs (7 per side)
    const legMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.88, roughness: 0.22 });
    const legGeo = new THREE.BoxGeometry(0.055, 0.34, 0.04);
    for (let i = 0; i < 7; i++) {
      const lx = -0.78 + i * 0.26;
      for (const lz of [-0.36, 0.36]) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(lx, 0.14, lz);
        this.group.add(leg);
      }
    }
  }
}
