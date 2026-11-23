import { getEspBoardById } from '../engine/BoardCatalog';
import type {
  CircuitParameters,
  CircuitTopologyId,
  EspBoardId,
  RemovablePartDef,
} from '../engine/types';
import { buildExpandedLessons } from './ExpandedLessons';

export interface LessonFormula {
  label: string;
  expression: string;
}

export interface LessonChallenge {
  id: string;
  text: string;
  hint: string;
}

export type LessonCategory =
  | 'Grundlagen'
  | 'PWM & Leistung'
  | 'Sensoren & Busse'
  | 'Aktoren'
  | 'WLED & LED-Streifen'
  | 'Raspberry Pi'
  | 'Arduino Praxis'
  | 'Smart Home & IoT';

export interface LessonDefinition {
  id: string;
  topology?: CircuitTopologyId;
  number: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  category: LessonCategory;
  recommendedBoardId?: EspBoardId;
  difficulty: 'Einstieg' | 'Grundlagen' | 'Fortgeschritten' | 'Profi';
  pinRole: string;
  getPrimaryPin: (boardId: EspBoardId) => string;
  summary: string;
  keyTakeaways: string[];
  formulas: LessonFormula[];
  challenges: LessonChallenge[];
  removableParts: RemovablePartDef[];
  defaultParams: Partial<CircuitParameters>;
  cameraPreset: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

const DEFAULT_CAMERA: { position: [number, number, number]; target: [number, number, number] } = {
  position: [1.6, 14.4, 18.8],
  target: [0.0, 0.5, 0.15],
};

const WLED_CAMERA: { position: [number, number, number]; target: [number, number, number] } = {
  position: [-0.8, 17.8, 25.2],
  target: [-1.35, 0.5, 0.25],
};

const BASE_LESSONS: LessonDefinition[] = [
  {
    id: 'led-resistor',
    number: '01',
    title: 'LED & Vorwiderstand',
    shortTitle: 'LED & Widerstand',
    subtitle: 'Ohmsches Gesetz, Durchlassspannung und Strombegrenzung',
    category: 'Grundlagen',
    difficulty: 'Einstieg',
    pinRole: 'Digital Output (3,3 V)',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio}`,
    summary:
      'Eine LED hat oberhalb ihrer Durchlassspannung (Vf) kaum Eigenwiderstand. Ohne Vorwiderstand fließt ein zerstörerischer Überstrom, der LED und ESP-Pin beschädigt.',
    keyTakeaways: [
      'Der Vorwiderstand übernimmt die Restspannung: U_R = 3,3 V − Vf.',
      'Der Strom folgt dem Ohmschen Gesetz: I = (3,3 V − Vf) / R.',
      'Halte den Strom unter 20 mA (ideal: 5–15 mA).',
      'Klicke ein Bauteil an oder entferne es im Inspector, um den offenen Stromkreis zu testen!',
    ],
    formulas: [
      { label: 'LED-Strom', expression: 'I = (3,3 V − V_f) / R' },
      { label: 'Mindest-R (20 mA)', expression: 'R_min = (3,3 V − V_f) / 0,02 A' },
      { label: 'Leistung', expression: 'P = U · I' },
    ],
    challenges: [
      {
        id: 'led-remove',
        text: 'Entferne den Vorwiderstand R1 und beobachte Strom & LED in der 3D-Szene.',
        hint: 'Klicke direkt auf den Widerstand in 3D oder auf den Button „Entfernen“.',
      },
      {
        id: 'led-overload',
        text: 'Wähle 33 Ω, um die Überstrom-Warnung (> 20 mA) zu erleben.',
        hint: 'Beobachte den Warnhinweis und die Live-Erklärung.',
      },
    ],
    removableParts: [
      {
        id: 'resistor',
        label: 'Vorwiderstand R1',
        shortLabel: 'Widerstand R1',
        role: 'Begrenzt den Strom durch die LED',
        removedEffectHint: 'Reihenschaltung unterbrochen → 0 mA, LED aus',
      },
      {
        id: 'led',
        label: '5mm-LED',
        shortLabel: '5mm-LED',
        role: 'Wandelt elektrischen Strom in Licht um',
        removedEffectHint: 'Offener Stromkreis → 0 mA am GPIO',
      },
    ],
    defaultParams: {
      topology: 'led-resistor',
      gpioOutputHigh: true,
      ledColor: 'red',
      resistorOhms: 220,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'button-pull',
    number: '02',
    title: 'Taster: Pull-Down, Pull-Up & Floating',
    shortTitle: 'Taster & Pull-Up',
    subtitle: 'Warum offene GPIOs zufällig schalten (50 Hz Störrauschen)',
    category: 'Grundlagen',
    difficulty: 'Grundlagen',
    pinRole: 'Digital Input (Schmitt-Trigger)',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.inputA.gpio}`,
    summary:
      'Ein hochohmiger ESP-Eingang ohne Pull-Widerstand wirkt wie eine Antenne. Erst Pull-Down (nach GND) oder Pull-Up (nach 3,3 V) definiert einen stabilen Ruhezustand.',
    keyTakeaways: [
      'Pull-Down: Ruhe LOW (0 V), gedrückt HIGH (3,3 V).',
      'Pull-Up (Active-Low): Ruhe HIGH (3,3 V), gedrückt LOW (0 V).',
      'Entferne den Pull-Widerstand im Pull-Down/Up-Modus — sofort bricht 50-Hz-Rauschen herein!',
    ],
    formulas: [
      { label: 'HIGH-Schwelle', expression: 'V_IH ≥ 2,48 V' },
      { label: 'LOW-Schwelle', expression: 'V_IL ≤ 0,83 V' },
      { label: 'Querstrom', expression: 'I = 3,3 V / R_pull' },
    ],
    challenges: [
      {
        id: 'btn-remove-pull',
        text: 'Wechsle auf Pull-Down und entferne dann den Pull-Widerstand live aus dem Steckbrett!',
        hint: 'Der zuvor ruhige 0-V-Pegel springt sofort in wildes 50-Hz-Floating.',
      },
    ],
    removableParts: [
      {
        id: 'pull-resistor',
        label: 'Pull-Widerstand',
        shortLabel: 'Pull-Widerstand',
        role: 'Definiert eindeutigen Ruhepegel (LOW oder HIGH)',
        removedEffectHint: 'Pin schwebt sofort (50-Hz-Floating-Rauschen!)',
      },
      {
        id: 'button',
        label: 'Kurzhub-Taster',
        shortLabel: '3D-Taster',
        role: 'Schließt beim Drücken den Schaltkontakt',
        removedEffectHint: 'Schaltkontakt fehlt, Eingang bleibt im Ruhezustand',
      },
    ],
    defaultParams: {
      topology: 'button-pull',
      pullMode: 'pull-down',
      pullResistorOhms: 10000,
      buttonPressed: false,
      noiseAmplitude: 1.0,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'voltage-divider',
    number: '03',
    title: 'Spannungsteiler & ESP32-ADC',
    shortTitle: 'Spannungsteiler & ADC',
    subtitle: 'Analoge Messung mit zwei Widerständen oder Fotowiderstand (LDR)',
    category: 'Grundlagen',
    difficulty: 'Grundlagen',
    pinRole: 'Analog Input (12-Bit ADC)',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.adc.gpio} (ADC)`,
    summary:
      'Zwei Widerstände (R1 und R2) teilen 3,3 V auf eine beliebige Zwischenspannung herunter. Der 12-Bit-ADC wandelt sie in 4096 digitale Stufen (0–4095) um.',
    keyTakeaways: [
      'Teilerformel: V_out = 3,3 V · R2 / (R1 + R2).',
      'Ziehe R1 heraus → V_out fällt auf 0 V; ziehe R2/LDR heraus → V_out springt auf 3,30 V!',
      'Mit einem Fotowiderstand (LDR) als R2 entsteht ein Lichtsensor.',
    ],
    formulas: [
      { label: 'Ausgangsspannung', expression: 'V_out = V_CC · R2 / (R1 + R2)' },
      { label: '12-Bit ADC', expression: 'ADC = round(V_out / 3,3 V · 4095)' },
    ],
    challenges: [
      {
        id: 'div-remove',
        text: 'Entferne R2 (oder den LDR) und sieh zu, wie der ADC sofort auf 4095 (3,30 V) springt.',
        hint: 'Ohne R2 kann kein Strom abfließen — am offenen Ende von R1 liegen volle 3,3 V.',
      },
    ],
    removableParts: [
      {
        id: 'r1',
        label: 'Oberer Widerstand R1',
        shortLabel: 'Widerstand R1',
        role: 'Verbindet Mittelabgriff mit +3,3 V',
        removedEffectHint: 'V_out fällt über R2 auf 0,00 V (ADC = 0)',
      },
      {
        id: 'r2',
        label: 'Unteres Bauteil (R2 / LDR)',
        shortLabel: 'R2 / LDR',
        role: 'Teilt Spannung gegen GND herunter',
        removedEffectHint: 'V_out springt auf volle 3,30 V (ADC = 4095)',
      },
    ],
    defaultParams: {
      topology: 'voltage-divider',
      dividerMode: 'resistors',
      r1Ohms: 10000,
      r2Ohms: 10000,
      lightLevelPercent: 55,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'pwm-dimmer',
    number: '04',
    title: 'PWM-Dimming (LEDC-Controller)',
    shortTitle: 'PWM-Dimmer',
    subtitle: 'Helligkeitssteuerung über Tastgrad (Duty-Cycle)',
    category: 'PWM & Leistung',
    difficulty: 'Einstieg',
    pinRole: 'LEDC PWM Output',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio} (PWM)`,
    summary:
      'Der ESP32 schaltet den GPIO tausende Male pro Sekunde zwischen 0 V und 3,3 V um. Über das Verhältnis von Ein- zu Ausschaltzeit (Duty-Cycle) dimmt die LED stufenlos.',
    keyTakeaways: [
      'Die Spitzenspannung bleibt stets 3,3 V — nur die Pulsbreite ändert sich.',
      'Effektive Mittelspannung: U_eff = 3,3 V · Duty-Cycle.',
    ],
    formulas: [
      { label: 'Tastgrad', expression: 'Duty = t_ON / T · 100 %' },
      { label: 'Mittelspannung', expression: 'U_avg = 3,3 V · (Duty / 100)' },
    ],
    challenges: [
      {
        id: 'pwm-25',
        text: 'Stelle 25 % Duty-Cycle ein und beobachte die schmalen Pulse im Oszilloskop.',
        hint: 'Die blaue LED dimmt sanft herunter, während die Amplitude bei 3,3 V bleibt.',
      },
    ],
    removableParts: [
      {
        id: 'resistor',
        label: '220 Ω Vorwiderstand',
        shortLabel: 'Widerstand 220 Ω',
        role: 'Begrenzt Spitzenstrom der gepulsten LED',
        removedEffectHint: 'PWM läuft am Pin weiter, aber LED bleibt dunkel',
      },
    ],
    defaultParams: {
      topology: 'pwm-dimmer',
      pwmDutyPercent: 45,
      pwmFrequencyHz: 1000,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'rgb-led',
    number: '05',
    title: 'RGB-LED & 3-Kanal-Farbmischung',
    shortTitle: 'RGB-LED',
    subtitle: 'Additive Farbmischung mit drei PWM-Kanälen und eigenen Vorwiderständen',
    category: 'PWM & Leistung',
    difficulty: 'Grundlagen',
    pinRole: '3× LEDC PWM (R / G / B)',
    getPrimaryPin: (b) => {
      const p = getEspBoardById(b).pins;
      return `G${p.outA.gpio}/G${p.outB.gpio}/G${p.outC.gpio}`;
    },
    summary:
      'Eine Common-Cathode-RGB-LED vereint drei getrennte Leuchtdioden (Rot, Grün, Blau) in einem Gehäuse. Jeder Farbkanal benötigt einen eigenen Vorwiderstand.',
    keyTakeaways: [
      'Rot, Grün und Blau haben unterschiedliche Durchlassspannungen (2,0 V / 2,2 V / 3,0 V).',
      'Ziehe einen der drei Vorwiderstände heraus, um gezielt einen Farbkanal abzuschalten!',
    ],
    formulas: [
      { label: 'Gesamtstrom', expression: 'I_ges = I_R + I_G + I_B' },
      { label: 'Farbraum', expression: '256 × 256 × 256 = 16,7 Mio.' },
    ],
    challenges: [
      {
        id: 'rgb-remove',
        text: 'Stelle Warmweiß ein und entferne dann den Blau-Widerstand (100 Ω).',
        hint: 'Die Mischfarbe kippt sofort ins reine Gelb (Rot + Grün).',
      },
    ],
    removableParts: [
      { id: 'r-red', label: 'Vorwiderstand Rot (220 Ω)', shortLabel: 'R Rot', role: 'Rot-Kanal', removedEffectHint: 'Rotanteil fällt weg' },
      { id: 'r-green', label: 'Vorwiderstand Grün (220 Ω)', shortLabel: 'R Grün', role: 'Grün-Kanal', removedEffectHint: 'Grünanteil fällt weg' },
      { id: 'r-blue', label: 'Vorwiderstand Blau (100 Ω)', shortLabel: 'R Blau', role: 'Blau-Kanal', removedEffectHint: 'Blauanteil fällt weg' },
    ],
    defaultParams: {
      topology: 'rgb-led',
      rgbRed: 40,
      rgbGreen: 210,
      rgbBlue: 255,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'rc-lowpass',
    number: '06',
    title: 'RC-Tiefpass & Kondensator-Ladekurve',
    shortTitle: 'RC-Tiefpass',
    subtitle: 'Zeitkonstante τ = R · C, Laden/Entladen und Signalglättung',
    category: 'Grundlagen',
    difficulty: 'Fortgeschritten',
    pinRole: 'RC-Filter → ADC',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.adc.gpio} (U_C)`,
    summary:
      'Ein Widerstand und ein Kondensator bilden einen Tiefpassfilter. Die Spannung am Kondensator folgt einem Eingangssprung nicht schlagartig, sondern entlang einer e-Funktion.',
    keyTakeaways: [
      'Zeitkonstante τ = R · C bestimmt die Lade- und Entladegeschwindigkeit.',
      'Entferne den Kondensator → die weiche Ladekurve wird sofort wieder ein hartes Rechteck!',
    ],
    formulas: [
      { label: 'Zeitkonstante', expression: 'τ = R · C' },
      { label: 'Ladekurve', expression: 'U_C(t) = V_CC · (1 − e^(−t / τ))' },
    ],
    challenges: [
      {
        id: 'rc-remove-c',
        text: 'Entferne den Elektrolyt-Kondensator während der Auto-Puls läuft.',
        hint: 'Beobachte im Oszilloskop, wie die abgerundete e-Kurve sofort eckig wird.',
      },
    ],
    removableParts: [
      { id: 'resistor', label: 'Ladewiderstand R', shortLabel: 'Widerstand R', role: 'Begrenzt Ladestrom in C', removedEffectHint: 'Kondensator wird nicht mehr geladen' },
      { id: 'capacitor', label: 'Elektrolyt-Kondensator C', shortLabel: 'Kondensator C', role: 'Speichert Ladung & glättet Flanken', removedEffectHint: 'Keine Glättung → harte Rechtecksprünge!' },
    ],
    defaultParams: {
      topology: 'rc-lowpass',
      rcInputHigh: true,
      rcAutoPulse: true,
      rcResistorOhms: 10000,
      rcCapacitorUf: 47,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'mosfet-driver',
    number: '07',
    title: 'N-Kanal MOSFET Lasttreiber',
    shortTitle: 'MOSFET Treiber',
    subtitle: 'Hohe Ströme & 12 V / 24 V Lasten sicher über einen 3,3 V GPIO schalten',
    category: 'PWM & Leistung',
    difficulty: 'Fortgeschritten',
    pinRole: 'Logic-Level MOSFET Gate',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio} (Gate)`,
    summary:
      'Ein ESP-Pin verträgt nur 20 mA bei 3,3 V. Mit einem Logic-Level-N-Kanal-MOSFET steuert der Mikrocontroller praktisch leistungslos Lasten von mehreren Ampere.',
    keyTakeaways: [
      'Ein 10 kΩ Gate-Pulldown nach GND verhindert zufälliges Einschalten beim ESP-Boot.',
      'Entferne den Gate-Pulldown bei LOW → das isolierte Gate schwebt und die Last flackert gefährlich!',
    ],
    formulas: [
      { label: 'Laststrom', expression: 'I_Last = V_Last / (R_Last + R_DS(on))' },
      { label: 'Verlustleistung', expression: 'P_MOSFET = I² · R_DS(on)' },
    ],
    challenges: [
      {
        id: 'mosfet-floating',
        text: 'Schalte das Gate auf LOW und entferne den 10 kΩ Gate-Pulldown.',
        hint: 'Beobachte das unkontrollierte Floating-Gate-Flackern im Oszilloskop!',
      },
    ],
    removableParts: [
      { id: 'gate-pulldown', label: '10 kΩ Gate-Pulldown', shortLabel: 'Gate-Pulldown', role: 'Entlädt die Gate-Kapazität sicher nach GND', removedEffectHint: 'Floating Gate → MOSFET flackert & überhitzt!' },
      { id: 'mosfet', label: 'IRLZ44N MOSFET (TO-220)', shortLabel: 'MOSFET', role: 'Schaltet den hohen Laststrom nach GND', removedEffectHint: 'Lastkreis unterbrochen → 0 mA' },
    ],
    defaultParams: {
      topology: 'mosfet-driver',
      mosfetGateHigh: true,
      mosfetLoadVoltage: 12,
      mosfetLoadOhms: 24,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'i2c-bme280',
    number: '08',
    title: 'I²C-Bus & BME280 Umweltsensor',
    shortTitle: 'I²C & BME280',
    subtitle: 'Zweidraht-Datenbus (SDA/SCL) mit 4,7 kΩ Pull-Up-Widerständen',
    category: 'Sensoren & Busse',
    difficulty: 'Grundlagen',
    pinRole: 'I²C Bus (SDA / SCL)',
    getPrimaryPin: (b) => {
      const p = getEspBoardById(b).pins;
      return `SDA G${p.sda.gpio} / SCL G${p.scl.gpio}`;
    },
    summary:
      'Über den I²C-Bus kommuniziert der ESP32 mit dutzenden Sensoren über nur zwei Leitungen. Da I²C Open-Drain arbeitet, sind 4,7 kΩ Pull-Ups nach 3,3 V zwingend notwendig.',
    keyTakeaways: [
      'Jeder I²C-Slave hat eine eindeutige 7-Bit-Adresse (BME280: 0x76).',
      'Ohne Pull-Up-Widerstände bleiben die Leitungen auf LOW hängen — der Bus bricht ab.',
    ],
    formulas: [
      { label: 'Bus-Takt', expression: 'f_SCL = 100 kHz / 400 kHz' },
      { label: 'Pull-Up', expression: 'R_pullup = 4,7 kΩ (nach 3,3 V)' },
    ],
    challenges: [
      {
        id: 'i2c-pullup',
        text: 'Entferne die 4,7 kΩ Pull-Ups oder den BME280-Sensor und vergleiche beide Fehlerbilder!',
        hint: 'Ohne Pull-Ups sackt die Spannung ab; ohne Sensor bleibt sie konstant auf 3,3 V (NACK).',
      },
    ],
    removableParts: [
      { id: 'i2c-pullups', label: '4,7 kΩ I²C Pull-Ups', shortLabel: 'I²C Pull-Ups', role: 'Ziehen Open-Drain SDA/SCL auf 3,3 V', removedEffectHint: 'Bus bricht zusammen (Floating LOW)' },
      { id: 'bme280', label: 'BME280 Sensor-Breakout', shortLabel: 'BME280', role: 'Liefert Temperatur, Feuchte & Druck', removedEffectHint: 'I²C NACK — keine Antwort auf 0x76' },
    ],
    defaultParams: {
      topology: 'i2c-bme280',
      bmeTempC: 22.4,
      bmeHumidityPct: 48,
      bmePressureHpa: 1013,
      i2cPullupEnabled: true,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'ultrasonic-hcsr04',
    number: '09',
    title: 'Ultraschall-Sensor (HC-SR04) & Pegelwandler',
    shortTitle: 'HC-SR04 Ultraschall',
    subtitle: 'Schalllaufzeitmessung und 5 V → 3,3 V Schutz-Spannungsteiler am ECHO-Pin',
    category: 'Sensoren & Busse',
    difficulty: 'Grundlagen',
    pinRole: 'TRIG Out / ECHO In (3,3 V)',
    getPrimaryPin: (b) => `ECHO G${getEspBoardById(b).pins.inputA.gpio}`,
    summary:
      'Der HC-SR04 sendet 40-kHz-Ultraschallimpulse und misst die Echo-Laufzeit. Weil ECHO 5 V ausgibt, schützt ein 1 kΩ / 2 kΩ Spannungsteiler den 3,3 V ESP-Eingang.',
    keyTakeaways: [
      'Schallgeschwindigkeit: ~343 m/s (58,2 µs pro cm Hin- und Rückweg).',
      'Entferne den 2 kΩ Schutz-Widerstand → sofort 5 V Überspannungs-Alarm am ESP32!',
    ],
    formulas: [
      { label: 'Entfernung', expression: 'd [cm] = t_echo [µs] / 58,2' },
      { label: 'ECHO-Schutz', expression: '5 V · 2 kΩ / (1 kΩ + 2 kΩ) = 3,33 V' },
    ],
    challenges: [
      {
        id: 'us-remove-div',
        text: 'Entferne den 2-kΩ-Teilerwiderstand, um die 5-V-Überspannungs-Warnung zu sehen.',
        hint: 'So siehst du, warum der Spannungsteiler beim 3,3-V-ESP32 lebenswichtig ist.',
      },
    ],
    removableParts: [
      { id: 'echo-divider', label: '2 kΩ Schutz-Widerstand (ECHO)', shortLabel: '2 kΩ Schutz-R', role: 'Teilt 5 V ECHO-Pegel auf 3,33 V herunter', removedEffectHint: 'GEFAHR: 5,0 V schlagen direkt an den 3,3 V GPIO!' },
      { id: 'hcsr04', label: 'HC-SR04 Ultraschall-Modul', shortLabel: 'HC-SR04', role: 'Sendet & empfängt 40 kHz Ultraschall', removedEffectHint: 'Kein Echo-Signal (Timeout)' },
    ],
    defaultParams: {
      topology: 'ultrasonic-hcsr04',
      ultrasonicDistanceCm: 65,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'ld2490-radar',
    number: '10',
    title: 'LD2490 24 GHz mmWave Präsenz-Radar',
    shortTitle: 'LD2490 Radar',
    subtitle: 'Hochpräzise Anwesenheits-, Atem- & Distanzerkennung via UART und OUT-Pin',
    category: 'Sensoren & Busse',
    difficulty: 'Profi',
    pinRole: 'UART (TX/RX) + Digital OUT',
    getPrimaryPin: (b) => {
      const p = getEspBoardById(b).pins;
      return `OUT G${p.inputA.gpio} · UART G${p.uartTx.gpio}/G${p.uartRx.gpio}`;
    },
    summary:
      'Der 24-GHz-mmWave-Radarsensor HLK-LD2490 erkennt selbst still sitzende Personen anhand minimaler Atembewegungen und meldet Distanz & Energie per UART (256000 Baud) sowie HIGH/LOW am OUT-Pin.',
    keyTakeaways: [
      '24-GHz-Wellen erkennen sowohl Bewegung als auch statische Atem-Präsenz.',
      'UART TX/RX immer gekreuzt anschließen (LD2490 TX → ESP RX).',
      'Über Entfernungs-Gates lassen sich Nachbarräume sauber ausblenden.',
    ],
    formulas: [
      { label: 'Wellenlänge', expression: 'λ = c / 24 GHz ≈ 12,5 mm' },
      { label: 'UART-Baudrate', expression: '256.000 bps (8N1)' },
    ],
    challenges: [
      {
        id: 'ld2490-static',
        text: 'Deaktiviere „Bewegung“ bei aktiver Präsenz — der LD2490 hält OUT trotzdem auf HIGH!',
        hint: 'Teste auch, was passiert, wenn du die OUT-Leitung oder das Modul entfernst.',
      },
    ],
    removableParts: [
      { id: 'ld2490', label: 'HLK-LD2490 Radar-Modul', shortLabel: 'LD2490 Modul', role: '24 GHz mmWave Sende-/Empfangsmodul', removedEffectHint: 'Keine Radarwellen, offener Eingang schwebt' },
      { id: 'radar-out-wire', label: 'OUT-Signalleitung', shortLabel: 'OUT-Kabel', role: 'Überträgt Hardware-Präsenzpegel (3,3 V)', removedEffectHint: 'ESP-Eingang schwebt (Floating), obwohl Radar erkennt' },
    ],
    defaultParams: {
      topology: 'ld2490-radar',
      ld2490TargetDistanceM: 2.1,
      ld2490ThresholdM: 3.5,
      ld2490TargetMoving: true,
      ld2490TargetPresent: true,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'relay-flyback',
    number: '11',
    title: 'Relais-Treiber & Freilaufdiode (1N4007)',
    shortTitle: 'Relais & Freilaufdiode',
    subtitle: 'Induktive Abschaltspitzen (Flyback) verstehen und sicher ableiten',
    category: 'Aktoren',
    difficulty: 'Fortgeschritten',
    pinRole: 'Transistor / Relais-Spule',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio} (Relais)`,
    summary:
      'Beim Abschalten einer Relaisspule erzwingt das zusammenbrechende Magnetfeld eine hohe Gegenspannung (U = −L·dI/dt). Die antiparallele 1N4007-Freilaufdiode schützt die Elektronik.',
    keyTakeaways: [
      'Entferne die 1N4007-Freilaufdiode und schalte das Relais AUS → roter Kickback-Spike!',
      'Mit 1N4007 wird die Energie lautlos im Spulenkreis abgebaut.',
    ],
    formulas: [
      { label: 'Induktionsspannung', expression: 'U_ind = −L · (dI / dt)' },
      { label: 'Spulenstrom', expression: 'I_Spule = 5 V / 70 Ω ≈ 71 mA' },
    ],
    challenges: [
      {
        id: 'relay-spike',
        text: 'Entferne die 1N4007-Diode und schalte das Relais AUS (Leertaste oder Button).',
        hint: 'Achte auf den roten Funken am Relais und die gedämpfte Spitze im Oszilloskop!',
      },
    ],
    removableParts: [
      { id: 'flyback-diode', label: '1N4007 Freilaufdiode', shortLabel: '1N4007 Diode', role: 'Leitet induktive Abschaltspitzen ab', removedEffectHint: 'Zerstörerischer Kickback-Spike beim Abschalten!' },
    ],
    defaultParams: {
      topology: 'relay-flyback',
      relayEnergized: true,
      relayFlybackDiode: true,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'servo-pwm',
    number: '12',
    title: 'SG90 Mikro-Servo (50 Hz PWM)',
    shortTitle: 'SG90 Servo',
    subtitle: 'Präzise Winkelpositionierung (0°–180°) über 0,5–2,5 ms Steuerpulse',
    category: 'Aktoren',
    difficulty: 'Einstieg',
    pinRole: '50 Hz Servo PWM',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio} (Servo)`,
    summary:
      'Ein Modellbau-Servo besitzt ein internes Potentiometer und einen Regelkreis. Über die Pulsbreite eines 50-Hz-Signals fährt der 3D-Servo-Arm exakt den Zielwinkel an.',
    keyTakeaways: [
      '0,5 ms ≈ 0°, 1,5 ms = 90° Mittelstellung, 2,5 ms ≈ 180°.',
      'Servo-Stromversorgung immer über 5 V, gemeinsame Masse (GND) mit dem ESP.',
    ],
    formulas: [
      { label: 'Periode', expression: 'T = 1 / 50 Hz = 20 ms' },
      { label: 'Pulsbreite', expression: 't_puls = 0,5 ms + (α / 180°) · 2,0 ms' },
    ],
    challenges: [
      {
        id: 'servo-sweep',
        text: 'Fahre den Servo von 0° auf 180° und teste das Entfernen der orangen Steuerleitung.',
        hint: 'Ohne Steuerleitung stoppt die Regelung sofort.',
      },
    ],
    removableParts: [
      { id: 'servo-signal', label: 'Orange PWM-Steuerleitung', shortLabel: 'PWM-Kabel', role: 'Überträgt 50-Hz-Sollwinkel-Pulse', removedEffectHint: 'Servo erhält keine Positionspulse mehr' },
    ],
    defaultParams: {
      topology: 'servo-pwm',
      servoAngleDeg: 90,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'piezo-buzzer',
    number: '13',
    title: 'Piezo-Buzzer & Tonfrequenzen',
    shortTitle: 'Piezo-Buzzer',
    subtitle: 'Schallerzeugung mit Rechteck-Frequenzen über den ESP32-LEDC-Timer',
    category: 'Aktoren',
    difficulty: 'Einstieg',
    pinRole: 'Tone / LEDC Output',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio} (Tone)`,
    summary:
      'Ein passiver Piezo-Summer schwingt mechanisch im Takt einer Rechteckspannung. Über die Frequenz lassen sich exakte Musiknoten oder Warntöne erzeugen.',
    keyTakeaways: [
      'Kammerton A4 = 440 Hz, eine Oktave höher A5 = 880 Hz.',
      'Der 100 Ω Schutzwiderstand dämpft kapazitive Stromspitzen am GPIO.',
    ],
    formulas: [
      { label: 'Periodendauer', expression: 'T = 1 / f' },
      { label: 'A4-Referenz', expression: 'f(A4) = 440 Hz (2,27 ms)' },
    ],
    challenges: [
      {
        id: 'buzzer-notes',
        text: 'Probiere verschiedene Noten-Presets und beobachte die Frequenzstauchung im Oszilloskop.',
        hint: 'Entferne den 100-Ω-Widerstand, um den Piezo stummzuschalten.',
      },
    ],
    removableParts: [
      { id: 'resistor', label: '100 Ω Schutzwiderstand', shortLabel: 'Widerstand 100 Ω', role: 'Begrenzt kapazitive Umladeströme', removedEffectHint: 'Piezo getrennt → bleibt stumm' },
    ],
    defaultParams: {
      topology: 'piezo-buzzer',
      buzzerEnabled: true,
      buzzerFrequencyHz: 880,
    },
    cameraPreset: DEFAULT_CAMERA,
  },

  // === 3 NEUE WLED-BEISPIELE MIT VERSCHIEDENEN STREIFENLÄNGEN ===
  {
    id: 'wled-compact',
    number: '14',
    title: 'WLED Kompakt-Streifen (16 LEDs / 0,5 m)',
    shortTitle: 'WLED Kurz (16 LEDs)',
    subtitle: 'Adressierbarer WS2812B-Streifen mit 330 Ω Datenwiderstand & 1000 µF Elko',
    category: 'WLED & LED-Streifen',
    difficulty: 'Einstieg',
    pinRole: 'WLED Data Out (800 kHz)',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio} (WLED DIN)`,
    summary:
      'Ein kurzer 0,5-m-WS2812B-Streifen (16 LEDs) für Schreibtisch- oder Regal-Akzente mit WLED. Ein 330 Ω Serienwiderstand vor DIN und ein 1000 µF Stützkondensator an 5 V / GND bilden das Pflicht-Basis-Setup.',
    keyTakeaways: [
      'Jede WS2812B-LED zieht bis zu ~60 mA bei Vollweiß (16 LEDs ≈ max. 0,96 A / 4,8 W).',
      'Der 330 Ω Widerstand dämpft Signalreflexionen auf der 800-kHz-Datenleitung.',
      'Der 1000 µF Kondensator verhindert ESP32-Brownouts bei schnellen Effektsprüngen.',
      'Passe die Streifenlänge flexibel von 8 bis 45 LEDs an!',
    ],
    formulas: [
      { label: 'Max. Strom (Weiß)', expression: 'I_max ≈ N_LEDs · 60 mA' },
      { label: 'Datenrate', expression: '800 kHz NRZ (24 Bit / LED)' },
    ],
    challenges: [
      {
        id: 'wled-compact-r',
        text: 'Entferne den 330 Ω Datenwiderstand und beobachte die Farb-Glitches & Überschwinger!',
        hint: 'Klicke direkt auf den Widerstand im 3D-Steckbrett oder im Diagnose-Panel.',
      },
      {
        id: 'wled-compact-white',
        text: 'Schalte auf „Vollweiß“ bei 100 % Helligkeit und prüfe den Stromsprung im HUD.',
        hint: 'Bei Vollweiß leuchten R, G und B gleichzeitig — der Strom verdoppelt sich.',
      },
    ],
    removableParts: [
      { id: 'meanwell-power', label: 'Mean Well 5V Akku / Netzteil', shortLabel: 'Mean Well PSU/Akku', role: 'Liefert geregelte 5 V Hochstrom-Leistung', removedEffectHint: 'Kompletter Stromausfall — Streifen aus (0,00 V)' },
      { id: 'data-resistor', label: '330 Ω Datenwiderstand', shortLabel: '330 Ω Daten-R', role: 'Dämpft 800-kHz-Reflexionen vor DIN', removedEffectHint: 'Ringing im Oszilloskop & zufällige LED-Glitches!' },
      { id: 'buffer-cap', label: '1000 µF Stützkondensator', shortLabel: '1000 µF Elko', role: 'Puffert 5V-Stromspitzen am Streifen', removedEffectHint: 'Versorgungs-Ripples & Brownout-Gefahr' },
    ],
    defaultParams: {
      topology: 'wled-compact',
      wledLedCount: 16,
      wledBrightnessPct: 80,
      wledEffect: 'rainbow',
      wledPowerInjection: false,
      wledCurrentLimitMa: 1500,
      wledPowerSource: 'meanwell-battery',
    },
    cameraPreset: WLED_CAMERA,
  },
  {
    id: 'wled-medium',
    number: '15',
    title: 'WLED Raum-Streifen (60 LEDs / 2 m) & Pegelwandler',
    shortTitle: 'WLED Mittel (60 LEDs)',
    subtitle: '74AHCT125 Pegelwandler (3,3 V → 5 V), Netzteil-Berechnung & WLED-Strombegrenzer',
    category: 'WLED & LED-Streifen',
    difficulty: 'Fortgeschritten',
    pinRole: 'WLED DIN → 74AHCT125 (5 V)',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio} → 5V Shifter`,
    summary:
      'Ab 1–2 Metern Streifenlänge (60–120 LEDs) reicht der 3,3-V-Datenpegel des ESP32 oft nicht mehr sicher für die 5-V-WS2812B-Logik (mind. 3,5 V laut Datenblatt). Ein 74AHCT125-Pegelwandler sorgt für glasklare 5-V-Datenpulse.',
    keyTakeaways: [
      '60 LEDs bei Vollweiß ziehen bis zu 3,5 A (17,5 W) — niemals über den USB-Port des ESP versorgen!',
      'Der 74AHCT125 hebt 3,3 V auf saubere 5,0 V an — entferne ihn, um typische Flacker-Glitches zu erleben.',
      'Der WLED-Software-Limiter schützt dein Netzteil automatisch vor Überlast.',
    ],
    formulas: [
      { label: 'WS2812B HIGH-Schwelle', expression: 'V_IH ≥ 0,7 · 5 V = 3,5 V' },
      { label: 'Netzteil (60 LEDs)', expression: '5 V · 3,6 A ≈ 18 W (+20 % Reserve)' },
    ],
    challenges: [
      {
        id: 'wled-med-shifter',
        text: 'Entferne den 74AHCT125 Pegelwandler und sieh, wie der lange Streifen sofort zu glitchen beginnt.',
        hint: '3,3 V liegen knapp unterhalb der offiziellen 3,5-V-Schwelle von 5-V-WS2812B.',
      },
      {
        id: 'wled-med-len',
        text: 'Erhöhe die Länge auf 100 LEDs bei Vollweiß und beobachte den WLED-Strombegrenzer.',
        hint: 'WLED reduziert automatisch die Helligkeit, sobald das mA-Limit erreicht ist.',
      },
    ],
    removableParts: [
      { id: 'meanwell-power', label: 'Mean Well 5V Akku / Netzteil', shortLabel: 'Mean Well PSU/Akku', role: 'Versorgt 60–120 LEDs mit stabilem 5-V-Strom', removedEffectHint: 'Streifen spannungslos (0,00 V)' },
      { id: 'level-shifter', label: '74AHCT125 Pegelwandler', shortLabel: 'Pegelwandler', role: 'Wandelt 3,3 V ESP-Daten auf 5,0 V', removedEffectHint: 'Datenpegel unter 3,5 V → Flackern & falsche Farben!' },
      { id: 'data-resistor', label: '330 Ω Datenwiderstand', shortLabel: '330 Ω Daten-R', role: 'Schützt erste LED vor Überschwingern', removedEffectHint: 'Ringing auf der 800-kHz-Leitung' },
      { id: 'buffer-cap', label: '1000 µF Stützkondensator', shortLabel: '1000 µF Elko', role: 'Glättet 5-V-Lastsprünge', removedEffectHint: 'Starke Spannungs-Ripples bei Effekten' },
    ],
    defaultParams: {
      topology: 'wled-medium',
      wledLedCount: 60,
      wledBrightnessPct: 85,
      wledEffect: 'chase',
      wledPowerInjection: false,
      wledCurrentLimitMa: 3500,
      wledPowerSource: 'meanwell-battery',
    },
    cameraPreset: WLED_CAMERA,
  },
  {
    id: 'wled-long-injection',
    number: '16',
    title: 'WLED Lang-Streifen (180–300 LEDs / 5 m) & Power Injection',
    shortTitle: 'WLED Lang (5 m + Injection)',
    subtitle: 'Spannungsabfall (Voltage Drop), Rotstich am Ende & beidseitige 5-V-Einspeisung',
    category: 'WLED & LED-Streifen',
    difficulty: 'Profi',
    pinRole: 'WLED DIN + End-Power-Injection',
    getPrimaryPin: (b) => `GPIO ${getEspBoardById(b).pins.outA.gpio} (5 m Strip)`,
    summary:
      'Bei langen 5-Meter-WLED-Streifen (150–300 LEDs) entsteht auf den dünnen Kupferbahnen ein massiver Spannungsabfall (Voltage Drop). Ohne zusätzliche 5-V-/GND-Einspeisung am Streifenende (Power Injection) verfärben sich weiße LEDs hinten sichtbar gelb bis rot!',
    keyTakeaways: [
      'Ohne Power Injection fällt die 5-V-Spannung am Ende auf unter 3,2 V ab — Blau (Vf = 3,0 V) verlischt zuerst → Gelb/Rotstich!',
      'Power Injection (5 V + GND zusätzlich am Streifenende) halbiert den Stromweg und reduziert den Spannungsabfall um Faktor 4!',
      'Entferne das Power-Injection-Kabel live in 3D, um den dramatischen Farbunterschied am Streifenende sofort zu sehen!',
    ],
    formulas: [
      { label: 'Spannungsabfall', expression: 'ΔU = I · R_Kupfer (÷4 mit Injection)' },
      { label: 'Vollweiß 300 LEDs', expression: '300 · 58 mA ≈ 17,4 A (87 W @ 5 V)' },
    ],
    challenges: [
      {
        id: 'wled-long-drop',
        text: 'Stelle Effekt „Vollweiß“ ein und entferne dann die Power Injection am Streifenende!',
        hint: 'Sieh direkt auf die hinteren LEDs des 3D-Streifens: Sie kippen von klarem Weiß zu dunklem Gelb-Rot!',
      },
      {
        id: 'wled-long-300',
        text: 'Ziehe die Länge auf 300 LEDs (5 m) und schalte Power Injection wieder ein.',
        hint: 'Die End-Spannung im HUD springt sofort wieder hoch und das Weiß wird bis zur letzten LED sauber.',
      },
    ],
    removableParts: [
      { id: 'power-injection', label: '5V/GND Power Injection (Ende)', shortLabel: 'Power Injection', role: 'Speist 5 V & GND zusätzlich am Streifenende ein', removedEffectHint: 'Massiver Voltage Drop → Gelb-/Rotstich am Streifenende!' },
      { id: 'meanwell-power', label: 'Mean Well 5V Akku / Netzteil', shortLabel: 'Mean Well PSU/Akku', role: 'Liefert bis zu 15 A @ 5 V für 5 m Streifen', removedEffectHint: 'Gesamte WLED-Anlage stromlos (0,00 V)' },
      { id: 'level-shifter', label: '74AHCT125 Pegelwandler', shortLabel: 'Pegelwandler', role: 'Sichert 5-V-Datenpegel über lange Leitungen', removedEffectHint: 'Daten-Glitches & Flackern' },
      { id: 'data-resistor', label: '330 Ω Datenwiderstand', shortLabel: '330 Ω Daten-R', role: 'Impedanzanpassung auf 800-kHz-Bus', removedEffectHint: 'Signal-Ringing am Streifenanfang' },
    ],
    defaultParams: {
      topology: 'wled-long-injection',
      wledLedCount: 180,
      wledBrightnessPct: 90,
      wledEffect: 'solid-white',
      wledPowerInjection: true,
      wledCurrentLimitMa: 10000,
      wledPowerSource: 'meanwell-battery',
    },
    cameraPreset: WLED_CAMERA,
  },

  // === RASPBERRY PI RUBRIK (LEKTIONEN 17–19) ===
  {
    id: 'pi-traffic-light',
    number: '17',
    title: 'Raspberry Pi Ampel-Steuerung (Python GPIO)',
    shortTitle: 'Pi Ampel (3× LED)',
    subtitle: '3-Phasen-Ampel über die 40-Pin-GPIO-Leiste mit Python (gpiozero)',
    category: 'Raspberry Pi',
    recommendedBoardId: 'rpi-5',
    difficulty: 'Einstieg',
    pinRole: '3× Pi GPIO Output (3,3 V)',
    getPrimaryPin: (b) => {
      const p = getEspBoardById(b).pins;
      return `G${p.outA.gpio}/G${p.outB.gpio}/G${p.outC.gpio}`;
    },
    summary:
      'Der Klassiker zum Einstieg in die 40-Pin-GPIO-Leiste des Raspberry Pi: Drei LEDs (Rot, Gelb, Grün) werden mit eigenen 220-Ω-Vorwiderständen über ein Python-Skript als deutsche Ampel geschaltet.',
    keyTakeaways: [
      'Raspberry-Pi-GPIOs arbeiten mit 3,3 V und vertragen max. 16 mA pro Pin (gesamte Leiste max. 50 mA).',
      'Jede LED braucht ihren eigenen 220-Ω-Vorwiderstand (~5–6 mA pro Kanal).',
      'Wechsle oben das MCU-Board, um dieselbe Schaltung auf Pi 5, Pi 4B, Pi Zero 2 W oder Pi Pico 2 W (MicroPython) zu testen!',
    ],
    formulas: [
      { label: 'Pin-Limit Pi', expression: 'I_GPIO ≤ 16 mA (Summe ≤ 50 mA)' },
      { label: 'LED-Strom', expression: 'I = (3,3 V − V_f) / 220 Ω ≈ 5,5 mA' },
    ],
    challenges: [
      {
        id: 'pi-ampel-dark',
        text: 'Aktiviere „Raum dunkel“ in der Toolbar und beobachte den farbigen Ampelschein auf dem Steckbrett!',
        hint: 'Im abgedunkelten Labor siehst du die Phasenwechsel Rot → Rot-Gelb → Grün besonders deutlich.',
      },
    ],
    removableParts: [
      { id: 'r-red', label: 'Vorwiderstand Rot (220 Ω)', shortLabel: 'R Rot', role: 'Begrenzt Strom der roten Ampel-LED', removedEffectHint: 'Rote Phase fällt aus' },
      { id: 'r-yellow', label: 'Vorwiderstand Gelb (220 Ω)', shortLabel: 'R Gelb', role: 'Begrenzt Strom der gelben Ampel-LED', removedEffectHint: 'Gelbe Phase fällt aus' },
      { id: 'r-green', label: 'Vorwiderstand Grün (220 Ω)', shortLabel: 'R Grün', role: 'Begrenzt Strom der grünen Ampel-LED', removedEffectHint: 'Grüne Phase fällt aus' },
    ],
    defaultParams: {
      topology: 'pi-traffic-light',
      piTrafficAuto: true,
      piTrafficPhase: 'red',
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'pi-fan-pwm',
    number: '18',
    title: 'Raspberry Pi PWM-Lüftersteuerung (5 V)',
    shortTitle: 'Pi PWM-Lüfter',
    subtitle: 'Temperaturabhängige Kühlung über N-Kanal-MOSFET und Hardware-PWM',
    category: 'Raspberry Pi',
    recommendedBoardId: 'rpi-4b',
    difficulty: 'Grundlagen',
    pinRole: 'Hardware-PWM → MOSFET → 5V Lüfter',
    getPrimaryPin: (b) => `PWM GPIO ${getEspBoardById(b).pins.outA.gpio}`,
    summary:
      'Ein 5-V-Gehäuselüfter (~200 mA) würde einen 3,3-V-Pi-GPIO sofort überlasten. Über einen Logic-Level-MOSFET regelt Python die Lüfter-Drehzahl stufenlos anhand der CPU-Temperatur.',
    keyTakeaways: [
      'Unter 45 °C bleibt der Lüfter komplett stumm (0 % PWM).',
      'Zwischen 45 °C und 75 °C steigt die Drehzahl linear bis auf 100 % — live am 3D-Rotor sichtbar!',
      'Der 5-V-Laststrom kommt direkt von der 5-V-Schiene, nicht vom 3,3-V-GPIO.',
    ],
    formulas: [
      { label: 'Lüfterleistung', expression: 'P = 5,0 V · I_Fan (bis ~1,0 W)' },
      { label: 'Temp-Kurve', expression: '45 °C → 25 % | 75 °C → 100 %' },
    ],
    challenges: [
      {
        id: 'pi-fan-heat',
        text: 'Schiebe die CPU-Temperatur von 40 °C auf 80 °C und beobachte, wie der 3D-Lüfter hochdreht!',
        hint: 'Teste auch das Entfernen des MOSFETs, um den Ausfall der Kühlung zu sehen.',
      },
    ],
    removableParts: [
      { id: 'fan-mosfet', label: 'N-Kanal MOSFET Treiber', shortLabel: 'MOSFET', role: 'Schaltet den 5-V-Lüfterstrom sicher per 3,3-V-PWM', removedEffectHint: 'Lüfter bleibt trotz Hitze stehen!' },
      { id: 'pi-fan', label: '5V Axiallüfter (40 mm)', shortLabel: '5V Lüfter', role: 'Kühlt den Raspberry-Pi-SoC aktiv', removedEffectHint: 'Keine aktive Kühlung' },
    ],
    defaultParams: {
      topology: 'pi-fan-pwm',
      piCpuTempC: 58,
      piFanAutoMode: true,
      piFanManualPct: 65,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
  {
    id: 'pi-oled-i2c',
    number: '19',
    title: 'Raspberry Pi I²C OLED-Display (SSD1306)',
    shortTitle: 'Pi I²C OLED-Screen',
    subtitle: 'Mini-Statusdisplay (128×64 Pixel) für CPU-Temp, IP-Adresse & GPIO-Status',
    category: 'Raspberry Pi',
    recommendedBoardId: 'rpi-zero-2w',
    difficulty: 'Fortgeschritten',
    pinRole: 'I²C Bus (SDA / SCL · 0x3C)',
    getPrimaryPin: (b) => {
      const p = getEspBoardById(b).pins;
      return `SDA G${p.sda.gpio} / SCL G${p.scl.gpio}`;
    },
    summary:
      'Ein 0,96-Zoll-SSD1306-OLED benötigt nur 4 Kabel (3,3 V, GND, SDA, SCL) und macht jeden Raspberry Pi Zero 2 W, Pi 4 oder Pi 5 zum schicken Mini-Monitor für IP-Adresse, Auslastung und Sensoren.',
    keyTakeaways: [
      'I²C-Adresse des SSD1306 ist standardmäßig 0x3C (prüfbar unter Linux via `i2cdetect -y 1`).',
      'OLED-Pixel leuchten selbstständig — extrem hoher Kontrast im dunklen Raum!',
      'Wechsle zwischen den Display-Seiten (System / Netzwerk / GPIO) direkt am 3D-Screen.',
    ],
    formulas: [
      { label: 'Auflösung', expression: '128 × 64 px (1024 Byte Framebuffer)' },
      { label: 'I²C-Adresse', expression: '0x3C @ 400 kHz Fast-Mode' },
    ],
    challenges: [
      {
        id: 'pi-oled-dark',
        text: 'Dunkle den Raum ab und schalte durch die 3 Display-Seiten (System, Netzwerk, GPIO)!',
        hint: 'Im dunklen Raum strahlt das blau-gelbe OLED-Panel besonders realistisch.',
      },
    ],
    removableParts: [
      { id: 'i2c-sda', label: 'I²C SDA-Datenleitung', shortLabel: 'SDA-Kabel', role: 'Überträgt Bilddaten vom Pi an das OLED', removedEffectHint: 'Display bleibt schwarz (I²C Error 121)' },
      { id: 'oled-display', label: 'SSD1306 OLED-Modul', shortLabel: 'OLED 128×64', role: 'Selbstleuchtendes 0,96"-I²C-Display', removedEffectHint: 'Kein Gerät an Adresse 0x3C' },
    ],
    defaultParams: {
      topology: 'pi-oled-i2c',
      piOledPage: 'system',
      piOledContrastPct: 90,
    },
    cameraPreset: DEFAULT_CAMERA,
  },
];

export const LESSONS: LessonDefinition[] = [...BASE_LESSONS, ...buildExpandedLessons(BASE_LESSONS)];

export function getLessonById(id: string): LessonDefinition {
  return LESSONS.find((l) => l.id === id) ?? LESSONS[0];
}

export function createInitialCircuitParameters(): CircuitParameters {
  return {
    boardId: 'esp32-devkit-v1',
    topology: 'led-resistor',
    supplyVoltage: 3.3,
    removedParts: [],
    withoutBreadboard: false,

    gpioOutputHigh: true,
    ledColor: 'red',
    resistorOhms: 220,

    pullMode: 'pull-down',
    pullResistorOhms: 10000,
    buttonPressed: false,
    noiseAmplitude: 1.0,

    dividerMode: 'resistors',
    r1Ohms: 10000,
    r2Ohms: 10000,
    lightLevelPercent: 55,

    pwmDutyPercent: 45,
    pwmFrequencyHz: 1000,

    rgbRed: 40,
    rgbGreen: 210,
    rgbBlue: 255,

    rcInputHigh: true,
    rcAutoPulse: true,
    rcResistorOhms: 10000,
    rcCapacitorUf: 47,

    mosfetGateHigh: true,
    mosfetLoadVoltage: 12,
    mosfetLoadOhms: 24,

    bmeTempC: 22.4,
    bmeHumidityPct: 48,
    bmePressureHpa: 1013,
    i2cPullupEnabled: true,

    ultrasonicDistanceCm: 65,

    ld2490TargetDistanceM: 2.1,
    ld2490ThresholdM: 3.5,
    ld2490TargetMoving: true,
    ld2490TargetPresent: true,

    relayEnergized: true,
    relayFlybackDiode: true,

    servoAngleDeg: 90,

    buzzerEnabled: true,
    buzzerFrequencyHz: 880,

    wledLedCount: 16,
    wledBrightnessPct: 80,
    wledEffect: 'rainbow',
    wledPowerInjection: true,
    wledCurrentLimitMa: 3500,
    wledPowerSource: 'meanwell-battery',
    wledBatteryCapacityMah: 10000,
    wledBatterySocPct: 85,

    piTrafficAuto: true,
    piTrafficPhase: 'red',
    piCpuTempC: 58,
    piFanAutoMode: true,
    piFanManualPct: 65,
    piOledPage: 'system',
    piOledContrastPct: 90,
  };
}
