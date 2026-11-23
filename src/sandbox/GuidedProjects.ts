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

  // =========================================================================
  // PROJEKT 4: Mini-Verkehrsampel (Rot, Gelb, Grün)
  // =========================================================================
  {
    id: 'guided-traffic-light',
    title: 'Mini-Verkehrsampel (Rot, Gelb, Grün)',
    difficulty: 'Grundlagen',
    durationLabel: '10 Schritte · ~4 Min.',
    summary:
      'Baue eine dreifarbige Ampel mit 3 eigenen Vorwiderständen an 3 GPIO-Ausgängen — perfekt für ESP32 & Raspberry Pi!',
    completionMessage:
      '🚦 Stark! Alle drei Ampel-LEDs (Rot, Gelb, Grün) leuchten sauber begrenzt durch ihre eigenen 220-Ω-Vorwiderstände.',
    steps: [
      makeWireStep(
        'tl-gnd',
        'Gemeinsame Masse (GND) auf die Minus-Schiene legen',
        'Verbinde GND am Board mit der blauen Minus-Schiene (Spalte 2, -top).',
        'Alle drei Ampel-LEDs teilen sich eine gemeinsame Rückleitung zu GND.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 2, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'tl-r1',
        'Vorwiderstand 1 (Rot-Kanal) bei Spalte 3 stecken',
        'Klicke auf Spalte 3 für den ersten 220-Ω-Widerstand (Spalte 3 → 9).',
        'Jede LED braucht zwingend ihren eigenen Vorwiderstand wegen unterschiedlicher Durchlassspannungen!',
        'resistor-220',
        3,
        'h',
      ),
      makePartStep(
        'tl-led-r',
        'Rote Ampel-LED bei Spalte 9 stecken',
        'Klicke auf Spalte 9, damit die Anode direkt an Widerstand 1 hängt.',
        'Rot (Vf ≈ 2,0 V) steht für Stopp.',
        'led-red',
        9,
        'g',
      ),
      makeWireStep(
        'tl-wire-r',
        'Rot-Kanal an GPIO-Ausgang 1 + GND anschließen',
        'Verbinde den ersten GPIO-Ausgang mit Spalte 3 (Reihe f).',
        'So schaltet der Mikrocontroller die rote LED unabhängig.',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 3, row: 'f' },
        '#ef4444',
      ),
      makeWireStep(
        'tl-gnd-r',
        'Kathode der roten LED an GND',
        'Verbinde Spalte 11 (Reihe j) mit der Minus-Schiene (11 -top).',
        'Sofort leuchtet die rote Ampelphase auf!',
        { kind: 'breadboard', col: 11, row: 'j' },
        { kind: 'breadboard', col: 11, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'tl-r2',
        'Vorwiderstand 2 (Gelb-Kanal) bei Spalte 12 stecken',
        'Klicke auf Spalte 12 für den zweiten 220-Ω-Widerstand (Spalte 12 → 18).',
        'Begrenzt den Strom der gelben LED auf ca. 5,5 mA.',
        'resistor-220',
        12,
        'h',
      ),
      makePartStep(
        'tl-led-y',
        'Gelbe Ampel-LED bei Spalte 18 stecken',
        'Klicke auf Spalte 18 für die gelbe LED.',
        'Die Anode trifft exakt das rechte Bein von Widerstand 2.',
        'led-yellow',
        18,
        'g',
      ),
      makeWireStep(
        'tl-wire-y',
        'Gelb-Kanal mit Ausgang 2 verbinden',
        'Verbinde Ausgang 2 (outB) am Board mit Spalte 12 (Reihe f).',
        'Zweiter separater GPIO-Pin für Gelb.',
        { kind: 'board', boardPinRole: 'outB' },
        { kind: 'breadboard', col: 12, row: 'f' },
        '#facc15',
      ),
      makeWireStep(
        'tl-gnd-y',
        'Kathode der gelben LED an GND',
        'Verbinde Spalte 20 (Reihe j) mit der Minus-Schiene (20 -top).',
        'Jetzt leuchten Rot und Gelb zusammen!',
        { kind: 'breadboard', col: 20, row: 'j' },
        { kind: 'breadboard', col: 20, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'tl-led-g',
        'Grüne LED (+ R3) bei Spalte 21 vorbereiten',
        'Stecke die grüne LED bei Spalte 22 — in der Werkbank kannst du sie sofort weiter verdrahten!',
        'Mit einem dritten Widerstand & GPIO (outC) hast du eine komplette 3-Phasen-Ampel.',
        'led-green',
        22,
        'g',
      ),
    ],
  },

  // =========================================================================
  // PROJEKT 5: PIR-Bewegungsmelder mit Piezo-Alarmsirene
  // =========================================================================
  {
    id: 'guided-pir-alarm',
    title: 'PIR-Bewegungsmelder & Alarmsirene',
    difficulty: 'Smart Home',
    durationLabel: '9 Schritte · ~3 Min.',
    summary:
      'Kombiniere einen HC-SR501 Infrarot-Bewegungsmelder mit einer lauten Piezo-Alarmsirene für den Raumschutz.',
    completionMessage:
      '🚨 Alarm scharf! Der PIR-Bewegungsmelder überwacht den Raum und der Piezo-Buzzer schlägt sofort akustisch an.',
    steps: [
      makeWireStep(
        'pir-vcc-rail',
        '3,3-V-Plus-Schiene versorgen',
        'Verbinde 3V3 am Board mit der roten Plus-Schiene (Spalte 2, +top).',
        'Versorgt unseren PIR-Melder über die durchgehende Plus-Schiene.',
        { kind: 'board', boardPinRole: '3V3' },
        { kind: 'breadboard', col: 2, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'pir-gnd-rail',
        'GND-Minus-Schiene verbinden',
        'Verbinde GND am Board mit der blauen Minus-Schiene (Spalte 3, -top).',
        'Gemeinsame Masse für Sensor und Alarmsirene.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 3, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'pir-place',
        'HC-SR501 PIR-Bewegungsmelder bei Spalte 8 stecken',
        'Klicke auf Spalte 8 (Pins: 8 = VCC, 9 = OUT, 10 = GND).',
        'Die weiße Fresnel-Linse bündelt Körperwärme auf den Pyro-Sensor im Inneren.',
        'pir-hc501',
        8,
        'g',
      ),
      makeWireStep(
        'pir-pwr',
        'PIR-Melder an +3,3 V & GND (erst Plus)',
        'Verbinde Spalte 8 (Reihe j) mit der Plus-Schiene (8 +top).',
        'Versorgt die Auswerte-Elektronik des PIR-Moduls.',
        { kind: 'breadboard', col: 8, row: 'j' },
        { kind: 'breadboard', col: 8, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'pir-gnd',
        'PIR-Masse anschließen',
        'Verbinde Spalte 10 (Reihe j) mit der Minus-Schiene (10 -top).',
        'Jetzt ist der Bewegungsmelder komplett versorgt!',
        { kind: 'breadboard', col: 10, row: 'j' },
        { kind: 'breadboard', col: 10, row: '-top' },
        '#1e293b',
      ),
      makeWireStep(
        'pir-out',
        'Bewegungs-Signal (OUT) zum Board-Eingang legen',
        'Verbinde Spalte 9 (Reihe i) mit dem Board-Eingang (inputA).',
        'Bei Bewegung schaltet der PIR diesen Pin sofort auf HIGH (3,3 V).',
        { kind: 'breadboard', col: 9, row: 'i' },
        { kind: 'board', boardPinRole: 'inputA' },
        '#facc15',
      ),
      makePartStep(
        'pir-buzzer',
        'Piezo-Alarmsirene bei Spalte 17 stecken',
        'Klicke auf Spalte 17 (Signal an 17, GND an 20).',
        'Gibt bei ausgelöstem Alarm einen durchdringenden Signalton ab.',
        'buzzer',
        17,
        'g',
      ),
      makeWireStep(
        'pir-buzz-sig',
        'Buzzer-Signal ans Board + Masse schließen (Signal)',
        'Verbinde Ausgang 1 (outA) mit Spalte 17 (Reihe f).',
        'Der Mikrocontroller erzeugt hier das Rechteck-Tonsignal.',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 17, row: 'f' },
        '#38bdf8',
      ),
      makeWireStep(
        'pir-buzz-gnd',
        'Buzzer-Masse an GND — Alarm aktiv!',
        'Verbinde Spalte 20 (Reihe j) mit der Minus-Schiene (20 -top).',
        'Schließt den Ton-Kreis — du siehst die blauen Schallwellen am Piezo!',
        { kind: 'breadboard', col: 20, row: 'j' },
        { kind: 'breadboard', col: 20, row: '-top' },
        '#1e293b',
      ),
    ],
  },

  // =========================================================================
  // PROJEKT 6: Pflanzen-Gießwächter (Bodenfeuchte + Warn-LED)
  // =========================================================================
  {
    id: 'guided-plant-guard',
    title: 'Pflanzen-Gießwächter (Bodenfeuchte)',
    difficulty: 'Smart Home',
    durationLabel: '10 Schritte · ~3 Min.',
    summary:
      'Baue einen korrosionsfreien Bodenfeuchte-Wächter, der per gelber Warn-LED meldet, wenn deine Pflanze Durst hat.',
    completionMessage:
      '🌱 Perfekt! Der Bodenfeuchte-Sensor meldet über ADC die Erdfeuchte und deine gelbe Gieß-Warn-LED leuchtet live.',
    steps: [
      makeWireStep(
        'pl-vcc',
        '3,3-V-Schiene versorgen',
        'Verbinde 3V3 am Board mit der Plus-Schiene (Spalte 2, +top).',
        'Kapazitive Bodenfeuchte-Sensoren arbeiten stabil direkt an 3,3 V.',
        { kind: 'board', boardPinRole: '3V3' },
        { kind: 'breadboard', col: 2, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'pl-gnd',
        'GND-Schiene verbinden',
        'Verbinde GND am Board mit der Minus-Schiene (Spalte 3, -top).',
        'Gemeinsamer Bezugspunkt für Analogmessung und LED.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 3, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'pl-soil',
        'Bodenfeuchte-Sensor bei Spalte 6 stecken',
        'Klicke auf Spalte 6 (6 = 3V3, 7 = AOUT, 8 = GND).',
        'Im Gegensatz zu billigen Metallgabeln korrodiert der kapazitive Sensor nicht in feuchter Erde.',
        'soil-moisture',
        6,
        'g',
      ),
      makeWireStep(
        'pl-soil-v',
        'Sensor-Plus anschließen',
        'Verbinde Spalte 6 (Reihe j) mit der Plus-Schiene (6 +top).',
        'Versorgt den internen Mess-Oszillator des Sensors.',
        { kind: 'breadboard', col: 6, row: 'j' },
        { kind: 'breadboard', col: 6, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'pl-soil-g',
        'Sensor-Masse anschließen',
        'Verbinde Spalte 8 (Reihe j) mit der Minus-Schiene (8 -top).',
        'Jetzt misst der Sensor aktiv die Dielektrizitätskonstante der Erde!',
        { kind: 'breadboard', col: 8, row: 'j' },
        { kind: 'breadboard', col: 8, row: '-top' },
        '#1e293b',
      ),
      makeWireStep(
        'pl-soil-adc',
        'Analog-Ausgang (AOUT) an den ADC-Pin legen',
        'Verbinde Spalte 7 (Reihe i) mit dem ADC-Pin am Board.',
        'Der 12-Bit-ADC liest die analoge Spannung (trocken = hoch, nass = niedrig).',
        { kind: 'breadboard', col: 7, row: 'i' },
        { kind: 'board', boardPinRole: 'adc' },
        '#22c55e',
      ),
      makePartStep(
        'pl-r',
        '220-Ω-Vorwiderstand bei Spalte 15 stecken',
        'Klicke auf Spalte 15 (Spalte 15 → 21) für die Gieß-Warn-LED.',
        'Schützt unsere gelbe Warn-LED vor Überstrom.',
        'resistor-220',
        15,
        'h',
      ),
      makePartStep(
        'pl-led',
        'Gelbe Warn-LED bei Spalte 21 stecken',
        'Klicke auf Spalte 21 (Anode an 21, Kathode an 23).',
        'Leuchtet auffällig gelb, sobald die Pflanze gegossen werden muss.',
        'led-yellow',
        21,
        'g',
      ),
      makeWireStep(
        'pl-led-sig',
        'Warn-LED an GPIO anschließen',
        'Verbinde Ausgang 1 (outA) mit Spalte 15 (Reihe f).',
        'Der Mikrocontroller schaltet hier die Gieß-Erinnerung ein.',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 15, row: 'f' },
        '#facc15',
      ),
      makeWireStep(
        'pl-led-gnd',
        'LED-Kathode mit GND verbinden — fertig!',
        'Verbinde Spalte 23 (Reihe j) mit der Minus-Schiene (23 -top).',
        'Dein Pflanzen-Gießwächter leuchtet und überwacht die Erde live!',
        { kind: 'breadboard', col: 23, row: 'j' },
        { kind: 'breadboard', col: 23, row: '-top' },
        '#1e293b',
      ),
    ],
  },

  // =========================================================================
  // PROJEKT 7: Wetterstation (DHT22 + I²C OLED)
  // =========================================================================
  {
    id: 'guided-weather-station',
    title: 'Mini-Wetterstation (DHT22 + OLED)',
    difficulty: 'Smart Home',
    durationLabel: '11 Schritte · ~4 Min.',
    summary:
      'Verbinde den weißen DHT22-Klimasensor mit einem 0,96"-OLED-Display — das beliebteste Einstiegs-Dashboard!',
    completionMessage:
      '🌤️ Genial! Dein DHT22 misst Temperatur & Luftfeuchte und dein SSD1306-OLED zeigt die Live-Daten gestochen scharf an.',
    steps: [
      makeWireStep(
        'ws-vcc',
        '3,3-V-Plus-Schiene speisen',
        'Verbinde 3V3 am Board mit der roten Plus-Schiene (Spalte 2, +top).',
        'DHT22 und SSD1306-OLED laufen beide sauber an 3,3 V.',
        { kind: 'board', boardPinRole: '3V3' },
        { kind: 'breadboard', col: 2, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'ws-gnd',
        'GND-Minus-Schiene speisen',
        'Verbinde GND am Board mit der blauen Minus-Schiene (Spalte 3, -top).',
        'Gemeinsame Masse für Sensor und Display.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 3, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'ws-dht',
        'DHT22-Klimasensor bei Spalte 7 stecken',
        'Klicke auf Spalte 7 (7 = 3V3, 8 = DATA, 9 = GND).',
        'Der DHT22 liefert digitale 1-Wire-Messwerte für Temperatur & relative Luftfeuchte.',
        'dht22',
        7,
        'g',
      ),
      makeWireStep(
        'ws-dht-v',
        'DHT22 mit 3,3 V versorgen',
        'Verbinde Spalte 7 (Reihe j) mit der Plus-Schiene (7 +top).',
        'Versorgt den internen Messchip des DHT22.',
        { kind: 'breadboard', col: 7, row: 'j' },
        { kind: 'breadboard', col: 7, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'ws-dht-g',
        'DHT22 mit GND verbinden',
        'Verbinde Spalte 9 (Reihe j) mit der Minus-Schiene (9 -top).',
        'Schließt den Versorgungskreis des Klimasensors.',
        { kind: 'breadboard', col: 9, row: 'j' },
        { kind: 'breadboard', col: 9, row: '-top' },
        '#1e293b',
      ),
      makeWireStep(
        'ws-dht-data',
        'DHT22-Datenleitung ans Board führen',
        'Verbinde Spalte 8 (Reihe i) mit dem Board-Eingang (inputA).',
        'Über diese einzige Leitung überträgt der DHT22 40 Bit Klimadaten.',
        { kind: 'breadboard', col: 8, row: 'i' },
        { kind: 'board', boardPinRole: 'inputA' },
        '#22c55e',
      ),
      makePartStep(
        'ws-oled',
        'SSD1306 OLED-Display bei Spalte 18 stecken',
        'Klicke auf Spalte 18 (18 = GND, 19 = 3V3, 20 = SCL, 21 = SDA).',
        'Zeigt deine Messwerte auch im abgedunkelten Raum kontrastreich an.',
        'oled',
        18,
        'f',
      ),
      makeWireStep(
        'ws-oled-g',
        'OLED Masse & Plus anschließen (Masse)',
        'Verbinde Spalte 18 (Reihe j) mit der Minus-Schiene (18 -top).',
        'GND-Pin des SSD1306-Moduls.',
        { kind: 'breadboard', col: 18, row: 'j' },
        { kind: 'breadboard', col: 18, row: '-top' },
        '#1e293b',
      ),
      makeWireStep(
        'ws-oled-v',
        'OLED Plus (+3,3 V) anschließen',
        'Verbinde Spalte 19 (Reihe j) mit der Plus-Schiene (19 +top).',
        'Versorgt das selbstleuchtende Display.',
        { kind: 'breadboard', col: 19, row: 'j' },
        { kind: 'breadboard', col: 19, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'ws-oled-scl',
        'I²C Takt (SCL) & Daten (SDA) — erst SCL',
        'Verbinde SCL am Board mit Spalte 20 (Reihe i).',
        'Taktleitung für das Display.',
        { kind: 'board', boardPinRole: 'scl' },
        { kind: 'breadboard', col: 20, row: 'i' },
        '#facc15',
      ),
      makeWireStep(
        'ws-oled-sda',
        'I²C Daten (SDA) anschließen — Wetterstation ONLINE!',
        'Verbinde SDA am Board mit Spalte 21 (Reihe h).',
        'Sofort erwacht dein 128×64-OLED zum Leben!',
        { kind: 'board', boardPinRole: 'sda' },
        { kind: 'breadboard', col: 21, row: 'h' },
        '#38bdf8',
      ),
    ],
  },

  // =========================================================================
  // PROJEKT 8: Laser-Lichtschranke (650 nm Laser + LDR)
  // =========================================================================
  {
    id: 'guided-laser-tripwire',
    title: 'Laser-Lichtschranke (650 nm + LDR)',
    difficulty: 'Grundlagen',
    durationLabel: '8 Schritte · ~3 Min.',
    summary:
      'Baue eine echte Spionage-Laser-Lichtschranke mit 650-nm-Laserdiode und einem LDR-Spannungsteiler am ADC!',
    completionMessage:
      '🔴 Agenten-Alarm bereit! Dein roter 3D-Laserstrahl leuchtet und der LDR-Spannungsteiler erkennt jede Unterbrechung.',
    steps: [
      makeWireStep(
        'lz-vcc',
        '3,3-V-Schiene versorgen',
        'Verbinde 3V3 am Board mit der Plus-Schiene (Spalte 2, +top).',
        'Speist den LDR-Spannungsteiler auf der Empfängerseite.',
        { kind: 'board', boardPinRole: '3V3' },
        { kind: 'breadboard', col: 2, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'lz-gnd',
        'GND-Schiene verbinden',
        'Verbinde GND am Board mit der Minus-Schiene (Spalte 3, -top).',
        'Gemeinsame Masse für Laser und Empfänger.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 3, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'lz-laser',
        'KY-008 Laser-Diode bei Spalte 6 stecken',
        'Klicke auf Spalte 6 (6 = Signal +, 8 = GND −).',
        'Sendet einen scharf gebündelten roten 650-nm-Laserstrahl aus.',
        'laser-diode',
        6,
        'g',
      ),
      makeWireStep(
        'lz-laser-sig',
        'Laser-Diode mit GPIO-Ausgang verbinden',
        'Verbinde Ausgang 1 (outA) mit Spalte 6 (Reihe f).',
        'So kann der Mikrocontroller den Laser ein- und ausschalten.',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 6, row: 'f' },
        '#ef4444',
      ),
      makeWireStep(
        'lz-laser-gnd',
        'Laser-Masse an GND — Strahl aktiviert sich!',
        'Verbinde Spalte 8 (Reihe j) mit der Minus-Schiene (8 -top).',
        'Sofort schießt der rote 3D-Laserstrahl nach vorne!',
        { kind: 'breadboard', col: 8, row: 'j' },
        { kind: 'breadboard', col: 8, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'lz-ldr',
        'LDR-Lichtsensor (Empfänger) bei Spalte 14 stecken',
        'Klicke auf Spalte 14 (Spalte 14 → 17).',
        'Trifft der Laser auf den LDR, sinkt sein Widerstand drastisch.',
        'ldr',
        14,
        'g',
      ),
      makePartStep(
        'lz-r10k',
        '10-kΩ-Teilerwiderstand bei Spalte 17 stecken',
        'Klicke auf Spalte 17 (Spalte 17 → 23) — bildet mit dem LDR einen Spannungsteiler.',
        'Am Mittelpunkt (Spalte 17) entsteht eine messbare Spannung für den ADC.',
        'resistor-10k',
        17,
        'h',
      ),
      makeWireStep(
        'lz-adc',
        'Empfänger-Mittelpunkt an ADC + Strom anschließen',
        'Verbinde Spalte 17 (Reihe f) mit dem ADC-Pin am Board.',
        'Fällt die Spannung am ADC ab, hat jemand deinen Laserstrahl durchbrochen!',
        { kind: 'breadboard', col: 17, row: 'f' },
        { kind: 'board', boardPinRole: 'adc' },
        '#facc15',
      ),
    ],
  },

  // =========================================================================
  // PROJEKT 9: Automatische Park-Schranke (Ultraschall + SG90 Servo)
  // =========================================================================
  {
    id: 'guided-parking-gate',
    title: 'Auto-Schranke (Ultraschall + Servo)',
    difficulty: 'Smart Home',
    durationLabel: '9 Schritte · ~4 Min.',
    summary:
      'Erkenne ankommende Fahrzeuge mit dem HC-SR04 Ultraschallsensor und öffne automatisch die SG90-Servo-Schranke!',
    completionMessage:
      '🚧 Schranke frei! Der Ultraschallsensor sendet Schallimpulse und dein SG90-Servo bewegt die Schranke live per Slider.',
    steps: [
      makeWireStep(
        'pg-vcc',
        'Plus-Schiene versorgen',
        'Verbinde 3V3 am Board mit der Plus-Schiene (Spalte 2, +top).',
        'Versorgt Ultraschallsensor und Servo über die Stromschiene.',
        { kind: 'board', boardPinRole: '3V3' },
        { kind: 'breadboard', col: 2, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'pg-gnd',
        'GND-Schiene verbinden',
        'Verbinde GND am Board mit der Minus-Schiene (Spalte 3, -top).',
        'Gemeinsame Masse für Sensor und Motor.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 3, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'pg-us',
        'HC-SR04 Ultraschallsensor bei Spalte 6 stecken',
        'Klicke auf Spalte 6 (6 = VCC, 8 = TRIG, 10 = ECHO, 12 = GND).',
        'Misst präzise den Abstand bis auf wenige Millimeter.',
        'hcsr04',
        6,
        'h',
      ),
      makeWireStep(
        'pg-us-v',
        'Ultraschall-VCC anschließen',
        'Verbinde Spalte 6 (Reihe j) mit der Plus-Schiene (6 +top).',
        'Versorgt Sender und Empfänger-Kapsel.',
        { kind: 'breadboard', col: 6, row: 'j' },
        { kind: 'breadboard', col: 6, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'pg-us-g',
        'Ultraschall-GND anschließen',
        'Verbinde Spalte 12 (Reihe j) mit der Minus-Schiene (12 -top).',
        'Sofort siehst du die blauen 40-kHz-Ultraschallwellen!',
        { kind: 'breadboard', col: 12, row: 'j' },
        { kind: 'breadboard', col: 12, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'pg-servo',
        'SG90 Mikro-Servo bei Spalte 20 stecken',
        'Klicke auf Spalte 20 (20 = PWM, 21 = +5V, 22 = GND).',
        'Hebt und senkt den Schranken-Arm zwischen 0° und 180°.',
        'servo',
        20,
        'g',
      ),
      makeWireStep(
        'pg-srv-v',
        'Servo-Stromversorgung (+V) anschließen',
        'Verbinde Spalte 21 (Reihe j) mit der Plus-Schiene (21 +top).',
        'Versorgt den internen Getriebemotor des Servos.',
        { kind: 'breadboard', col: 21, row: 'j' },
        { kind: 'breadboard', col: 21, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'pg-srv-g',
        'Servo-Masse (GND) anschließen',
        'Verbinde Spalte 22 (Reihe j) mit der Minus-Schiene (22 -top).',
        'Gemeinsame Masse mit dem Board ist Pflicht für stabiles PWM-Timing!',
        { kind: 'breadboard', col: 22, row: 'j' },
        { kind: 'breadboard', col: 22, row: '-top' },
        '#1e293b',
      ),
      makeWireStep(
        'pg-srv-pwm',
        'PWM-Steuerleitung anschließen — Servo bewegt sich!',
        'Verbinde Ausgang 1 (outA) am Board mit Spalte 20 (Reihe f).',
        '50-Hz-Steuerpulse positionieren den Servo-Arm exakt nach Winkel.',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 20, row: 'f' },
        '#f97316',
      ),
    ],
  },

  // =========================================================================
  // PROJEKT 10: Smart-Kühlung (5V Lüfter + WS2812B NeoPixel-Statusring)
  // =========================================================================
  {
    id: 'guided-fan-neopixel',
    title: 'Smart-Kühlung: 5V Lüfter + NeoPixel-Ring',
    difficulty: 'Smart Home',
    durationLabel: '9 Schritte · ~4 Min.',
    summary:
      'Baue eine stylische Raspberry-Pi-/ESP32-Kühlstation mit drehendem 5V-Lüfter und 8-LED WS2812B Regenbogen-Ring!',
    completionMessage:
      '🌀 Cooler geht’s nicht! Dein 5V-Lüfter dreht auf Hochtouren und der 8-LED WS2812B NeoPixel-Ring glüht im Regenbogen-Look (probier „Raum dunkel“!).',
    steps: [
      makeWireStep(
        'fn-vcc',
        'Plus-Schiene versorgen',
        'Verbinde 3V3 am Board mit der Plus-Schiene (Spalte 2, +top).',
        'Liefert die Versorgung für den NeoPixel-Ring.',
        { kind: 'board', boardPinRole: '3V3' },
        { kind: 'breadboard', col: 2, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'fn-gnd',
        'GND-Schiene verbinden',
        'Verbinde GND am Board mit der Minus-Schiene (Spalte 3, -top).',
        'Gemeinsame Masse für Lüfter und WS2812B-Ring.',
        { kind: 'board', boardPinRole: 'GND' },
        { kind: 'breadboard', col: 3, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'fn-fan',
        '5V Axiallüfter bei Spalte 7 stecken',
        'Klicke auf Spalte 7 (7 = +5V/PWM, 9 = GND).',
        'Sorgt für aktiven Luftstrom über dem Raspberry Pi oder ESP-Gehäuse.',
        'cooling-fan',
        7,
        'g',
      ),
      makeWireStep(
        'fn-fan-sig',
        'Lüfter-Steuerleitung an Ausgang 1 anschließen',
        'Verbinde Ausgang 1 (outA) mit Spalte 7 (Reihe f).',
        'Schaltet den Lüfter aktiv.',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 7, row: 'f' },
        '#38bdf8',
      ),
      makeWireStep(
        'fn-fan-gnd',
        'Lüfter-Masse an GND — Rotor dreht los!',
        'Verbinde Spalte 9 (Reihe j) mit der Minus-Schiene (9 -top).',
        'Sofort läuft der 3D-Lüfter an!',
        { kind: 'breadboard', col: 9, row: 'j' },
        { kind: 'breadboard', col: 9, row: '-top' },
        '#1e293b',
      ),
      makePartStep(
        'fn-ring',
        'WS2812B NeoPixel-Ring bei Spalte 18 stecken',
        'Klicke auf Spalte 18 (18 = 5V/3V3, 19 = DIN, 20 = GND).',
        '8 einzeln adressierbare RGB-LEDs — perfekt für Temperatur-Farbverläufe!',
        'neopixel-ring',
        18,
        'g',
      ),
      makeWireStep(
        'fn-ring-v',
        'NeoPixel-Ring mit Plus versorgen',
        'Verbinde Spalte 18 (Reihe j) mit der Plus-Schiene (18 +top).',
        'Versorgt alle 8 LED-Treiber-ICs im Ring.',
        { kind: 'breadboard', col: 18, row: 'j' },
        { kind: 'breadboard', col: 18, row: '+top' },
        '#ef4444',
      ),
      makeWireStep(
        'fn-ring-g',
        'NeoPixel-Ring an GND anschließen',
        'Verbinde Spalte 20 (Reihe j) mit der Minus-Schiene (20 -top).',
        'Schließt den Stromkreis des LED-Rings.',
        { kind: 'breadboard', col: 20, row: 'j' },
        { kind: 'breadboard', col: 20, row: '-top' },
        '#1e293b',
      ),
      makeWireStep(
        'fn-ring-din',
        'Datenleitung (DIN) anschließen — Regenbogen startet!',
        'Verbinde Ausgang 2 (outB) am Board mit Spalte 19 (Reihe f).',
        'Über diese einzige 800-kHz-Datenleitung leuchten alle 8 RGB-LEDs im Regenbogen!',
        { kind: 'board', boardPinRole: 'outB' },
        { kind: 'breadboard', col: 19, row: 'f' },
        '#22c55e',
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
