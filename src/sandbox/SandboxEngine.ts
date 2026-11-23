import { getEspBoardById } from '../engine/BoardCatalog';
import type { EspBoardId } from '../engine/types';
import { EXPANDED_CATALOG_ITEMS } from './ExpandedCatalog';
import type {
  PartRuntimeState,
  PlacedPart,
  SandboxCatalogItem,
  SandboxPartType,
  SandboxSimSummary,
  SandboxState,
  WireEndpoint,
} from './SandboxTypes';

export const WIRE_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#ef4444', label: 'Rot (+V)' },
  { hex: '#1e293b', label: 'Schwarz (GND)' },
  { hex: '#38bdf8', label: 'Cyan (Signal)' },
  { hex: '#facc15', label: 'Gelb (SCL/TX)' },
  { hex: '#22c55e', label: 'Grün (SDA/RX)' },
  { hex: '#f97316', label: 'Orange (PWM)' },
];

export const SANDBOX_CATALOG: SandboxCatalogItem[] = [
  // ===================== LEDs & AUSGABE (7) =====================
  {
    type: 'led-red',
    name: 'LED Rot (5 mm)',
    shortName: 'LED Rot',
    category: 'LEDs & Ausgabe',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Anode (+)' },
      { dCol: 2, row: 'g', pinLabel: 'Kathode (−)' },
    ],
    description: 'Klassische rote 5-mm-LED (Vf = 2,0 V). Immer mit 220 Ω Vorwiderstand betreiben!',
    accentHex: '#ef4444',
  },
  {
    type: 'led-green',
    name: 'LED Grün (5 mm)',
    shortName: 'LED Grün',
    category: 'LEDs & Ausgabe',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Anode (+)' },
      { dCol: 2, row: 'g', pinLabel: 'Kathode (−)' },
    ],
    description: 'Grüne Status-LED (Vf = 2,2 V) für Betriebsanzeigen und Ampeln.',
    accentHex: '#22c55e',
  },
  {
    type: 'led-blue',
    name: 'LED Blau (5 mm)',
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
    type: 'led-yellow',
    name: 'LED Gelb (5 mm)',
    shortName: 'LED Gelb',
    category: 'LEDs & Ausgabe',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Anode (+)' },
      { dCol: 2, row: 'g', pinLabel: 'Kathode (−)' },
    ],
    description: 'Gelbe Warn- & Ampel-LED (Vf = 2,1 V). Ideal für Verkehrsampeln und Status-Blinker.',
    accentHex: '#eab308',
  },
  {
    type: 'led-rgb',
    name: 'RGB-LED (4-Pin)',
    shortName: 'RGB-LED',
    category: 'LEDs & Ausgabe',
    colSpan: 3,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Rot (R)' },
      { dCol: 1, row: 'g', pinLabel: 'GND' },
      { dCol: 2, row: 'g', pinLabel: 'Grün (G)' },
      { dCol: 3, row: 'g', pinLabel: 'Blau (B)' },
    ],
    description: 'Dreifarbige RGB-LED mit gemeinsamer Kathode — mischt Millionen Farben über PWM.',
    accentHex: '#ec4899',
  },
  {
    type: 'neopixel-ring',
    name: 'WS2812B NeoPixel-Ring (8 LEDs)',
    shortName: 'NeoPixel-Ring',
    category: 'LEDs & Ausgabe',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: '5V/3V3' },
      { dCol: 1, row: 'g', pinLabel: 'DIN' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Adressierbarer 8-LED-RGB-Ring (WLED / FastLED) mit nur einer Datenleitung!',
    accentHex: '#a855f7',
  },
  {
    type: 'laser-diode',
    name: 'KY-008 650 nm Laser-Diode',
    shortName: 'Laser-Diode',
    category: 'LEDs & Ausgabe',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Signal (+)' },
      { dCol: 1, row: 'g', pinLabel: 'NC' },
      { dCol: 2, row: 'g', pinLabel: 'GND (−)' },
    ],
    description: 'Roter Punkt-Laser-Emitter (5 mW) — perfekt für Laser-Lichtschranken mit LDR!',
    accentHex: '#dc2626',
  },

  // ===================== PASSIV & SCHALTER (8) =====================
  {
    type: 'resistor-220',
    name: 'Widerstand 220 Ω (Vorwiderstand)',
    shortName: 'R 220 Ω',
    category: 'Passiv & Schalter',
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
    category: 'Passiv & Schalter',
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
    type: 'potentiometer',
    name: 'Dreh-Potentiometer 10 kΩ',
    shortName: 'Poti 10 kΩ',
    category: 'Passiv & Schalter',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'VCC' },
      { dCol: 1, row: 'g', pinLabel: 'Schleifer' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Stufenloser Spannungsteiler (0–3,3 V) für Analog-Eingänge (ADC), Dimmer und Servo-Steuerung.',
    accentHex: '#38bdf8',
  },
  {
    type: 'button',
    name: 'Kurzhub-Taster (SPST)',
    shortName: 'Taster',
    category: 'Passiv & Schalter',
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
    type: 'slide-switch',
    name: 'Schiebeschalter (SPDT)',
    shortName: 'Schalter',
    category: 'Passiv & Schalter',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Ein' },
      { dCol: 1, row: 'g', pinLabel: 'COM' },
      { dCol: 2, row: 'g', pinLabel: 'Aus' },
    ],
    description: 'Rastender Schiebeschalter zum dauerhaften Ein-/Ausschalten von Stromkreisen.',
    accentHex: '#64748b',
  },
  {
    type: 'capacitor',
    name: 'Elko 100 µF (Kondensator)',
    shortName: 'Elko 100 µF',
    category: 'Passiv & Schalter',
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
    type: 'diode-1n4007',
    name: 'Freilaufdiode 1N4007',
    shortName: 'Diode 1N4007',
    category: 'Passiv & Schalter',
    colSpan: 4,
    preferredRow: 'h',
    pinOffsets: [
      { dCol: 0, row: 'h', pinLabel: 'Anode' },
      { dCol: 4, row: 'h', pinLabel: 'Kathode (Ring)' },
    ],
    description: 'Schützt ESP32/Pi vor induktiven Spannungsspitzen an Motoren, Lüftern und Relais.',
    accentHex: '#94a3b8',
  },
  {
    type: 'mosfet-irlz44n',
    name: 'N-Kanal MOSFET (IRLZ44N)',
    shortName: 'MOSFET',
    category: 'Passiv & Schalter',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Gate (G)' },
      { dCol: 1, row: 'g', pinLabel: 'Drain (D)' },
      { dCol: 2, row: 'g', pinLabel: 'Source (S)' },
    ],
    description: 'Logic-Level-Leistungstransistor — schaltet große Lasten (Lüfter, LED-Strips, Motoren) per 3,3 V.',
    accentHex: '#475569',
  },

  // ===================== SENSOREN (14) =====================
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
    type: 'dht22',
    name: 'DHT22 Temperatur & Feuchte',
    shortName: 'DHT22 Klima',
    category: 'Sensoren',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: '3V3' },
      { dCol: 1, row: 'g', pinLabel: 'DATA' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Beliebter weißer 1-Wire-Klimasensor (±0,5 °C, 0–100 % rF) für Wetterstationen & Smart Home.',
    accentHex: '#e2e8f0',
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
    type: 'pir-hc501',
    name: 'HC-SR501 PIR Bewegungsmelder',
    shortName: 'PIR Melder',
    category: 'Sensoren',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'VCC' },
      { dCol: 1, row: 'g', pinLabel: 'OUT' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Passiv-Infrarot-Sensor mit weißer Fresnel-Kuppel — erkennt Körperwärme bis 7 m.',
    accentHex: '#f8fafc',
  },
  {
    type: 'mq2-gas',
    name: 'MQ-2 Gas- & Rauchsensor',
    shortName: 'MQ-2 Gas',
    category: 'Sensoren',
    colSpan: 3,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'VCC' },
      { dCol: 1, row: 'g', pinLabel: 'GND' },
      { dCol: 2, row: 'g', pinLabel: 'DO' },
      { dCol: 3, row: 'g', pinLabel: 'AO' },
    ],
    description: 'Metallgitter-Gassensor für Rauch, Propan, Methan und (sehr beliebt für Spaßprojekte) schlechte Luft!',
    accentHex: '#ef4444',
  },
  {
    type: 'soil-moisture',
    name: 'Bodenfeuchte-Sensor (Kapazitiv)',
    shortName: 'Bodenfeuchte',
    category: 'Sensoren',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: '3V3' },
      { dCol: 1, row: 'g', pinLabel: 'AOUT' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Korrosionsfreier Pflanzensensor — meldet sofort, wenn deine Zimmerpflanze Durst hat!',
    accentHex: '#16a34a',
  },
  {
    type: 'mpu6050',
    name: 'MPU6050 6-Achsen Gyro/Accel (I²C)',
    shortName: 'MPU6050 Gyro',
    category: 'Sensoren',
    colSpan: 3,
    preferredRow: 'f',
    pinOffsets: [
      { dCol: 0, row: 'f', pinLabel: '3V3' },
      { dCol: 1, row: 'f', pinLabel: 'GND' },
      { dCol: 2, row: 'f', pinLabel: 'SCL' },
      { dCol: 3, row: 'f', pinLabel: 'SDA' },
    ],
    description: '3-Achsen-Beschleunigung + 3-Achsen-Gyroskop über I²C (0x68) für Roboter, Neigung & Gesten.',
    accentHex: '#3b82f6',
  },
  {
    type: 'rfid-rc522',
    name: 'MFRC522 RFID/NFC Leser',
    shortName: 'RFID-RC522',
    category: 'Sensoren',
    colSpan: 3,
    preferredRow: 'h',
    pinOffsets: [
      { dCol: 0, row: 'h', pinLabel: '3V3' },
      { dCol: 1, row: 'h', pinLabel: 'GND' },
      { dCol: 2, row: 'h', pinLabel: 'SDA/SS' },
      { dCol: 3, row: 'h', pinLabel: 'SCK' },
    ],
    description: '13,56-MHz-RFID-Kartenleser für Zutrittskontrollen, Snack-Tresore & Jukeboxen (SPI).',
    accentHex: '#1d4ed8',
  },
  {
    type: 'touch-ttp223',
    name: 'TTP223 Kapazitiver Touch-Sensor',
    shortName: 'Touch-Pad',
    category: 'Sensoren',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'VCC' },
      { dCol: 1, row: 'g', pinLabel: 'I/O' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Berührungsempfindliche Taste ohne Mechanik — funktioniert sogar durch dünnes Plastik oder Holz.',
    accentHex: '#e11d48',
  },
  {
    type: 'sound-mic',
    name: 'KY-037 Mikrofon / Klatsch-Sensor',
    shortName: 'Mikrofon',
    category: 'Sensoren',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'VCC' },
      { dCol: 1, row: 'g', pinLabel: 'DO' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Elektret-Mikrofonmodul mit Schwellen-Poti für Klatsch-Schalter, Lärm-Ampeln & Schnarch-Detektor.',
    accentHex: '#f97316',
  },
  {
    type: 'hall-sensor',
    name: 'Hall-Effekt Magnetsensor',
    shortName: 'Hall-Sensor',
    category: 'Sensoren',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: '3V3' },
      { dCol: 1, row: 'g', pinLabel: 'OUT' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Erkennt Magnetfelder berührungslos — ideal für Tür-/Kühlschrankkontakte und Drehzahlmesser.',
    accentHex: '#06b6d4',
  },
  {
    type: 'rain-sensor',
    name: 'Regen- / Wassertropfen-Sensor',
    shortName: 'Regen-Sensor',
    category: 'Sensoren',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: '3V3' },
      { dCol: 1, row: 'g', pinLabel: 'DO' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Leiterbahnen-Kamm erkennt Wassertropfen, Regen auf dem Balkon oder überlaufende Kaffeetassen.',
    accentHex: '#0284c7',
  },

  // ===================== AKTOREN & DISPLAYS (7) =====================
  {
    type: 'oled',
    name: 'SSD1306 I²C OLED (128×64)',
    shortName: 'OLED Display',
    category: 'Aktoren & Displays',
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
    type: 'seven-seg',
    name: '7-Segment LED-Anzeige',
    shortName: '7-Segment',
    category: 'Aktoren & Displays',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'VCC/SIG' },
      { dCol: 1, row: 'g', pinLabel: 'CLK' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Leuchtende rote Ziffernanzeige für Countdown-Timer, Zähler und Spielstände.',
    accentHex: '#ef4444',
  },
  {
    type: 'servo',
    name: 'SG90 Mikro-Servo (0°–180°)',
    shortName: 'SG90 Servo',
    category: 'Aktoren & Displays',
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
    category: 'Aktoren & Displays',
    colSpan: 3,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'Signal (+)' },
      { dCol: 3, row: 'g', pinLabel: 'GND (−)' },
    ],
    description: 'Erzeugt Töne, Melodien und Warnsignale über Rechteck-Frequenzen.',
    accentHex: '#f43f5e',
  },
  {
    type: 'relay-module',
    name: '5V Relais-Modul (1-Kanal)',
    shortName: 'Relais-Modul',
    category: 'Aktoren & Displays',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: 'IN' },
      { dCol: 1, row: 'g', pinLabel: 'VCC' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Elektromechanisches Schaltrelais — schaltet Lampen, Kaffeemaschinen oder Pumpen galvanisch getrennt.',
    accentHex: '#2563eb',
  },
  {
    type: 'cooling-fan',
    name: '5V PWM-Axiallüfter',
    shortName: '5V Lüfter',
    category: 'Aktoren & Displays',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: '+5V/PWM' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Drehender 3D-Gehäuselüfter für Raspberry Pi Kühlung, Luftstrom-Experimente & Geruchs-Abzug.',
    accentHex: '#0ea5e9',
  },
  {
    type: 'vib-motor',
    name: 'Vibrations-Motor (Haptik)',
    shortName: 'Vibro-Motor',
    category: 'Aktoren & Displays',
    colSpan: 2,
    preferredRow: 'g',
    pinOffsets: [
      { dCol: 0, row: 'g', pinLabel: '+3,3V/SIG' },
      { dCol: 2, row: 'g', pinLabel: 'GND' },
    ],
    description: 'Kompakter Münz-Vibrationsmotor für stilles haptisches Feedback, Stuhl-Wecker & Wearables.',
    accentHex: '#8b5cf6',
  },
  // + 40 weitere Sensoren & 40 weitere Aktoren/Displays (insgesamt 116 Bauteile!)
  ...EXPANDED_CATALOG_ITEMS,
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
 * Wertet eine frei gebaute Sandbox-Schaltung (36 Bauteil-Typen!) physikalisch & logisch in Echtzeit aus.
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

  // 2. Closed tactile buttons & slide switches bridge their contacts
  for (const part of state.parts) {
    const nets = getPartPinNets(part);
    if (part.type === 'button' && state.buttonPressed && nets.length >= 2) {
      uf.union(nets[0], nets[1]);
    } else if (part.type === 'slide-switch' && nets.length >= 3) {
      if (state.switchClosed) {
        uf.union(nets[0], nets[1]);
      } else {
        uf.union(nets[1], nets[2]);
      }
    }
  }

  // 3. Resistive bridges (220 Ohm / 10k Ohm / LDR / Potentiometer / Diode)
  const resistorEdges: Array<{ a: string; b: string; ohms: number }> = [];
  for (const part of state.parts) {
    const nets = getPartPinNets(part);
    if (part.type === 'resistor-220' && nets.length >= 2) {
      resistorEdges.push({ a: nets[0], b: nets[1], ohms: 220 });
    } else if (part.type === 'resistor-10k' && nets.length >= 2) {
      resistorEdges.push({ a: nets[0], b: nets[1], ohms: 10000 });
    } else if (part.type === 'ldr' && nets.length >= 2) {
      const ohms = Math.round(100000 * Math.pow(500 / 100000, state.lightPercent / 100));
      resistorEdges.push({ a: nets[0], b: nets[1], ohms });
    } else if (part.type === 'potentiometer' && nets.length >= 3) {
      const ratio = Math.max(0.05, Math.min(0.95, state.lightPercent / 100));
      resistorEdges.push({ a: nets[0], b: nets[1], ohms: Math.round(10000 * (1 - ratio)) });
      resistorEdges.push({ a: nets[1], b: nets[2], ohms: Math.round(10000 * ratio) });
    }
  }

  const highSources = ['board:3V3'];
  if (state.gpioHigh) {
    highSources.push('board:outA', 'board:outB', 'board:outC');
  }
  const gndSources = ['board:GND'];
  if (!state.gpioHigh) {
    gndSources.push('board:outA');
  }

  // MOSFET conduction: if Gate is HIGH, Drain connects to Source!
  for (const part of state.parts) {
    if (part.type === 'mosfet-irlz44n') {
      const nets = getPartPinNets(part);
      if (nets.length >= 3 && highSources.some((s) => uf.connected(nets[0], s))) {
        uf.union(nets[1], nets[2]);
      }
    }
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

    // ---- 1) Single-Color 5mm LEDs ----
    if (
      part.type === 'led-red' ||
      part.type === 'led-green' ||
      part.type === 'led-blue' ||
      part.type === 'led-yellow'
    ) {
      const vf =
        part.type === 'led-red'
          ? 2.0
          : part.type === 'led-yellow'
            ? 2.1
            : part.type === 'led-green'
              ? 2.2
              : 3.0;
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

    // ---- 2) RGB LED ----
    if (part.type === 'led-rgb') {
      const hasGnd = findSeriesResistanceTo(nets[1], gndSources) !== null;
      const rOn = findSeriesResistanceTo(nets[0], highSources) !== null;
      const gOn = findSeriesResistanceTo(nets[2], highSources) !== null;
      const bOn = findSeriesResistanceTo(nets[3], highSources) !== null;
      const channels = (rOn ? 1 : 0) + (gOn ? 1 : 0) + (bOn ? 1 : 0);
      const active = hasGnd && channels > 0;
      const ma = active ? channels * 6.5 : 0;
      if (active) {
        totalCurrentMa += ma;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered: active,
        active,
        brightnessPct: active ? 95 : 0,
        overcurrent: false,
        currentMa: ma,
        statusText: active
          ? `RGB aktiv (${rOn ? 'R' : ''}${gOn ? 'G' : ''}${bOn ? 'B' : ''})`
          : 'GND & mind. 1 Farbpin (R/G/B) anschließen',
      });
      continue;
    }

    // ---- 3) NeoPixel Ring (WS2812B 8 LEDs) ----
    if (part.type === 'neopixel-ring') {
      const powered =
        findSeriesResistanceTo(nets[0], ['board:3V3']) !== null &&
        findSeriesResistanceTo(nets[2], ['board:GND']) !== null;
      const hasDin = isDirectToAny(nets[1], ['board:outA', 'board:outB', 'board:outC', 'board:3V3']);
      const active = powered && hasDin;
      if (active) {
        totalCurrentMa += 88;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered,
        active,
        brightnessPct: active ? 100 : 0,
        overcurrent: false,
        currentMa: active ? 88 : 0,
        statusText: active
          ? 'Regenbogen-Animation (8× WS2812B)'
          : powered
            ? 'Strom OK — DIN noch an GPIO verbinden'
            : '5V/3V3, DIN & GND anschließen',
      });
      continue;
    }

    // ---- 4) KY-008 Laser Diode ----
    if (part.type === 'laser-diode') {
      const active =
        findSeriesResistanceTo(nets[0], highSources) !== null &&
        findSeriesResistanceTo(nets[2], gndSources) !== null;
      if (active) {
        totalCurrentMa += 24;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered: active,
        active,
        brightnessPct: active ? 100 : 0,
        overcurrent: false,
        currentMa: active ? 24 : 0,
        statusText: active ? '650 nm Laserstrahl AKTIV!' : 'Signal (+) & GND (−) anschließen',
      });
      continue;
    }

    // ---- 5) HLK-LD2490 24 GHz mmWave Radar ----
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

    // ---- 6) I2C Modules: OLED, BME280, MPU6050 ----
    if (part.type === 'oled' || part.type === 'bme280' || part.type === 'mpu6050') {
      const gndNet = part.type === 'oled' ? nets[0] : nets[1];
      const vccNet = part.type === 'oled' ? nets[1] : nets[0];
      const sclNet = nets[2];
      const sdaNet = nets[3];

      const powered =
        findSeriesResistanceTo(vccNet, ['board:3V3']) !== null &&
        findSeriesResistanceTo(gndNet, ['board:GND']) !== null;
      const hasI2c = isDirectToAny(sclNet, ['board:scl']) && isDirectToAny(sdaNet, ['board:sda']);
      const active = powered && hasI2c;
      const ma = part.type === 'oled' ? 18 : part.type === 'mpu6050' ? 3.8 : 1.2;
      if (active) {
        totalCurrentMa += ma;
        activePartsCount++;
        primaryVoltage = (elapsedSeconds * 8) % 1 < 0.25 ? 0.1 : 3.3;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered,
        active,
        brightnessPct: active ? 95 : 0,
        overcurrent: false,
        currentMa: active ? ma : 0,
        statusText: active
          ? `${def.shortName} Online (I²C aktiv)`
          : powered
            ? 'Strom OK — SDA & SCL noch verbinden'
            : '3V3 & GND noch anschließen',
      });
      continue;
    }

    // ---- 7) HC-SR04 Ultrasonic ----
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
        statusText: powered ? 'Ultraschall aktiv (~65 cm)' : 'VCC & GND verbinden',
      });
      continue;
    }

    // ---- 8) 3-Pin & 4-Pin Active Sensors (DHT22, PIR, MQ-2, Soil, RFID, Touch, Sound, Hall, Rain) ----
    if (
      part.type === 'dht22' ||
      part.type === 'pir-hc501' ||
      part.type === 'mq2-gas' ||
      part.type === 'soil-moisture' ||
      part.type === 'rfid-rc522' ||
      part.type === 'touch-ttp223' ||
      part.type === 'sound-mic' ||
      part.type === 'hall-sensor' ||
      part.type === 'rain-sensor'
    ) {
      const gndIdx = part.type === 'mq2-gas' || part.type === 'rfid-rc522' ? 1 : 2;
      const sigIdx = part.type === 'mq2-gas' || part.type === 'rfid-rc522' ? 2 : 1;
      const powered =
        findSeriesResistanceTo(nets[0], ['board:3V3']) !== null &&
        findSeriesResistanceTo(nets[gndIdx], ['board:GND']) !== null;
      const hasSig = isDirectToAny(nets[sigIdx], [
        'board:inputA',
        'board:adc',
        'board:outA',
        'board:outB',
        'board:outC',
        'board:sda',
      ]);
      const triggered = powered && state.sensorTriggered;
      const ma =
        part.type === 'mq2-gas'
          ? 120
          : part.type === 'rfid-rc522'
            ? 26
            : part.type === 'pir-hc501'
              ? 3.2
              : 4.5;
      if (powered) {
        totalCurrentMa += ma;
        activePartsCount++;
        if (hasSig) primaryVoltage = triggered ? 3.3 : 0.2;
      }

      const activeLabelMap: Record<string, string> = {
        dht22: '23,4 °C · 48 % rF (1-Wire)',
        'pir-hc501': triggered ? 'Bewegung erkannt! (OUT=HIGH)' : 'Überwacht Raum (Ruhe)',
        'mq2-gas': triggered ? 'GAS / RAUCH ERKANNT!' : 'Luftqualität sauber',
        'soil-moisture': triggered ? 'Erde TROCKEN — Gießen!' : 'Bodenfeuchte OK (64 %)',
        'rfid-rc522': triggered ? 'RFID-Karte erkannt (#A4F2)' : 'Warte auf NFC-Chip…',
        'touch-ttp223': triggered ? 'Berührung erkannt!' : 'Touch-Pad bereit',
        'sound-mic': triggered ? 'Klatschen / Lärm erkannt!' : 'Umgebung ruhig',
        'hall-sensor': triggered ? 'Magnetfeld erkannt!' : 'Kein Magnet in Nähe',
        'rain-sensor': triggered ? 'Wassertropfen erkannt!' : 'Sensorfläche trocken',
      };

      partStates.set(part.id, {
        partId: part.id,
        powered,
        active: triggered || (powered && part.type === 'dht22'),
        brightnessPct: triggered ? 100 : powered ? 35 : 0,
        overcurrent: false,
        currentMa: powered ? ma : 0,
        statusText: powered
          ? activeLabelMap[part.type] ?? 'Sensor aktiv'
          : '3V3 & GND noch anschließen',
      });
      continue;
    }

    // ---- 9) 7-Segment LED Display ----
    if (part.type === 'seven-seg') {
      const active =
        findSeriesResistanceTo(nets[0], highSources) !== null &&
        findSeriesResistanceTo(nets[2], gndSources) !== null;
      if (active) {
        totalCurrentMa += 28;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered: active,
        active,
        brightnessPct: active ? 95 : 0,
        overcurrent: false,
        currentMa: active ? 28 : 0,
        statusText: active ? 'Zähler aktiv (0–9)' : 'VCC & GND verbinden',
      });
      continue;
    }

    // ---- 10) SG90 Servo ----
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

    // ---- 11) Buzzer, 5V Fan, Vibro-Motor ----
    if (part.type === 'buzzer' || part.type === 'cooling-fan' || part.type === 'vib-motor') {
      const rHigh = findSeriesResistanceTo(nets[0], highSources);
      const rGnd = findSeriesResistanceTo(nets[1], gndSources);
      const active = rHigh !== null && rGnd !== null;
      const ma = part.type === 'cooling-fan' ? 140 : part.type === 'vib-motor' ? 65 : 9;
      if (active) {
        totalCurrentMa += ma;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered: active,
        active,
        brightnessPct: active ? 100 : 0,
        overcurrent: false,
        currentMa: active ? ma : 0,
        statusText: active
          ? part.type === 'cooling-fan'
            ? 'Lüfter dreht (100 %)'
            : part.type === 'vib-motor'
              ? 'Vibriert aktiv!'
              : 'Piezo aktiv (Ton)'
          : 'Plus/Signal & GND verbinden',
      });
      continue;
    }

    // ---- 12) 5V Relay Module ----
    if (part.type === 'relay-module') {
      const powered =
        findSeriesResistanceTo(nets[1], ['board:3V3']) !== null &&
        findSeriesResistanceTo(nets[2], ['board:GND']) !== null;
      const triggered = powered && findSeriesResistanceTo(nets[0], highSources) !== null;
      if (triggered) {
        totalCurrentMa += 72;
        activePartsCount++;
      }
      partStates.set(part.id, {
        partId: part.id,
        powered,
        active: triggered,
        brightnessPct: triggered ? 100 : 0,
        overcurrent: false,
        currentMa: triggered ? 72 : 0,
        statusText: triggered
          ? 'Relais ANZIEHEND (KLICK · Kontakt zu)'
          : powered
            ? 'Versorgt (IN-Signal HIGH schaltet Relais)'
            : 'IN, VCC & GND anschließen',
      });
      continue;
    }

    // ---- 12b) All 80 Expanded Sensors & Actuators (extraMeta-driven) ----
    if (def.extraMeta) {
      const m = def.extraMeta;
      let powered = false;
      let active = false;
      let statusText = '3V3 & GND noch anschließen';

      if (m.simKind === 'i2c-sensor' || m.simKind === 'i2c-display') {
        const vccNet = m.simKind === 'i2c-display' ? nets[1] : nets[0];
        const gndNet = m.simKind === 'i2c-display' ? nets[0] : nets[1];
        powered =
          findSeriesResistanceTo(vccNet, ['board:3V3']) !== null &&
          findSeriesResistanceTo(gndNet, ['board:GND']) !== null;
        const hasI2c = isDirectToAny(nets[2], ['board:scl']) && isDirectToAny(nets[3], ['board:sda']);
        active = powered && hasI2c;
        if (active) primaryVoltage = (elapsedSeconds * 8) % 1 < 0.25 ? 0.1 : 3.3;
        statusText = active
          ? state.sensorTriggered || m.simKind === 'i2c-display'
            ? m.activeText
            : m.idleText
          : powered
            ? 'Strom OK — SCL & SDA noch verbinden'
            : '3V3 & GND noch anschließen';
      } else if (m.simKind === 'uart-sensor') {
        powered =
          findSeriesResistanceTo(nets[0], ['board:3V3']) !== null &&
          findSeriesResistanceTo(nets[1], ['board:GND']) !== null;
        const hasUart =
          isDirectToAny(nets[2], ['board:uartRx', 'board:inputA', 'board:uartTx']) ||
          isDirectToAny(nets[3], ['board:uartTx', 'board:outA', 'board:uartRx']);
        active = powered && (state.sensorTriggered || hasUart);
        statusText = powered
          ? state.sensorTriggered
            ? m.activeText
            : m.idleText
          : '3V3, GND & UART (TX/RX) verbinden';
      } else if (m.simKind === 'digital-sensor' || m.simKind === 'analog-sensor') {
        powered =
          findSeriesResistanceTo(nets[0], ['board:3V3']) !== null &&
          findSeriesResistanceTo(nets[2], ['board:GND']) !== null;
        const hasSig = isDirectToAny(nets[1], [
          'board:inputA',
          'board:adc',
          'board:outA',
          'board:outB',
          'board:outC',
        ]);
        active = powered && state.sensorTriggered;
        if (powered && hasSig) primaryVoltage = active ? 3.3 : 0.25;
        statusText = powered ? (active ? m.activeText : m.idleText) : '3V3 & GND anschließen';
      } else if (m.simKind === 'two-pin-actuator') {
        const rHigh = findSeriesResistanceTo(nets[0], highSources);
        const rGnd = findSeriesResistanceTo(nets[1], gndSources);
        powered = rHigh !== null && rGnd !== null;
        active = powered;
        statusText = active ? m.activeText : '+V/Signal & GND verbinden';
      } else if (m.simKind === 'pwm-actuator' || m.simKind === 'relay-actuator') {
        powered =
          findSeriesResistanceTo(nets[1], ['board:3V3']) !== null &&
          findSeriesResistanceTo(nets[2], ['board:GND']) !== null;
        const hasSig = findSeriesResistanceTo(nets[0], highSources) !== null;
        active = powered && hasSig;
        statusText = active
          ? m.activeText
          : powered
            ? 'Versorgt — Signal-Pin (IN/PWM) an GPIO anschließen'
            : 'Signal, +V & GND anschließen';
      }

      if (active || (powered && (m.simKind === 'digital-sensor' || m.simKind === 'analog-sensor' || m.simKind === 'uart-sensor'))) {
        totalCurrentMa += active ? m.currentMa : m.currentMa * 0.25;
        activePartsCount++;
      }

      partStates.set(part.id, {
        partId: part.id,
        powered,
        active,
        brightnessPct: active ? 100 : powered ? 35 : 0,
        overcurrent: false,
        currentMa: active ? m.currentMa : powered ? m.currentMa * 0.25 : 0,
        statusText,
      });
      continue;
    }

    // ---- 13) Passive Parts (Resistors, Poti, Button, Switch, Cap, Diode, LDR, MOSFET) ----
    const isMosfetOn =
      part.type === 'mosfet-irlz44n' && highSources.some((s) => uf.connected(nets[0], s));
    partStates.set(part.id, {
      partId: part.id,
      powered: true,
      active:
        part.type === 'button'
          ? state.buttonPressed
          : part.type === 'slide-switch'
            ? state.switchClosed
            : part.type === 'mosfet-irlz44n'
              ? isMosfetOn
              : true,
      brightnessPct: 0,
      overcurrent: false,
      currentMa: 0,
      statusText:
        part.type === 'button'
          ? state.buttonPressed
            ? 'Gedrückt (Kontakt geschlossen)'
            : 'Bereit (in 3D anklicken / Leertaste)'
          : part.type === 'slide-switch'
            ? state.switchClosed
              ? 'Schalter EIN (Pin 1 ↔ COM)'
              : 'Schalter AUS (COM ↔ Pin 3)'
            : part.type === 'mosfet-irlz44n'
              ? isMosfetOn
                ? 'Gate HIGH → Drain↔Source leitend'
                : 'Gate LOW → Sperrend'
              : `Eingesteckt bei Spalte ${part.col}`,
    });
  }

  let statusBadge = 'WERKBANK BEREIT';
  let statusTone: SandboxSimSummary['statusTone'] = 'info';
  let whatHappens =
    state.parts.length === 0
      ? `Das Steckbrett ist noch leer — wähle rechts aus ${SANDBOX_CATALOG.length} Bauteilen, Sensoren & Aktoren aus und klicke auf ein Steckbrett-Loch!`
      : `${state.parts.length} Bauteil(e) und ${state.wires.length} Jumperkabel platziert (${activePartsCount} aktiv).`;
  let whyItHappens =
    'Jede 5er-Spalte auf dem Steckbrett (a–e bzw. f–j) ist intern leitend verbunden. Du kannst Teile jederzeit mit ✋ Verschieben umstecken oder mit 🗑 Löschen entfernen!';

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
    sensorTriggered: true,
    switchClosed: true,
  };
}
