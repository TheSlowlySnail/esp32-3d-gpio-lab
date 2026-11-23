import * as THREE from 'three';
import { getCatalogItem } from '../../sandbox/SandboxEngine';
import type { SandboxPartType } from '../../sandbox/SandboxTypes';

export interface AnimatedSandboxExtra {
  group: THREE.Group;
  update: (active: boolean, powered: boolean, elapsedSeconds: number) => void;
}

function addPins(group: THREE.Group, pins: THREE.Vector3[], center: THREE.Vector3): void {
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.85,
    roughness: 0.25,
  });
  const pinGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.42, 8);
  for (const p of pins) {
    const m = new THREE.Mesh(pinGeo, pinMat);
    m.position.set(p.x - center.x, 0.18, p.z - center.z);
    group.add(m);
  }
}

function makeLabelTexture(title: string, bg: string, fg = '#ffffff', sub = ''): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 246, 118);
  ctx.fillStyle = fg;
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 128, sub ? 48 : 64);
  if (sub) {
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText(sub, 128, 92);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
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
        new THREE.BoxGeometry(0.76, 0.42, 0.76),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }),
      );
      body.position.set(0, 0.46, 0);
      group.add(body);

      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.26, 0.55, 18),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
      );
      knob.position.set(0, 0.92, 0);
      group.add(knob);

      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x0f172a }),
      );
      marker.position.set(0, 1.21, 0.08);
      knob.add(marker);

      return {
        group,
        update: (_active, _powered, t) => {
          knob.rotation.y = Math.sin(t * 0.9) * 1.1;
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
      // Ikonisches weißes DHT22 Waffelgehäuse
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 1.25, 0.46),
        new THREE.MeshStandardMaterial({
          map: makeLabelTexture('DHT22', '#f1f5f9', '#0f172a', 'TEMP · %rF'),
          roughness: 0.35,
        }),
      );
      box.position.set(0, 0.94, 0);
      box.castShadow = true;
      group.add(box);

      const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), statusLedMat);
      led.position.set(0.32, 1.4, 0.24);
      group.add(led);

      return {
        group,
        update: (_active, powered) => {
          statusLedMat.emissiveIntensity = powered ? 1.8 : 0;
        },
      };
    }

    case 'pir-hc501': {
      // Grünes PCB + weiße halbkugelige Fresnel-Kuppel
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.16, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45 }),
      );
      pcb.position.set(0, 0.42, 0);
      group.add(pcb);

      const domeMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0x22c55e,
        emissiveIntensity: 0,
        roughness: 0.32,
        flatShading: true,
      });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        domeMat,
      );
      dome.position.set(0, 0.5, 0);
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
      // Rotes Modul + silberner Metallgitter-Gaszylinder
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.18, 0.85),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 }),
      );
      pcb.position.set(0, 0.42, 0);
      group.add(pcb);

      const meshCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.56, 18),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.82, roughness: 0.32 }),
      );
      meshCyl.position.set(0, 0.78, 0);
      group.add(meshCyl);

      const heaterGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.36, 12),
        statusLedMat,
      );
      heaterGlow.position.set(0, 0.82, 0);
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
          // Metallische Mess-Sonde / Fühler auf kleinem Breakout-Sockel
          const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.82, 0.28, 0.45),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }),
          );
          base.position.set(0, 0.44, 0);
          group.add(base);

          const probe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 1.15, 16),
            new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.88, roughness: 0.2 }),
          );
          probe.position.set(0, 1.12, 0);
          group.add(probe);

          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), statusLedMat);
          tip.position.set(0, 1.7, 0);
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
          // Optik-/Kamera-/IR-/ToF-/Fingerprint-Modul mit dunkler Linse + LED-Ring
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.12, 0.92, 0.24),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }),
          );
          body.position.set(0, 0.82, 0);
          body.castShadow = true;
          group.add(body);

          const lens = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.28, 0.22, 20),
            new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.12 }),
          );
          lens.rotation.x = Math.PI / 2;
          lens.position.set(0, 0.88, 0.16);
          group.add(lens);

          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 10, 22), statusLedMat);
          ring.position.set(0, 0.88, 0.26);
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
          // Antenne / Stromwandler / Magnetspule (Kupfer/Keramik)
          const pcb = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.22, 0.85),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42 }),
          );
          pcb.position.set(0, 0.42, 0);
          group.add(pcb);

          const coil = new THREE.Mesh(
            new THREE.TorusGeometry(0.34, 0.1, 12, 24),
            new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.82, roughness: 0.25 }),
          );
          coil.position.set(0, 0.92, 0);
          group.add(coil);

          const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), statusLedMat);
          led.position.set(0.38, 0.56, 0.26);
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
          // Bedien- & Druck-Element (Joystick / Encoder / Keypad / FSR-Pad)
          const pad = new THREE.Mesh(
            new THREE.BoxGeometry(1.05, 0.28, 0.95),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }),
          );
          pad.position.set(0, 0.46, 0);
          group.add(pad);

          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.34, 0.42, 18),
            new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35 }),
          );
          cap.position.set(0, 0.8, 0);
          group.add(cap);

          return {
            group,
            update: (active, _powered, t) => {
              cap.rotation.y = active ? t * 2.5 : 0;
              cap.position.y = active ? 0.76 + Math.sin(t * 10) * 0.04 : 0.8;
            },
          };
        }

        case 'actuator-motor': {
          // Motor / Pumpe / Schrittmotor / Linearaktor mit drehender Welle!
          const housing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.92, 20),
            new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.72, roughness: 0.3 }),
          );
          housing.position.set(0, 0.78, 0);
          housing.castShadow = true;
          group.add(housing);

          const labelBand = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.34, 0.14),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }),
          );
          labelBand.position.set(0, 0.78, 0.42);
          group.add(labelBand);

          const rotor = new THREE.Group();
          rotor.position.set(0, 1.32, 0);
          const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 }),
          );
          const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.76, 0.08, 0.16),
            new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3 }),
          );
          arm.position.set(0, 0.12, 0);
          rotor.add(shaft, arm);
          group.add(rotor);

          return {
            group,
            update: (active, _powered, t) => {
              if (active) rotor.rotation.y = t * 9.5;
            },
          };
        }

        case 'actuator-display': {
          // Leuchtendes Display / LCD / LED-Matrix / TFT / Nixie / E-Ink!
          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(1.55, 1.05, 0.24),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 }),
          );
          frame.position.set(0, 0.9, 0);
          frame.castShadow = true;
          group.add(frame);

          const screenMat = new THREE.MeshStandardMaterial({
            map: tex,
            emissiveMap: tex,
            emissive: accent,
            emissiveIntensity: 0,
            roughness: 0.22,
          });
          const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.86), screenMat);
          screen.position.set(0, 0.9, 0.13);
          group.add(screen);

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
          // Relais-Bank / SSR / Magnetventil / Schubriegel / Motortreiber
          const block = new THREE.Mesh(
            new THREE.BoxGeometry(1.25, 0.78, 0.82),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38 }),
          );
          block.position.set(0, 0.72, 0);
          block.castShadow = true;
          group.add(block);

          const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), statusLedMat);
          statusLed.position.set(0.42, 1.14, 0.28);
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
          // Audio / High-Power-Licht / Peltier / Heizfolie / Nebel / Funk
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(1.08, 0.78, 0.65),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.36 }),
          );
          box.position.set(0, 0.72, 0);
          box.castShadow = true;
          group.add(box);

          const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 20), statusLedMat);
          emitter.position.set(0, 1.15, 0);
          group.add(emitter);

          const glowLight = new THREE.PointLight(accent, 0, 4.5);
          glowLight.position.set(0, 1.4, 0.2);
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
          // sensor-pcb (Kompaktes Breakout-Board mit IC & Status-LED)
          const pcb = new THREE.Mesh(
            new THREE.BoxGeometry(1.08, 0.82, 0.18),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38 }),
          );
          pcb.position.set(0, 0.76, 0);
          pcb.castShadow = true;
          group.add(pcb);

          const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), statusLedMat);
          led.position.set(0.36, 1.02, 0.12);
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
