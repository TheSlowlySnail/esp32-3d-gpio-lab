import { getElectricalNetId } from './SandboxEngine';
import type {
  HighlightMarker,
  PlacedPart,
  PlacedWire,
  SandboxPartType,
  SandboxState,
  WireEndpoint,
} from './SandboxTypes';

export type GuidedActionSpec =
  | {
      kind: 'place-part';
      partType: SandboxPartType;
      col: number;
      row: string;
    }
  | {
      kind: 'add-wire';
      from: WireEndpoint;
      to: WireEndpoint;
      colorHex: string;
    };

export interface GuidedStep {
  id: string;
  title: string;
  instruction: string;
  whyText: string;
  action: GuidedActionSpec;
  highlights: HighlightMarker[];
  isCompleted: (state: SandboxState) => boolean;
}

export interface GuidedProject {
  id: string;
  title: string;
  difficulty: 'Einstieg' | 'Grundlagen' | 'Smart Home';
  durationLabel: string;
  summary: string;
  completionMessage: string;
  steps: GuidedStep[];
}

function hasPartAt(state: SandboxState, type: SandboxPartType, col: number, tolerance = 1): boolean {
  return state.parts.some((p) => p.type === type && Math.abs(p.col - col) <= tolerance);
}

function hasWireConnecting(state: SandboxState, a: WireEndpoint, b: WireEndpoint): boolean {
  const netA = getElectricalNetId(a);
  const netB = getElectricalNetId(b);
  return state.wires.some((w) => {
    const wa = getElectricalNetId(w.from);
    const wb = getElectricalNetId(w.to);
    return (wa === netA && wb === netB) || (wa === netB && wb === netA);
  });
}

function makeWireStep(
  id: string,
  title: string,
  instruction: string,
  whyText: string,
  from: WireEndpoint,
  to: WireEndpoint,
  colorHex: string,
): GuidedStep {
  return {
    id,
    title,
    instruction,
    whyText,
    action: { kind: 'add-wire', from, to, colorHex },
    highlights: [
      { endpoint: from, colorHex: '#22d3ee', label: 'Start' },
      { endpoint: to, colorHex: '#34d399', label: 'Ziel' },
    ],
    isCompleted: (s) => hasWireConnecting(s, from, to),
  };
}

function makePartStep(
  id: string,
  title: string,
  instruction: string,
  whyText: string,
  partType: SandboxPartType,
  col: number,
  row: string,
): GuidedStep {
  return {
    id,
    title,
    instruction,
    whyText,
    action: { kind: 'place-part', partType, col, row },
    highlights: [
      {
        endpoint: { kind: 'breadboard', col, row },
        colorHex: '#22d3ee',
        label: `Spalte ${col}`,
      },
    ],
    isCompleted: (s) => hasPartAt(s, partType, col, 1),
  };
}

export const GUIDED_PROJECTS: GuidedProject[] = [
  {
    id: 'guided-first-led',
    title: 'Deine erste eigene LED-Schaltung',
    difficulty: 'Einstieg',
    durationLabel: '5 Schritte · ~2 Min.',
    summary:
      'Wir bauen gemeinsam auf dem leeren Steckbrett eine komplette LED-Schaltung mit 220-Ω-Vorwiderstand — Schritt für Schritt, mit blinkenden Ziel-Steckplätzen in 3D.',
    completionMessage:
      'Geschafft! Deine selbst gebaute rote LED leuchtet sicher bei 5,9 mA. Probiere jetzt den GPIO-Schalter oder baue noch weitere Bauteile dazu!',
    steps: [
      makeWireStep(
        'led-gnd-rail',
        'Masse-Schiene (GND) versorgen',
        'Klicke zuerst auf den blinkenden GND-Pin am Board und dann auf das blinkende Loch auf der blauen Minus-Schiene (-top).',
        'Jeder Stromkreis braucht einen Rückweg zu 0 V (GND). Über die durchgehende blaue Schiene haben wir überall am Brett Masse.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 2, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'led-place-r',
        '220 Ω Vorwiderstand einstecken',
        'Klicke auf den blinkenden Steckplatz bei Spalte 8 (Reihe h), um den 220-Ω-Vorwiderstand einzustecken (er überbrückt Spalte 8 bis 14).',
        'Ohne Vorwiderstand würde die LED durch Überstrom sofort zerstört. Der Widerstand begrenzt den Strom auf sichere ~5,9 mA.',
        'resistor-220',
        8,
        'h',
      ),
      makePartStep(
        'led-place-led',
        'Rote 5mm-LED an Spalte 14 setzen',
        'Klicke auf Spalte 14 (Reihe g), damit die Anode (+) der LED direkt in derselben Spalte wie das rechte Bein des Widerstands sitzt.',
        'Auf dem Steckbrett sind die 5 Löcher f–j einer Spalte intern verbunden! So fließt der Strom automatisch vom Widerstand in die LED.',
        'led-red',
        14,
        'g',
      ),
      makeWireStep(
        'led-gpio-wire',
        'GPIO-Signal mit dem Widerstand verbinden',
        'Verbinde den blinkenden GPIO-Ausgang (outA) am Board mit Spalte 8 (Reihe f) — dem linken Bein deines Widerstands.',
        'Über diese Datenleitung schaltet dein Mikrocontroller 3,3 V (HIGH) oder 0 V (LOW) auf die Schaltung.',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 8, row: 'f' },
        '#38bdf8',
      ),
      makeWireStep(
        'led-cathode-gnd',
        'Stromkreis nach GND schließen',
        'Verbinde die Kathode der LED bei Spalte 16 (Reihe j) mit der blauen Minus-Schiene (16 -top) — sofort leuchtet deine LED auf!',
        'Erst mit diesem letzten Kabel ist der Stromkreis geschlossen und die Elektronen können von +3,3 V durch Widerstand und LED nach GND fließen.',
        { kind: 'breadboard', col: 16, row: 'j' },
        { kind: 'breadboard', col: 16, row: '-top' },
        '#1e293b',
      ),
    ],
  },
  {
    id: 'guided-button-led',
    title: 'Taster schaltet grüne LED',
    difficulty: 'Grundlagen',
    durationLabel: '7 Schritte · ~3 Min.',
    summary:
      'Baue eine interaktive Hardware-Taster-Schaltung: Sobald du deinen selbst gesteckten 3D-Taster drückst (oder die Leertaste hältst), fließt Strom durch Widerstand und grüne LED!',
    completionMessage:
      'Stark! Halte jetzt deinen selbst gebauten 3D-Taster gedrückt (oder drücke die Leertaste) und sieh zu, wie die grüne LED aufleuchtet!',
    steps: [
      makeWireStep(
        'btn-3v3',
        'Plus-Schiene (+3,3 V) versorgen',
        'Verbinde den 3V3-Pin am Board mit der roten Plus-Schiene (+top).',
        'Die rote Schiene verteilt die geregelten 3,3 V an alle Verbraucher entlang des Steckbretts.',
        { kind: 'board', boardPinRole: '3V3' },
        { kind: 'breadboard', col: 2, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'btn-gnd',
        'Masse-Schiene (GND) versorgen',
        'Verbinde GND am Board mit der blauen Minus-Schiene (-top).',
        'Gemeinsame Masse ist die Basis jeder funktionierenden Elektronikschaltung.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 2, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'btn-place-switch',
        'Kurzhub-Taster bei Spalte 10 einstecken',
        'Klicke auf Spalte 10 (Reihe f), um den 3D-Taster über den Mittelgraben einzusetzen.',
        'Im losgelassenen Zustand trennt der Taster Spalte 10 und Spalte 12. Beim Drücken verbindet er sie!',
        'button',
        10,
        'f',
      ),
      makePartStep(
        'btn-place-r',
        '220 Ω Vorwiderstand an Spalte 12 stecken',
        'Setze den 220-Ω-Widerstand an Spalte 12 (Reihe h) — direkt an den Ausgang des Tasters.',
        'Der Widerstand übernimmt den Stromschutz für die nachfolgende grüne LED (Spalte 12 bis 18).',
        'resistor-220',
        12,
        'h',
      ),
      makePartStep(
        'btn-place-led',
        'Grüne 5mm-LED an Spalte 18 setzen',
        'Stecke die grüne LED bei Spalte 18 (Reihe g) ein — Anode an Spalte 18, Kathode an Spalte 20.',
        'Jetzt liegen Taster, Widerstand und grüne LED sauber in Reihe hintereinander.',
        'led-green',
        18,
        'g',
      ),
      makeWireStep(
        'btn-wire-pos',
        'Taster-Eingang an +3,3 V anschließen',
        'Verbinde Spalte 10 (Reihe j) mit der roten Plus-Schiene (10 +top).',
        'Damit liegt am linken Kontakt deines Tasters dauerhaft 3,3 V an.',
        { kind: 'breadboard', col: 10, row: 'j' },
        { kind: 'breadboard', col: 10, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'btn-wire-gnd',
        'LED-Kathode nach GND verbinden',
        'Verbinde Spalte 20 (Reihe j) mit der blauen Minus-Schiene (20 -top) — fertig zum Drücken!',
        'Sobald du den 3D-Taster drückst, schließt sich der Stromkreis und die grüne LED leuchtet!',
        { kind: 'breadboard', col: 20, row: 'j' },
        { kind: 'breadboard', col: 20, row: '-top' },
        '#1e293b',
      ),
    ],
  },
  {
    id: 'guided-radar-oled',
    title: 'Smart-Home: LD2490 Radar + I²C OLED',
    difficulty: 'Smart Home',
    durationLabel: '10 Schritte · ~4 Min.',
    summary:
      'Dein eigenes Smart-Home-Kombi-Projekt: Stecke das 24-GHz-HLK-LD2490-Präsenzradar und das SSD1306-OLED-Display zusammen auf ein Brett und verkable Power, OUT & I²C!',
    completionMessage:
      'Beeindruckend! Dein 24-GHz-Radar und das selbstleuchtende OLED-Display laufen gemeinsam auf dem Steckbrett. Probiere jetzt „Raum dunkel“ in der Toolbar!',
    steps: [
      makeWireStep(
        'sm-3v3',
        'Plus-Schiene (+3,3 V) versorgen',
        'Verbinde 3V3 am Board mit der roten Stromschiene (+top).',
        'Sowohl der LD2490 als auch das OLED-Display beziehen ihren Strom über diese gemeinsame Schiene.',
        { kind: 'board', boardPinRole: '3V3' },
        { kind: 'breadboard', col: 2, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'sm-gnd',
        'Masse-Schiene (GND) versorgen',
        'Verbinde GND am Board mit der blauen Masse-Schiene (-top).',
        'Alle Sensoren müssen denselben Massebezug (0 V) teilen wie der Mikrocontroller.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 2, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'sm-place-radar',
        'HLK-LD2490 24 GHz Radar bei Spalte 8 stecken',
        'Klicke auf Spalte 8 (Reihe h), um das 5-Pin-Radar-Modul (5V, GND, TX, RX, OUT) einzustecken.',
        'Die 5 Pins liegen jetzt sauber in den Spalten 8 (5V), 9 (GND), 10 (TX), 11 (RX) und 12 (OUT).',
        'ld2490',
        8,
        'h',
      ),
      makeWireStep(
        'sm-radar-vcc',
        'LD2490 mit Strom (+V) verbinden',
        'Verbinde Spalte 8 (Reihe j) mit der roten Plus-Schiene (8 +top).',
        'Pin 1 des LD2490 ist der Versorgungsanschluss.',
        { kind: 'breadboard', col: 8, row: 'j' },
        { kind: 'breadboard', col: 8, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'sm-radar-gnd',
        'LD2490 mit Masse (GND) verbinden',
        'Verbinde Spalte 9 (Reihe j) mit der blauen Minus-Schiene (9 -top) — die 24-GHz-Wellen starten!',
        'Sobald Strom & Masse anliegen, beginnt der LD2490 sofort mit der 24-GHz-Präsenzerfassung.',
        { kind: 'breadboard', col: 9, row: 'j' },
        { kind: 'breadboard', col: 9, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'sm-place-oled',
        'SSD1306 OLED-Display bei Spalte 19 stecken',
        'Klicke auf Spalte 19 (Reihe f), um das 4-Pin-OLED-Display (GND, 3V3, SCL, SDA) einzusetzen.',
        'Das OLED belegt die Spalten 19 (GND), 20 (3V3), 21 (SCL) und 22 (SDA).',
        'oled',
        19,
        'f',
      ),
      makeWireStep(
        'sm-oled-power',
        'OLED mit 3,3 V & GND versorgen (3,3 V zuerst)',
        'Verbinde Spalte 20 (Reihe j) mit der roten Plus-Schiene (20 +top).',
        'Pin 2 des SSD1306 ist VCC (3,3 V).',
        { kind: 'breadboard', col: 20, row: 'j' },
        { kind: 'breadboard', col: 20, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'sm-oled-gnd',
        'OLED Masse (GND) anschließen',
        'Verbinde Spalte 19 (Reihe j) mit der blauen Minus-Schiene (19 -top).',
        'Jetzt fehlt nur noch der zweidrähtige I²C-Bus für die Bilddaten!',
        { kind: 'breadboard', col: 19, row: 'j' },
        { kind: 'breadboard', col: 19, row: '-top' },
        '#1e293b',
      ),
      makeWireStep(
        'sm-oled-scl',
        'I²C Taktleitung (SCL) anschließen',
        'Verbinde den SCL-Pin am Board mit Spalte 21 (Reihe i) am OLED.',
        'SCL gibt den gemeinsamen 400-kHz-Takt für den I²C-Bus vor.',
        { kind: 'board', boardPinRole: 'scl' },
        { kind: 'breadboard', col: 21, row: 'i' },
        '#facc15',
      ),
      makeWireStep(
        'sm-oled-sda',
        'I²C Datenleitung (SDA) anschließen — Display erwacht!',
        'Verbinde den SDA-Pin am Board mit Spalte 22 (Reihe h) am OLED — sofort leuchtet dein Screen auf!',
        'Über SDA fließen die 128×64-Pixel-Daten an Adresse 0x3C.',
        { kind: 'board', boardPinRole: 'sda' },
        { kind: 'breadboard', col: 22, row: 'h' },
        '#38bdf8',
      ),
    ],
  },
];

export function getGuidedProjectById(id: string): GuidedProject {
  return GUIDED_PROJECTS.find((p) => p.id === id) ?? GUIDED_PROJECTS[0];
}

export function applyGuidedStep(state: SandboxState, step: GuidedStep): SandboxState {
  if (step.isCompleted(state)) return state;
  const act = step.action;
  if (act.kind === 'place-part') {
    const newPart: PlacedPart = {
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: act.partType,
      col: act.col,
      row: act.row,
    };
    return { ...state, parts: [...state.parts, newPart] };
  }
  const newWire: PlacedWire = {
    id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from: act.from,
    to: act.to,
    colorHex: act.colorHex,
  };
  return { ...state, wires: [...state.wires, newWire] };
}
