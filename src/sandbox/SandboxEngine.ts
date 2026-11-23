import { getEspBoardById } from '../engine/BoardCatalog';
import type { EspBoardId } from '../engine/types';
import type {
  PartRuntimeState,
  PlacedPart,
  SandboxCatalogItem,
  SandboxPartType,
  SandboxSimSummary,
  SandboxState,
  WireEndpoint,
} from './SandboxTypes';

export const WIRE_COLORS = [
  { id: 'red', label: 'Rot (+V)', hex: '#ef4444' },
  { id: 'black', label: 'Schwarz (GND)', hex: '#1e293b' },
  { id: 'cyan', label: 'Cyan (Signal)', hex: '#38bdf8' },
  { id: 'yellow', label: 'Gelb (SCL/TX)', hex: '#facc15' },
  { id: 'green', label: 'Grün (SDA/RX)', hex: '#22c55e' },
  { id: 'orange', label: 'Orange (PWM)', hex: '#f97316' },
] as const;

export const SANDBOX_CATALOG: SandboxCatalogItem[] = [
  {
    type: 'led-red',
    name: '5mm LED Rot (2,0 V)',
    shortName: 'LED Rot',
    category: 'LEDs & Ausgabe',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Anode (+)' },
      { dCol: 2, row: 'g', pinLabel: 'Kathode (−)' },
    ],
    description: 'Leuchtet rot bei 2,0 V. Immer mit 220 Ω Vorwiderstand in Reihe schalten!',
    accentHex: '#ef4444',
  },
  {
    type: 'led-green',
    name: '5mm LED Grün (2,2 V)',
    shortName: 'LED Grün',
    category: 'LEDs & Ausgabe',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Anode (+)' },
      { dCol: 2, row: 'g', pinLabel: 'Kathode (−)' },
    ],
    description: 'Grüne Status-LED (Vf = 2,2 V, Nennstrom 20 mA).',
    accentHex: '#22c55e',
  },
  {
    type: 'led-blue',
    name: '5mm LED Blau (3,0 V)',
    shortName: 'LED Blau',
    category: 'LEDs & Ausgabe',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Anode (+)' },
      { dCol: 2, row: 'g', pinLabel: 'Kathode (−)' },
    ],
    description: 'Blaue LED mit hoher Durchlassspannung (Vf = 3,0 V).',
    accentHex: '#3b82f6',
  },
  {
    type: 'resistor-220',
    name: 'Widerstand 220 Ω (Vorwiderstand)',
    shortName: 'R 220 Ω',
    category: 'Passiv & Taster',
    colSpan: 6,
    preferredRow: 'h',
    pinOffsets: [
      { dCol: 0, row: 'h', pinLabel: 'A' },
      { dCol: 6, row: 'h', pinLabel: 'B' },
    ],
    description: 'Klassischer LED-Vorwiderstand (Rot-Rot-Braun-Gold) — begrenzt Strom auf ~5–6 mA.',
    accentHex: '#d97706',
  },
  {
    type: 'resistor-10k',
    name: 'Widerstand 10 kΩ (Pull-Up / Down)',
    shortName: 'R 10 kΩ',
    category: 'Passiv & Taster',
    colSpan: 6,
    preferredRow: 'h',
    pinOffsets: [
      { dCol: 0, row: 'h', pinLabel: 'A' },
      { dCol: 6, row: 'h', pinLabel: 'B' },
    ],
    description: 'Standard-Pull-Up/Pull-Down- und Spannungsteiler-Widerstand (Braun-Schwarz-Orange-Gold).',
    accentHex: '#f59e0b',
  },
  {
    type: 'button',
    name: 'Kurzhub-Taster (SPST)',
    shortName: 'Taster',
    category: 'Passiv & Taster',
    colSpan: 2,
    preferredRow: 'f',
    pinOffsets: [
      { dCol: 0, row: 'f', pinLabel: 'Eingang' },
      { dCol: 2, row: 'f', pinLabel: 'Ausgang' },
    ],
    description: 'Schließer-Taster über dem Mittelgraben — klickbar in 3D oder per Leertaste.',
    accentHex: '#0ea5e9',
  },
  {
    type: 'capacitor',
    name: 'Elko 100 µF (Kondensator)',
    shortName: 'Elko 100 µF',
    category: 'Passiv & Taster',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Plus (+)' },
      { dCol: 2, row: 'g', pinLabel: 'Minus (−)' },
    ],
    description: 'Elektrolyt-Kondensator zum Glätten von Spannungsspitzen und für RC-Filter.',
    accentHex: '#3b82f6',
  },
  {
    type: 'ldr',
    name: 'Fotowiderstand (LDR Lichtsensor)',
    shortName: 'LDR Sensor',
    category: 'Sensoren',
    colSpan: 3,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'A' },
      { dCol: 3, row: 'g', pinLabel: 'B' },
    ],
    description: 'Ändert seinen Widerstand je nach Umgebungshelligkeit (500 Ω hell bis 100 kΩ dunkel).',
    accentHex: '#eab308',
  },
  {
    type: 'bme280',
    name: 'BME280 Umweltsensor (I²C)',
    shortName: 'BME280 I²C',
    category: 'Sensoren',
    colSpan: 3,
    preferredRow: 'f',
    pinOffsets: [
      { dCol: 0, row: 'f', pinLabel: '3V3' },
      { dCol: 1, row: 'f', pinLabel: 'GND' },
      { dCol: 2, row: 'f', pinLabel: 'SCL' },
      { dCol: 3, row: 'f', pinLabel: 'SDA' },
    ],
    description: 'Misst Temperatur, Luftfeuchtigkeit & Luftdruck digital über I²C (Adresse 0x76).',
    accentHex: '#a855f7',
  },
  {
    type: 'hcsr04',
    name: 'HC-SR04 Ultraschallsensor',
    shortName: 'HC-SR04',
    category: 'Sensoren',
    colSpan: 6,
    preferredRow: 'h',
    pinOffsets: [
      { dCol: 0, row: 'h', pinLabel: 'VCC' },
      { dCol: 2, row: 'h', pinLabel: 'TRIG' },
      { dCol: 4, row: 'h', pinLabel: 'ECHO' },
      { dCol: 6, row: 'h', pinLabel: 'GND' },
    ],
    description: 'Misst Abstände von 2 bis 400 cm per 40-kHz-Ultraschalllaufzeit.',
    accentHex: '#2563eb',
  },
  {
    type: 'ld2490',
    name: 'HLK-LD2490 24 GHz Radar',
    shortName: 'LD2490 Radar',
    category: 'Sensoren',
    colSpan: 4,
    preferredRow: 'h',
    pinOffsets: [
      { dCol: 0, row: 'h', pinLabel: '5V' },
      { dCol: 1, row: 'h', pinLabel: 'GND' },
      { dCol: 2, row: 'h', pinLabel: 'TX' },
      { dCol: 3, row: 'h', pinLabel: 'RX' },
      { dCol: 4, row: 'h', pinLabel: 'OUT' },
    ],
    description: '24-GHz-mmWave-Präsenz- & Atem-Radar mit UART und digitalem OUT-Pin.',
    accentHex: '#10b981',
  },
  {
    type: 'oled',
    name: 'SSD1306 I²C OLED (128×64)',
    shortName: 'OLED Display',
    category: 'Aktoren & Display',
    colSpan: 3,
    preferredRow: 'f',
    pinOffsets: [
      { dCol: 0, row: 'f', pinLabel: 'GND' },
      { dCol: 1, row: 'f', pinLabel: '3V3' },
      { dCol: 2, row: 'f', pinLabel: 'SCL' },
      { dCol: 3, row: 'f', pinLabel: 'SDA' },
    ],
    description: 'Selbstleuchtendes 0,96"-Zweifarben-OLED an I²C-Adresse 0x3C.',
    accentHex: '#06b6d4',
  },
  {
    type: 'servo',
    name: 'SG90 Mikro-Servo (0°–180°)',
    shortName: 'SG90 Servo',
    category: 'Aktoren & Display',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'PWM' },
      { dCol: 1, row: 'g', pinLabel: '+5V' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Dreht seinen Servo-Arm live zwischen 0° und 180° bei 50-Hz-PWM.',
    accentHex: '#0284c7',
  },
  {
    type: 'buzzer',
    name: 'Passiver Piezo-Buzzer',
    shortName: 'Piezo-Buzzer',
    category: 'Aktoren & Display',
    colSpan: 3,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Signal (+)' },
      { dCol: 3, row: 'g', pinLabel: 'GND (−)' },
    ],
    description: 'Erzeugt Töne und Warnsignale über Rechteck-Frequenzen.',
    accentHex: '#f43f5e',
  },
];

export function getCatalogItem(type: SandboxPartType): SandboxCatalogItem {
  return SANDBOX_CATALOG.find((i) => i.type === type) ?? SANDBOX_CATALOG[0];
}

export function formatEndpointLabel(ep: WireEndpoint, boardId: EspBoardId): string {
  if (ep.kind === 'board') {
    const b = getEspBoardById(boardId);
    const role = ep.boardPinRole ?? '3V3';
    if (role === '3V3' || role === 'GND') return `${b.shortName} ${role}`;
    const map: Record<string, string> = {
      outA: `G${b.pins.outA.gpio}`,
      outB: `G${b.pins.outB.gpio}`,
      outC: `G${b.pins.outC.gpio}`,
      inputA: `G${b.pins.inputA.gpio}`,
      adc: `G${b.pins.adc.gpio}`,
      sda: `SDA (G${b.pins.sda.gpio})`,
      scl: `SCL (G${b.pins.scl.gpio})`,
      uartTx: `TX (G${b.pins.uartTx.gpio})`,
      uartRx: `RX (G${b.pins.uartRx.gpio})`,
    };
    return `${b.shortName} ${map[role] ?? role}`;
  }
  const r = ep.row ?? 'g';
  if (r === '+top' || r === '+bot') return 'Schiene +3,3V';
  if (r === '-top' || r === '-bot') return 'Schiene GND';
  return `Loch ${ep.col ?? 1}${r}`;
}

/**
 * Echte Breadboard-Knoten-ID für Union-Find:
 * - Spalten 1..30 verbinden (a..e) als "col-bot" und (f..j) als "col-top"
 * - Stromschienen "+top", "-top", "+bot", "-bot" sind durchgehende Busse
 * - Board-Pins sind eigene Quellen/Senken ("board:3V3", "board:GND", "board:outA" …)
 */
export function getElectricalNetId(ep: WireEndpoint): string {
  if (ep.kind === 'board') {
    return `board:${ep.boardPinRole ?? '3V3'}`;
  }
  const r = ep.row ?? 'g';
  if (r === '+top' || r === '-top' || r === '+bot' || r === '-bot') {
    return `rail:${r}`;
  }
  const side = ['a', 'b', 'c', 'd', 'e'].includes(r) ? 'bot' : 'top';
  return `strip:${ep.col ?? 1}:${side}`;
}

class UnionFind {
  private readonly parent = new Map<string, string>();

  public find(x: string): string {
    let p = this.parent.get(x);
    if (!p) {
      this.parent.set(x, x);
      return x;
    }
    while (p !== this.parent.get(p)) {
      p = this.parent.get(p)!;
    }
    this.parent.set(x, p);
    return p;
  }

  public union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }

  public connected(a: string, b: string): boolean {
    return this.find(a) === this.find(b);
  }
}

export function getPartPinNets(part: PlacedPart): string[] {
  const def = getCatalogItem(part.type);
  return def.pinOffsets.map((po) =>
    getElectricalNetId({
      kind: 'breadboard',
      col: Math.max(1, Math.min(30, part.col + po.dCol)),
      row: po.row,
    }),
  );
}

/**
 * Wertet eine frei gebaute Sandbox-Schaltung physikalisch & logisch in Echtzeit aus!
 * Erkennt geschlossene Stromkreise, Vorwiderstände (vs. Überstrom!), Taster, Sensoren & Displays.
 */
export function evaluateSandboxCircuit(
  state: SandboxState,
  boardId: EspBoardId,
  elapsedSeconds: number,
): SandboxSimSummary {
  const board = getEspBoardById(boardId);
  const uf = new UnionFind();

  // 1. All jumper wires create direct electrical connections (0 Ohm)
  for (const w of state.wires) {
    uf.union(getElectricalNetId(w.from), getElectricalNetId(w.to));
  }

  // 2. Closed tactile buttons bridge their two nets!
  for (const part of state.parts) {
    if (part.type === 'button' && state.buttonPressed) {
      const nets = getPartPinNets(part);
      if (nets.length >= 2) uf.union(nets[0], nets[1]);
    }
  }

  // Build adjacency of resistive bridges (220 Ohm / 10k Ohm / LDR)
  const resistorEdges: Array<{ a: string; b: string; ohms: number }> = [];
  for (const part of state.parts) {
    if (part.type === 'resistor-220' || part.type === 'resistor-10k' || part.type === 'ldr') {
      const nets = getPartPinNets(part);
      if (nets.length >= 2) {
        const ohms =
          part.type === 'resistor-220'
            ? 220
            : part.type === 'resistor-10k'
              ? 10000
              : Math.round(100000 * Math.pow(500 / 100000, state.lightPercent / 100));
        resistorEdges.push({ a: nets[0], b: nets[1], ohms });
      }
    }
  }

  // Helper: check if net connects to any powered source directly (0 Ohm) or via a resistor
  const highSources = ['board:3V3'];
  if (state.gpioHigh) {
    highSources.push('board:outA', 'board:outB', 'board:outC');
  }
  const gndSources = ['board:GND'];
  if (!state.gpioHigh) {
    gndSources.push('board:outA');
  }

  const isDirectToAny = (net: string, targets: string[]) =>
    targets.some((t) => uf.connected(net, t));

  const findSeriesResistanceTo = (net: string, targets: string[]): number | null => {
    if (isDirectToAny(net, targets)) return 0;
    for (const edge of resistorEdges) {
      if (uf.connected(net, edge.a) && isDirectToAny(edge.b, targets)) return edge.ohms;
      if (uf.connected(net, edge.b) && isDirectToAny(edge.a, targets)) return edge.ohms;
    }
    return null;
  };

  const partStates = new Map<string, PartRuntimeState>();
  let totalCurrentMa = 0;
  let activePartsCount = 0;
  let overcurrentAlert = false;
  let primaryVoltage = state.gpioHigh ? 3.3 : 0;

  for (const part of state.parts) {
    const nets = getPartPinNets(part);
    const def = getCatalogItem(part.type);

    if (part.type === 'led-red' || part.type === 'led-green' || part.type === 'led-blue') {
      const vf = part.type === 'led-red' ? 2.0 : part.type === 'led-green' ? 2.2 : 3.0;
      const rHigh = findSeriesResistanceTo(nets[0], highSources);
      const rGnd = findSeriesResistanceTo(nets[1], gndSources);

      if (rHigh !== null && rGnd !== null) {
        const totalR = rHigh + rGnd;
        const effectiveR = Math.max(15, totalR);
        const currentMa = ((3.3 - vf) / effectiveR) * 1000;
        const overcurrent = totalR < 45 && currentMa > 20;
        if (overcurrent) overcurrentAlert = true;
        const bright = Math.min(100, Math.pow(Math.min(1, currentMa / 20), 0.72) * 100);
        totalCurrentMa += currentMa;
        activePartsCount++;
        partStates.set(part.id, {
          partId: part.id,
          powered: true,
          active: true,
          brightnessPct: bright,
          overcurrent,
          currentMa,
          statusText: overcurrent
            ? `ÜBERSTROM (${currentMa.toFixed(0)} mA — Vorwiderstand fehlt!)`
            : `Leuchtet (${currentMa.toFixed(1).replace('.', ',')} mA)`,
        });
      } else {
        partStates.set(part.id, {
          partId: part.id,
          powered: false,
          active: false,
          brightnessPct: 0,
          overcurrent: false,
          currentMa: 0,
          statusText: 'Offener Kreis (+ und GND verbinden)',
        });
      }
      continue;
    }

    if (part.type === 'ld2490') {
      const hasV = findSeriesResistanceTo(nets[0], ['board:3V3']) !== null;
      const hasGnd = findSeriesResistanceTo(nets[1], ['board:GND']) !== null;
      const hasOut = isDirectToAny(nets[4], ['board:inputA', 'board:outA', 'board:outB']);
      const powered = hasV && hasGnd;
      if (powered) {
        totalCurrentMa += 75;
        activePartsCount++;
        if (hasOut) primaryVoltage = state.radarPresent ? 3.3 : 0;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered,
        active: powered && state.radarPresent,
        brightnessPct: powered && state.radarPresent ? 100 : 0,
        overcurrent: false,
        currentMa: powered ? 75 : 0,
        statusText: powered
          ? hasOut
            ? state.radarPresent
              ? 'Präsenz erkannt (OUT = HIGH)'
              : 'Aktiv (keine Präsenz)'
            : 'Versorgt (OUT noch ans Board verbinden)'
          : 'Unversorgt (5V/3V3 & GND anschließen)',
      });
      continue;
    }

    if (part.type === 'oled' || part.type === 'bme280') {
      const gndNet = part.type === 'oled' ? nets[0] : nets[1];
      const vccNet = part.type === 'oled' ? nets[1] : nets[0];
      const sclNet = nets[2];
      const sdaNet = nets[3];

      const powered =
        findSeriesResistanceTo(vccNet, ['board:3V3']) !== null &&
        findSeriesResistanceTo(gndNet, ['board:GND']) !== null;
      const hasI2c = isDirectToAny(sclNet, ['board:scl']) && isDirectToAny(sdaNet, ['board:sda']);
      const active = powered && hasI2c;
      if (active) {
        totalCurrentMa += part.type === 'oled' ? 18 : 1.2;
        activePartsCount++;
        primaryVoltage = (elapsedSeconds * 8) % 1 < 0.25 ? 0.1 : 3.3;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered,
        active,
        brightnessPct: active ? 95 : 0,
        overcurrent: false,
        currentMa: active ? (part.type === 'oled' ? 18 : 1.2) : 0,
        statusText: active
          ? `${def.shortName} Online (I²C aktiv)`
          : powered
            ? 'Strom OK — SDA & SCL noch verbinden'
            : '3V3 & GND noch anschließen',
      });
      continue;
    }

    if (part.type === 'hcsr04') {
      const powered =
        findSeriesResistanceTo(nets[0], ['board:3V3']) !== null &&
        findSeriesResistanceTo(nets[3], ['board:GND']) !== null;
      if (powered) {
        totalCurrentMa += 15;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered,
        active: powered,
        brightnessPct: powered ? 100 : 0,
        overcurrent: false,
        currentMa: powered ? 15 : 0,
        statusText: powered ? 'Ultraschall aktiv' : 'VCC & GND verbinden',
      });
      continue;
    }

    if (part.type === 'servo') {
      const powered =
        findSeriesResistanceTo(nets[1], ['board:3V3']) !== null &&
        findSeriesResistanceTo(nets[2], ['board:GND']) !== null;
      const hasSig = isDirectToAny(nets[0], ['board:outA', 'board:outB', 'board:outC']);
      const active = powered && hasSig;
      if (active) {
        totalCurrentMa += 45;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered,
        active,
        brightnessPct: active ? 100 : 0,
        overcurrent: false,
        currentMa: active ? 45 : 0,
        statusText: active ? `Servo auf ${Math.round(state.servoAngleDeg)}°` : 'PWM, +V & GND anschließen',
      });
      continue;
    }

    if (part.type === 'buzzer') {
      const rHigh = findSeriesResistanceTo(nets[0], highSources);
      const rGnd = findSeriesResistanceTo(nets[1], gndSources);
      const active = rHigh !== null && rGnd !== null;
      if (active) {
        totalCurrentMa += 9;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered: active,
        active,
        brightnessPct: active ? 100 : 0,
        overcurrent: false,
        currentMa: active ? 9 : 0,
        statusText: active ? 'Piezo aktiv (Ton)' : 'Signal (+) & GND (−) verbinden',
      });
      continue;
    }

    // Passive parts (resistors, button, cap, ldr)
    partStates.set(part.id, {
      partId: part.id,
      powered: true,
      active: part.type === 'button' ? state.buttonPressed : true,
      brightnessPct: 0,
      overcurrent: false,
      currentMa: 0,
      statusText:
        part.type === 'button'
          ? state.buttonPressed
            ? 'Gedrückt (Kontakt geschlossen)'
            : 'Bereit (in 3D anklicken / Leertaste)'
          : `Eingesteckt bei Spalte ${part.col}`,
    });
  }

  let statusBadge = 'WERKBANK BEREIT';
  let statusTone: SandboxSimSummary['statusTone'] = 'info';
  let whatHappens =
    state.parts.length === 0
      ? 'Das Steckbrett ist noch leer — wähle rechts ein Bauteil oder Sensor aus und klicke auf ein Steckbrett-Loch!'
      : `${state.parts.length} Bauteil(e) und ${state.wires.length} Jumperkabel platziert (${activePartsCount} aktiv).`;
  let whyItHappens =
    'Jede 5er-Spalte auf dem Steckbrett (a–e bzw. f–j) ist intern leitend verbunden. Ziehe Jumperkabel vom Board zu den Bauteilen, um einen geschlossenen Stromkreis nach GND zu bauen!';

  if (overcurrentAlert) {
    statusBadge = 'ÜBERSTROM-WARNUNG!';
    statusTone = 'danger';
    whatHappens =
      'Mindestens eine LED ist direkt ohne Vorwiderstand angeschlossen und zieht zerstörerischen Überstrom!';
    whyItHappens =
      'Stecke einen 220-Ω-Widerstand in Reihe vor die LED-Anode, um den Strom sicher unter 20 mA zu begrenzen.';
  } else if (activePartsCount > 0) {
    statusBadge = `${activePartsCount} BAUTEIL${activePartsCount > 1 ? 'E' : ''} AKTIV ✓`;
    statusTone = 'ok';
    whatHappens = `Deine eigene Schaltung funktioniert! ${activePartsCount} Verbraucher/Sensoren laufen stabil am ${board.shortName} (${totalCurrentMa.toFixed(1).replace('.', ',')} mA gesamt).`;
    whyItHappens =
      'Der Stromkreis vom Board über deine Jumperkabel und Bauteile zurück zu GND ist sauber geschlossen.';
  }

  return {
    totalCurrentMa,
    activePartsCount,
    overcurrentAlert,
    nodeVoltage: primaryVoltage,
    probeLabel: `${board.shortName} Werkbank`,
    partStates,
    statusBadge,
    statusTone,
    whatHappens,
    whyItHappens,
  };
}

export function createStarterSandboxState(): SandboxState {
  return {
    parts: [],
    wires: [],
    gpioHigh: true,
    buttonPressed: false,
    lightPercent: 55,
    servoAngleDeg: 90,
    radarPresent: true,
  };
}
