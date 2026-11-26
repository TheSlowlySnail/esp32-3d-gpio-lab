import * as THREE from 'three';
import { getCatalogItem } from '../../sandbox/SandboxEngine';
import type { SandboxPartType } from '../../sandbox/SandboxTypes';

export interface AnimatedSandboxExtra {
  group: THREE.Group;
  update: (active: boolean, powered: boolean, elapsedSeconds: number) => void;
}

function addPins(group: THREE.Group, pins: THREE.Vector3[], center: THREE.Vector3): void {
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ea,
    metalness: 0.92,
    roughness: 0.18,
  });
  const headerMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.55,
    metalness: 0.1,
  });
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.9,
    roughness: 0.2,
  });
  const pinGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.44, 8);
  const sleeveGeo = new THREE.BoxGeometry(0.135, 0.11, 0.135);
  const padGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.025, 10);

  for (const p of pins) {
    const lx = p.x - center.x;
    const lz = p.z - center.z;
    const m = new THREE.Mesh(pinGeo, pinMat);
    m.position.set(lx, 0.18, lz);
    group.add(m);

    // Authentischer schwarzer 2,54mm Stiftleisten-Kunststoffkragen + goldener Lötring
    const sleeve = new THREE.Mesh(sleeveGeo, headerMat);
    sleeve.position.set(lx, 0.27, lz);
    group.add(sleeve);

    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(lx, 0.34, lz);
    group.add(pad);
  }
}

function makeLabelTexture(title: string, bg: string, fg = '#ffffff', sub = ''): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);

  // Feine PCB-Kupfer-Leiterbahnen im Hintergrund
  ctx.strokeStyle = 'rgba(255,255,255,0.11)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const x = 44 + i * 74;
    ctx.beginPath();
    ctx.moveTo(x, 184);
    ctx.lineTo(x, 146);
    ctx.lineTo(x + (i % 2 === 0 ? 20 : -20), 124);
    ctx.lineTo(x + (i % 2 === 0 ? 20 : -20), 26);
    ctx.stroke();
  }

  // Goldene Eck-Montagelöcher (Vias)
  for (const [mx, my] of [
    [22, 22],
    [298, 22],
    [22, 170],
    [298, 170],
  ] as const) {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Goldene Löt-Pads unten
  for (let i = 0; i < 4; i++) {
    const px = 86 + i * 49;
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(px, 174, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Silkscreen-Rahmen
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);

  ctx.fillStyle = fg;
  ctx.font = 'bold 38px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, c.width / 2, sub ? 72 : 96);
  if (sub) {
    ctx.font = 'bold 21px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(sub, c.width / 2, 126);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Baut maßstabsgetreue, sofort erkennbare 3D-Modelle mit Live-Animation
 * für alle erweiterten Sensoren, Aktoren & Spezialbauteile in der Werkbank.
 */
export function createSandboxExtraMesh(
  type: SandboxPartType,
  pins: THREE.Vector3[],
): AnimatedSandboxExtra {
  const group = new THREE.Group();
  const center = new THREE.Vector3();
  for (const p of pins) center.add(p);
  center.divideScalar(Math.max(1, pins.length));
  group.position.set(center.x, center.y, center.z);

  addPins(group, pins, center);

  const statusLedMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x22c55e,
    emissiveIntensity: 0,
    roughness: 0.25,
  });

  switch (type) {
    case 'neopixel-ring': {
      // Schwarzer 8-LED WS2812B Ring auf Ständer
      const ringBase = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.14, 14, 28),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
      );
      ringBase.position.set(0, 0.92, 0);
      ringBase.castShadow = true;
      group.add(ringBase);

      const ledMats: THREE.MeshStandardMaterial[] = [];
      const ledGeo = new THREE.BoxGeometry(0.16, 0.16, 0.08);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const m = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          emissive: 0x000000,
          emissiveIntensity: 0,
          roughness: 0.2,
        });
        ledMats.push(m);
        const px = new THREE.Mesh(ledGeo, m);
        px.position.set(Math.cos(angle) * 0.62, 0.92 + Math.sin(angle) * 0.62, 0.11);
        group.add(px);
      }

      const ringLight = new THREE.PointLight(0xa855f7, 0, 5.5);
      ringLight.position.set(0, 1.0, 0.35);
      group.add(ringLight);

      return {
        group,
        update: (active, _powered, t) => {
          const c = new THREE.Color();
          ledMats.forEach((mat, i) => {
            if (active) {
              c.setHSL((t * 0.35 + i / 8) % 1, 0.95, 0.55);
              mat.emissive.copy(c);
              mat.emissiveIntensity = 2.6;
            } else {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          });
          if (active) {
            c.setHSL((t * 0.35) % 1, 0.9, 0.55);
            ringLight.color.copy(c);
            ringLight.intensity = 1.6;
          } else {
            ringLight.intensity = 0;
          }
        },
      };
    }

    case 'laser-diode': {
      // KY-008 kleine schwarze PCB + Messing-Laser-Kopf + leuchtender 650nm Strahl!
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.45, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45 }),
      );
      pcb.position.set(0, 0.52, 0);
      group.add(pcb);

      const brassHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.48, 16),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 }),
      );
      brassHead.rotation.x = Math.PI / 2;
      brassHead.position.set(0, 0.66, 0.22);
      group.add(brassHead);

      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xff1e2d,
        transparent: true,
        opacity: 0,
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.2, 8), beamMat);
      beam.rotation.x = Math.PI / 2;
      beam.position.set(0, 0.66, 2.55);
      group.add(beam);

      const dotLight = new THREE.PointLight(0xff1122, 0, 3.2);
      dotLight.position.set(0, 0.66, 0.65);
      group.add(dotLight);

      return {
        group,
        update: (active, _powered, t) => {
          beamMat.opacity = active ? 0.78 + Math.sin(t * 18) * 0.12 : 0;
          dotLight.intensity = active ? 1.5 : 0;
        },
      };
    }

    case 'potentiometer': {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.4, 0.78),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38 }),
      );
      body.position.set(0, 0.46, 0);
      body.castShadow = true;
      group.add(body);

      // Metall-Gewindehals + 6-Kant-Mutter
      const metalMat = new THREE.MeshStandardMaterial({ color: 0xd4dbe3, metalness: 0.9, roughness: 0.22 });
      const hexNut = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 6), metalMat);
      hexNut.position.set(0, 0.71, 0);
      group.add(hexNut);

      const shaftGroup = new THREE.Group();
      shaftGroup.position.set(0, 0.76, 0);

      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.27, 0.52, 20),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32 }),
      );
      knob.position.set(0, 0.26, 0);
      knob.castShadow = true;
      shaftGroup.add(knob);

      // Geriffelter Grip-Ring + dunkle Zeiger-Kerbe oben
      const capRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.04, 18),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3 }),
      );
      capRing.position.set(0, 0.53, 0);
      shaftGroup.add(capRing);

      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.055, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x0f172a }),
      );
      marker.position.set(0, 0.555, 0.08);
      shaftGroup.add(marker);

      group.add(shaftGroup);

      return {
        group,
        update: (_active, _powered, t) => {
          shaftGroup.rotation.y = Math.sin(t * 0.9) * 1.1;
        },
      };
    }

    case 'slide-switch': {
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.34, 0.36),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.55, roughness: 0.4 }),
      );
      housing.position.set(0, 0.44, 0);
      group.add(housing);

      const lever = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.34, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
      );
      lever.position.set(-0.18, 0.72, 0);
      group.add(lever);

      return {
        group,
        update: (active) => {
          lever.position.x = active ? -0.18 : 0.18;
        },
      };
    }

    case 'diode-1n4007': {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.95, 14),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 }),
      );
      cyl.rotation.z = Math.PI / 2;
      cyl.position.set(0, 0.42, 0);
      group.add(cyl);

      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.136, 0.136, 0.18, 14),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.25 }),
      );
      band.rotation.z = Math.PI / 2;
      band.position.set(0.32, 0.42, 0);
      group.add(band);

      return { group, update: () => {} };
    }

    case 'dht22': {
      // Ikonisches weißes DHT22 Gehäuse mit echtem Waffel-Lüftungsgitter & oberer Montage-Lasche
      const dc = document.createElement('canvas');
      dc.width = 256;
      dc.height = 320;
      const dctx = dc.getContext('2d')!;
      dctx.fillStyle = '#f1f5f9';
      dctx.fillRect(0, 0, 256, 320);
      dctx.strokeStyle = '#cbd5e1';
      dctx.lineWidth = 8;
      dctx.strokeRect(4, 4, 248, 312);
      // Waffel-Schlitze
      dctx.fillStyle = '#334155';
      for (let r = 0; r < 6; r++) {
        for (let col = 0; col < 5; col++) {
          dctx.fillRect(28 + col * 42, 42 + r * 30, 28, 18);
        }
      }
      dctx.fillStyle = '#0f172a';
      dctx.font = 'bold 34px JetBrains Mono, monospace';
      dctx.textAlign = 'center';
      dctx.fillText('DHT22', 128, 258);
      dctx.fillStyle = '#475569';
      dctx.font = 'bold 18px JetBrains Mono, monospace';
      dctx.fillText('AM2302 · %rF', 128, 290);
      const dhtTex = new THREE.CanvasTexture(dc);
      dhtTex.colorSpace = THREE.SRGBColorSpace;

      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
      const frontMat = new THREE.MeshStandardMaterial({ map: dhtTex, roughness: 0.35 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.25, 0.46), [
        whiteMat,
        whiteMat,
        whiteMat,
        whiteMat,
        frontMat,
        whiteMat,
      ]);
      box.position.set(0, 0.94, 0);
      box.castShadow = true;
      group.add(box);

      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.14), whiteMat);
      ear.position.set(0, 1.66, -0.14);
      group.add(ear);
      const earHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b }),
      );
      earHole.rotation.x = Math.PI / 2;
      earHole.position.set(0, 1.68, -0.14);
      group.add(earHole);

      const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), statusLedMat);
      led.position.set(0.32, 1.44, 0.24);
      group.add(led);

      return {
        group,
        update: (_active, powered) => {
          statusLedMat.emissiveIntensity = powered ? 1.8 : 0;
        },
      };
    }

    case 'pir-hc501': {
      // Grünes PCB + weiße facettierte Fresnel-Kuppel + 2 orange Trimm-Potis (Delay & Sensitivity)
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.24, 0.16, 1.04),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.42 }),
      );
      pcb.position.set(0, 0.42, 0);
      pcb.castShadow = true;
      group.add(pcb);

      // 2 orange Trimm-Potis an der Vorderkante
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
      const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.25 });
      for (const tx of [-0.34, 0.34]) {
        const pot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.24), trimMat);
        pot.position.set(tx, 0.56, 0.38);
        group.add(pot);
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12), silverMat);
        dial.position.set(tx, 0.64, 0.38);
        group.add(dial);
      }

      const domeMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0x22c55e,
        emissiveIntensity: 0,
        roughness: 0.28,
        flatShading: true,
      });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        domeMat,
      );
      dome.position.set(0, 0.5, -0.04);
      group.add(dome);

      return {
        group,
        update: (active, powered, t) => {
          domeMat.emissive.setHex(active ? 0xf59e0b : 0x22c55e);
          domeMat.emissiveIntensity = active ? 0.65 + Math.sin(t * 8) * 0.25 : powered ? 0.12 : 0;
        },
      };
    }

    case 'mq2-gas': {
      // Rotes Modul + silberner Metallgitter-Gaszylinder + blaues LM393 Trimm-Poti
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.32, 0.18, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.42 }),
      );
      pcb.position.set(0, 0.42, 0);
      pcb.castShadow = true;
      group.add(pcb);

      // Feine Metallgitter-Textur für den MQ-2 Zylinder
      const mc = document.createElement('canvas');
      mc.width = 128;
      mc.height = 128;
      const mctx = mc.getContext('2d')!;
      mctx.fillStyle = '#334155';
      mctx.fillRect(0, 0, 128, 128);
      mctx.strokeStyle = '#e2e8f0';
      mctx.lineWidth = 3;
      for (let i = 0; i <= 128; i += 10) {
        mctx.beginPath();
        mctx.moveTo(i, 0);
        mctx.lineTo(i, 128);
        mctx.moveTo(0, i);
        mctx.lineTo(128, i);
        mctx.stroke();
      }
      const mqTex = new THREE.CanvasTexture(mc);
      mqTex.colorSpace = THREE.SRGBColorSpace;

      const ringMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.18 });
      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.12, 22), ringMat);
      baseRing.position.set(-0.14, 0.56, 0);
      group.add(baseRing);

      const meshCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.54, 22),
        new THREE.MeshStandardMaterial({ map: mqTex, metalness: 0.78, roughness: 0.28 }),
      );
      meshCyl.position.set(-0.14, 0.86, 0);
      group.add(meshCyl);

      const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 10, 22), ringMat);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.set(-0.14, 1.13, 0);
      group.add(topRing);

      // Blaues Komparator-Poti rechts auf der Platine
      const pot = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }),
      );
      pot.position.set(0.42, 0.64, 0);
      group.add(pot);

      const heaterGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.36, 12),
        statusLedMat,
      );
      heaterGlow.position.set(-0.14, 0.86, 0);
      group.add(heaterGlow);

      return {
        group,
        update: (active, powered, t) => {
          statusLedMat.emissive.setHex(active ? 0xef4444 : 0xf97316);
          statusLedMat.emissiveIntensity = active
            ? 2.2 + Math.sin(t * 10) * 0.7
            : powered
              ? 0.45
              : 0;
        },
      };
    }

    case 'soil-moisture': {
      // Schwarze Gabel mit 2 langen kapazitiven Sensorelektroden
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.48, 0.16),
        new THREE.MeshStandardMaterial({
          map: makeLabelTexture('SOIL', '#0f172a', '#4ade80', 'v1.2'),
          roughness: 0.4,
        }),
      );
      top.position.set(0, 0.58, 0);
      group.add(top);

      const fork = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 1.15, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 }),
      );
      fork.position.set(0, 1.32, 0);
      group.add(fork);

      const traceMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 0,
      });
      const trace = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.12), traceMat);
      trace.position.set(0, 1.32, 0);
      group.add(trace);

      return {
        group,
        update: (active, powered) => {
          traceMat.emissive.setHex(active ? 0xf59e0b : 0x22c55e);
          traceMat.emissiveIntensity = powered ? (active ? 1.5 : 0.4) : 0;
        },
      };
    }

    case 'mpu6050':
    case 'rfid-rc522':
    case 'touch-ttp223':
    case 'sound-mic':
    case 'hall-sensor':
    case 'rain-sensor': {
      const cfg: Record<
        string,
        { title: string; sub: string; bg: string; w: number; h: number; d: number }
      > = {
        mpu6050: { title: 'MPU6050', sub: '6-DOF GYRO', bg: '#1d4ed8', w: 1.15, h: 0.85, d: 0.18 },
        'rfid-rc522': {
          title: 'RFID 13.56',
          sub: 'RC522 NFC',
          bg: '#1e40af',
          w: 1.35,
          h: 1.45,
          d: 0.16,
        },
        'touch-ttp223': {
          title: 'TOUCH',
          sub: 'TTP223',
          bg: '#be123c',
          w: 0.85,
          h: 0.85,
          d: 0.16,
        },
        'sound-mic': { title: 'MIC', sub: 'KY-037', bg: '#c2410c', w: 0.95, h: 0.72, d: 0.2 },
        'hall-sensor': { title: 'HALL', sub: 'MAGNET', bg: '#0e7490', w: 0.82, h: 0.75, d: 0.16 },
        'rain-sensor': { title: 'RAIN', sub: 'DROPS', bg: '#0369a1', w: 1.05, h: 1.15, d: 0.14 },
      };
      const c = cfg[type];
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(c.w, c.h, c.d),
        new THREE.MeshStandardMaterial({
          map: makeLabelTexture(c.title, c.bg, '#ffffff', c.sub),
          roughness: 0.38,
        }),
      );
      board.position.set(0, 0.35 + c.h / 2, 0);
      board.castShadow = true;
      group.add(board);

      if (type === 'sound-mic') {
        const micCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 0.24, 16),
          new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.85, roughness: 0.2 }),
        );
        micCap.rotation.x = Math.PI / 2;
        micCap.position.set(0, 0.88, 0.18);
        group.add(micCap);
      }

      const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), statusLedMat);
      led.position.set(c.w * 0.32, 0.35 + c.h * 0.8, c.d * 0.6);
      group.add(led);

      return {
        group,
        update: (active, powered, t) => {
          statusLedMat.emissive.setHex(active ? 0x22d3ee : 0x22c55e);
          statusLedMat.emissiveIntensity = active
            ? 2.4 + Math.sin(t * 10) * 0.6
            : powered
              ? 0.55
              : 0;
        },
      };
    }

    case 'seven-seg': {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 192;
      const ctx = canvas.getContext('2d')!;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xff2233,
        emissiveIntensity: 0,
        roughness: 0.25,
      });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.32, 0.32), mat);
      box.position.set(0, 0.98, 0);
      group.add(box);

      let lastDigit = -1;
      return {
        group,
        update: (active, _powered, t) => {
          const digit = active ? Math.floor(t * 1.4) % 10 : -1;
          if (digit !== lastDigit) {
            lastDigit = digit;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 128, 192);
            ctx.fillStyle = active ? '#ff2a3c' : '#263042';
            ctx.font = 'bold 132px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(active ? String(digit) : '8', 64, 102);
            tex.needsUpdate = true;
          }
          mat.emissiveIntensity = active ? 1.85 : 0;
        },
      };
    }

    case 'vib-motor': {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.16, 20),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.88, roughness: 0.22 }),
      );
      disc.position.set(0, 0.52, 0);
      group.add(disc);

      return {
        group,
        update: (active, _powered, t) => {
          disc.position.x = active ? Math.sin(t * 65) * 0.06 : 0;
          disc.position.z = active ? Math.cos(t * 58) * 0.06 : 0;
        },
      };
    }

    default: {
      const def = getCatalogItem(type);
      const meta = def.extraMeta;
      const accent = new THREE.Color(def.accentHex);

      if (!meta) {
        const fallback = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.6, 0.5),
          new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 }),
        );
        fallback.position.set(0, 0.65, 0);
        group.add(fallback);
        return { group, update: () => {} };
      }

      const pcbBg =
        meta.meshStyle === 'actuator-display'
          ? '#0f172a'
          : meta.meshStyle === 'actuator-relay'
            ? '#1e3a8a'
            : meta.meshStyle === 'actuator-motor'
              ? '#1e293b'
              : def.accentHex;
      const tex = makeLabelTexture(meta.badgeTitle, pcbBg, '#ffffff', meta.badgeSub);

      switch (meta.meshStyle) {
        case 'sensor-probe': {
          // Metallische Mess-Sonde / Fühler mit Sechskant-Verschraubung & Edelstahl-Schaft
          const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.88, 0.28, 0.48),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }),
          );
          base.position.set(0, 0.46, 0);
          base.castShadow = true;
          group.add(base);

          const metalMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, metalness: 0.92, roughness: 0.18 });
          const hexNut = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 6), metalMat);
          hexNut.position.set(0, 0.66, 0);
          group.add(hexNut);

          const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.145, 1.12, 18), metalMat);
          probe.position.set(0, 1.2, 0);
          probe.castShadow = true;
          group.add(probe);

          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), statusLedMat);
          tip.position.set(0, 1.76, 0);
          group.add(tip);

          return {
            group,
            update: (active, powered, t) => {
              statusLedMat.emissive.copy(accent);
              statusLedMat.emissiveIntensity = active
                ? 2.0 + Math.sin(t * 7) * 0.5
                : powered
                  ? 0.45
                  : 0;
            },
          };
        }

        case 'sensor-lens': {
          // Optik-/Kamera-/IR-/ToF-Modul mit abgestuftem Objektiv-Tubus & vergütetem Glas
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.16, 0.94, 0.24),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.36 }),
          );
          body.position.set(0, 0.84, 0);
          body.castShadow = true;
          group.add(body);

          const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.3, 0.22, 24),
            new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.72, roughness: 0.25 }),
          );
          barrel.rotation.x = Math.PI / 2;
          barrel.position.set(0, 0.88, 0.17);
          group.add(barrel);

          const glass = new THREE.Mesh(
            new THREE.SphereGeometry(0.21, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshPhysicalMaterial({
              color: 0x0ea5e9,
              metalness: 0.2,
              roughness: 0.06,
              clearcoat: 1.0,
              transmission: 0.4,
            }),
          );
          glass.rotation.x = Math.PI / 2;
          glass.position.set(0, 0.88, 0.25);
          group.add(glass);

          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.036, 10, 24), statusLedMat);
          ring.position.set(0, 0.88, 0.28);
          group.add(ring);

          return {
            group,
            update: (active, powered, t) => {
              statusLedMat.emissive.copy(accent);
              statusLedMat.emissiveIntensity = active
                ? 2.6 + Math.sin(t * 9) * 0.6
                : powered
                  ? 0.5
                  : 0;
            },
          };
        }

        case 'sensor-coil': {
          // Antenne / Stromwandler / Magnetspule mit 3-lagiger Kupfer-Wicklung auf Ferrit-Kern
          const pcb = new THREE.Mesh(
            new THREE.BoxGeometry(1.14, 0.22, 0.88),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }),
          );
          pcb.position.set(0, 0.44, 0);
          pcb.castShadow = true;
          group.add(pcb);

          const copperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
          const coreMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
          const core = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 14, 26), coreMat);
          core.position.set(0, 0.94, 0);
          group.add(core);

          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const turn = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.026, 8, 14), copperMat);
            turn.position.set(Math.cos(ang) * 0.34, 0.94 + Math.sin(ang) * 0.34, 0);
            turn.rotation.z = ang + Math.PI / 2;
            turn.rotation.y = Math.PI / 2;
            group.add(turn);
          }

          const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), statusLedMat);
          led.position.set(0.38, 0.58, 0.28);
          group.add(led);

          return {
            group,
            update: (active, powered, t) => {
              statusLedMat.emissive.copy(accent);
              statusLedMat.emissiveIntensity = active
                ? 2.4 + Math.sin(t * 8) * 0.6
                : powered
                  ? 0.5
                  : 0;
            },
          };
        }

        case 'sensor-pad': {
          // Bedien- & Druck-Element (Joystick / Encoder / Keypad) mit Metall-Basis & geriffelter Kappe
          const pad = new THREE.Mesh(
            new THREE.BoxGeometry(1.08, 0.28, 0.98),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42 }),
          );
          pad.position.set(0, 0.46, 0);
          pad.castShadow = true;
          group.add(pad);

          const collar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.36, 0.12, 18),
            new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.24 }),
          );
          collar.position.set(0, 0.64, 0);
          group.add(collar);

          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.32, 0.38, 22),
            new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3 }),
          );
          cap.position.set(0, 0.86, 0);
          cap.castShadow = true;
          group.add(cap);

          const topDot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 0.04, 18),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
          );
          topDot.position.set(0, 1.07, 0);
          cap.add(topDot);

          return {
            group,
            update: (active, _powered, t) => {
              cap.rotation.y = active ? t * 2.5 : 0;
              cap.position.y = active ? 0.82 + Math.sin(t * 10) * 0.04 : 0.86;
            },
          };
        }

        case 'actuator-motor': {
          // Motor / Pumpe / Schrittmotor mit Kühlrippen, Montage-Flansch & drehendem Rotor-Arm
          const housingMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.78, roughness: 0.26 });
          const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.94, 24), housingMat);
          housing.position.set(0, 0.8, 0);
          housing.castShadow = true;
          group.add(housing);

          // 3 umlaufende Aluminium-Kühlrippen + silberner Deckel-Flansch
          for (const ry of [0.56, 0.8, 1.04]) {
            const fin = new THREE.Mesh(new THREE.TorusGeometry(0.435, 0.028, 8, 24), housingMat);
            fin.rotation.x = Math.PI / 2;
            fin.position.set(0, ry, 0);
            group.add(fin);
          }

          const flange = new THREE.Mesh(
            new THREE.CylinderGeometry(0.45, 0.45, 0.08, 24),
            new THREE.MeshStandardMaterial({ color: 0xd4dbe3, metalness: 0.88, roughness: 0.22 }),
          );
          flange.position.set(0, 1.28, 0);
          group.add(flange);

          const labelBand = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.36, 0.14),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38 }),
          );
          labelBand.position.set(0, 0.8, 0.42);
          group.add(labelBand);

          const rotor = new THREE.Group();
          rotor.position.set(0, 1.36, 0);
          const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.32, 14),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.16 }),
          );
          const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.82, 0.08, 0.18),
            new THREE.MeshStandardMaterial({ color: accent, roughness: 0.28 }),
          );
          arm.position.set(0, 0.13, 0);
          arm.castShadow = true;
          const capScrew = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.09, 0.11, 12),
            new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 }),
          );
          capScrew.position.set(0, 0.15, 0);
          rotor.add(shaft, arm, capScrew);
          group.add(rotor);

          return {
            group,
            update: (active, _powered, t) => {
              if (active) rotor.rotation.y = t * 9.5;
            },
          };
        }

        case 'actuator-display': {
          // Leuchtendes Display / LCD / LED-Matrix / TFT mit geneigtem Rahmen, 4 Gold-Ösen & FPC
          const holder = new THREE.Group();
          holder.position.set(0, 0.92, 0);
          holder.rotation.x = -0.2;

          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(1.62, 1.1, 0.22),
            new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.22, clearcoat: 0.8 }),
          );
          frame.castShadow = true;
          holder.add(frame);

          const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.2 });
          for (const gx of [-0.7, 0.7]) {
            for (const gy of [-0.44, 0.44]) {
              const hole = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.02, 8, 14), goldMat);
              hole.position.set(gx, gy, 0.115);
              holder.add(hole);
            }
          }

          const screenMat = new THREE.MeshStandardMaterial({
            map: tex,
            emissiveMap: tex,
            emissive: accent,
            emissiveIntensity: 0,
            roughness: 0.15,
          });
          const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.84), screenMat);
          screen.position.set(0, 0, 0.118);
          holder.add(screen);
          group.add(holder);

          const screenLight = new THREE.PointLight(accent, 0, 4.2);
          screenLight.position.set(0, 0.95, 0.55);
          group.add(screenLight);

          return {
            group,
            update: (active, powered, t) => {
              screenMat.emissiveIntensity = active
                ? 1.5 + Math.sin(t * 4) * 0.2
                : powered
                  ? 0.25
                  : 0;
              screenLight.intensity = active ? 1.15 : 0;
            },
          };
        }

        case 'actuator-relay': {
          // Relais-Bank / SSR / Motortreiber mit grüner 3-fach-Schraubklemme & Kühlkörper
          const block = new THREE.Mesh(
            new THREE.BoxGeometry(1.28, 0.78, 0.84),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.36 }),
          );
          block.position.set(0, 0.74, 0);
          block.castShadow = true;
          group.add(block);

          // Grüne Schraubklemme oben hinten + 3 silberne Schrauben
          const term = new THREE.Mesh(
            new THREE.BoxGeometry(1.02, 0.28, 0.34),
            new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 }),
          );
          term.position.set(0, 1.24, -0.22);
          group.add(term);

          const screwMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.18 });
          for (const sx of [-0.32, 0, 0.32]) {
            const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 12), screwMat);
            sc.position.set(sx, 1.4, -0.22);
            group.add(sc);
          }

          const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), statusLedMat);
          statusLed.position.set(0.44, 1.16, 0.28);
          group.add(statusLed);

          return {
            group,
            update: (active, powered) => {
              statusLedMat.emissive.setHex(active ? 0x22c55e : 0xef4444);
              statusLedMat.emissiveIntensity = active ? 2.6 : powered ? 0.55 : 0;
            },
          };
        }

        case 'actuator-audio': {
          // Audio / High-Power-Licht / Peltier / Funk mit Metall-Gitterring & Linse
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.78, 0.68),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.36 }),
          );
          box.position.set(0, 0.74, 0);
          box.castShadow = true;
          group.add(box);

          const bezelRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.34, 0.045, 10, 24),
            new THREE.MeshStandardMaterial({ color: 0xd4dbe3, metalness: 0.88, roughness: 0.22 }),
          );
          bezelRing.rotation.x = Math.PI / 2;
          bezelRing.position.set(0, 1.16, 0);
          group.add(bezelRing);

          const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.14, 22), statusLedMat);
          emitter.position.set(0, 1.16, 0);
          group.add(emitter);

          const glowLight = new THREE.PointLight(accent, 0, 4.5);
          glowLight.position.set(0, 1.42, 0.2);
          group.add(glowLight);

          return {
            group,
            update: (active, powered, t) => {
              const pulse = type === 'strobe-flash' ? (Math.sin(t * 28) > 0.3 ? 3.5 : 0.1) : 1.9 + Math.sin(t * 7) * 0.4;
              statusLedMat.emissive.copy(accent);
              statusLedMat.emissiveIntensity = active ? pulse : powered ? 0.25 : 0;
              glowLight.intensity = active ? (type === 'strobe-flash' ? pulse * 0.6 : 1.3) : 0;
            },
          };
        }

        default: {
          // sensor-pcb (Detailreiches Breakout-Board mit SMD-Sensor-IC, MLCC-Kondensatoren & Status-LED)
          const pcb = new THREE.Mesh(
            new THREE.BoxGeometry(1.12, 0.86, 0.18),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.36, metalness: 0.12 }),
          );
          pcb.position.set(0, 0.78, 0);
          pcb.castShadow = true;
          group.add(pcb);

          // Schwarzer QFN Sensor-IC + 2 winzige SMD-Kondensatoren auf der Vorderseite
          const ic = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.28, 0.07),
            new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.2 }),
          );
          ic.position.set(-0.26, 0.94, 0.11);
          group.add(ic);

          const capMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3e, roughness: 0.35 });
          for (const cy of [0.58, 0.68]) {
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.055), capMat);
            cap.position.set(0.34, cy, 0.11);
            group.add(cap);
          }

          const led = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), statusLedMat);
          led.position.set(0.38, 1.04, 0.12);
          group.add(led);

          return {
            group,
            update: (active, powered, t) => {
              statusLedMat.emissive.setHex(active ? 0x22d3ee : 0x22c55e);
              statusLedMat.emissiveIntensity = active
                ? 2.2 + Math.sin(t * 8) * 0.5
                : powered
                  ? 0.55
                  : 0;
            },
          };
        }
      }
    }
  }
}
