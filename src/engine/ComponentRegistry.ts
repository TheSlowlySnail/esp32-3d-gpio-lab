import type { ColorBand, ComponentDefinition, LedColorId, LedSpec } from './types';

export const ESP32_SPECS = {
  VCC: 3.3,
  V_IH: 2.48,
  V_IL: 0.83,
  ADC_BITS: 12,
  ADC_MAX: 4095,
  MAX_SAFE_GPIO_MA: 20,
  ABSOLUTE_MAX_GPIO_MA: 40,
} as const;

export const LED_SPECS: Record<LedColorId, LedSpec> = {
  red: {
    id: 'red',
    label: 'Rot (2,0 V)',
    forwardVoltage: 2.0,
    hex: '#ff2a2a',
    glowHex: '#ff4d4d',
    wavelengthNm: 625,
  },
  yellow: {
    id: 'yellow',
    label: 'Gelb (2,1 V)',
    forwardVoltage: 2.1,
    hex: '#fbbf24',
    glowHex: '#fde047',
    wavelengthNm: 590,
  },
  green: {
    id: 'green',
    label: 'Grün (2,2 V)',
    forwardVoltage: 2.2,
    hex: '#22c55e',
    glowHex: '#4ade80',
    wavelengthNm: 525,
  },
  blue: {
    id: 'blue',
    label: 'Blau (3,0 V)',
    forwardVoltage: 3.0,
    hex: '#3b82f6',
    glowHex: '#60a5fa',
    wavelengthNm: 470,
  },
  white: {
    id: 'white',
    label: 'Weiß (3,1 V)',
    forwardVoltage: 3.1,
    hex: '#f8fafc',
    glowHex: '#e0f2fe',
    wavelengthNm: 550,
  },
};

const DIGIT_BANDS: ColorBand[] = [
  { name: 'Schwarz', hex: '#141414', label: '0' },
  { name: 'Braun', hex: '#7c3f14', label: '1' },
  { name: 'Rot', hex: '#dc2626', label: '2' },
  { name: 'Orange', hex: '#f97316', label: '3' },
  { name: 'Gelb', hex: '#eab308', label: '4' },
  { name: 'Grün', hex: '#16a34a', label: '5' },
  { name: 'Blau', hex: '#2563eb', label: '6' },
  { name: 'Violett', hex: '#7c3aed', label: '7' },
  { name: 'Grau', hex: '#6b7280', label: '8' },
  { name: 'Weiß', hex: '#f1f5f9', label: '9' },
];

const MULTIPLIER_GOLD: ColorBand = { name: 'Gold', hex: '#d4af37', label: '×0,1' };
const MULTIPLIER_SILVER: ColorBand = { name: 'Silber', hex: '#94a3b8', label: '×0,01' };
const TOLERANCE_GOLD: ColorBand = { name: 'Gold', hex: '#d4af37', label: '±5%' };

export function getResistorColorBands(ohms: number): [ColorBand, ColorBand, ColorBand, ColorBand] {
  const clamped = Math.max(1, Math.min(10_000_000, Math.round(ohms)));

  if (clamped < 10) {
    const first = Math.min(9, Math.max(1, clamped));
    return [DIGIT_BANDS[first], DIGIT_BANDS[0], MULTIPLIER_GOLD, TOLERANCE_GOLD];
  }

  let exponent = Math.floor(Math.log10(clamped)) - 1;
  let significant = Math.round(clamped / Math.pow(10, exponent));

  if (significant >= 100) {
    significant = Math.round(significant / 10);
    exponent += 1;
  }

  const d1 = Math.floor(significant / 10);
  const d2 = significant % 10;

  let multiplierBand: ColorBand;
  if (exponent === -1) {
    multiplierBand = MULTIPLIER_GOLD;
  } else if (exponent === -2) {
    multiplierBand = MULTIPLIER_SILVER;
  } else {
    multiplierBand = DIGIT_BANDS[Math.max(0, Math.min(9, exponent))];
  }

  return [
    DIGIT_BANDS[Math.max(0, Math.min(9, d1))],
    DIGIT_BANDS[Math.max(0, Math.min(9, d2))],
    multiplierBand,
    TOLERANCE_GOLD,
  ];
}

export function formatResistance(ohms: number): string {
  if (ohms >= 1_000_000) {
    const val = ohms / 1_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace('.', ',')} MΩ`;
  }
  if (ohms >= 1_000) {
    const val = ohms / 1_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',')} kΩ`;
  }
  return `${Math.round(ohms)} Ω`;
}

export function computeLdrResistance(lightPercent: number): number {
  const t = Math.max(0, Math.min(100, lightPercent)) / 100;
  const rDark = 100_000;
  const rLight = 500;
  return Math.round(rDark * Math.pow(rLight / rDark, t));
}

export class ComponentRegistry {
  private readonly definitions = new Map<string, ComponentDefinition>();

  constructor() {
    this.registerBuiltins();
  }

  public register(definition: ComponentDefinition): void {
    this.definitions.set(definition.type, definition);
  }

  public get(type: string): ComponentDefinition | undefined {
    return this.definitions.get(type);
  }

  public getAll(): ComponentDefinition[] {
    return Array.from(this.definitions.values());
  }

  public getByCategory(category: ComponentDefinition['category']): ComponentDefinition[] {
    return this.getAll().filter((item) => item.category === category);
  }

  private registerBuiltins(): void {
    this.register({
      type: 'esp32-family',
      displayName: 'ESP32 Mikrocontroller-Familie (6 Modelle)',
      category: 'mcu',
      description: 'DevKit V1, C3 SuperMini, S3-Zero Mini, D1 Mini, S3 DevKitC-1 und C6 DevKitC-1.',
      pins: [
        { id: '3V3', label: '3V3', type: 'power' },
        { id: 'GND', label: 'GND', type: 'ground' },
        { id: 'GPIO', label: 'GPIOs / PWM / I²C / UART', type: 'gpio' },
        { id: 'ADC', label: '12-Bit ADC', type: 'adc' },
      ],
      defaults: { supplyVoltage: 3.3 },
      specs: {
        'Modelle': '6 (3 Standard + 3 Mini)',
        'Logikpegel': '3,3 V DC',
        'Max. GPIO-Strom': '20 mA empfohlen',
      },
    });

    this.register({
      type: 'breadboard',
      displayName: 'Steckbrett (400 Kontakte)',
      category: 'board',
      description: 'Lötfreies Steckbrett mit 30 Reihen à 5 Kontakte und +/- Stromschienen.',
      pins: [
        { id: 'RAIL_POS', label: '+3,3V Schiene', type: 'power' },
        { id: 'RAIL_NEG', label: 'GND Schiene', type: 'ground' },
      ],
      defaults: { rows: 30 },
      specs: { 'Rastermaß': '2,54 mm', 'Stromschienen': '2× (+ / −)' },
    });

    this.register({
      type: 'led-5mm',
      displayName: '5mm LED & RGB-LED',
      category: 'active',
      description: 'Standard-Leuchtdioden (5 Farben) sowie 4-Pin Common-Cathode RGB-LED für PWM-Farbmischung.',
      pins: [
        { id: 'anode', label: 'Anode (+)', type: 'anode' },
        { id: 'cathode', label: 'Kathode (−)', type: 'cathode' },
      ],
      defaults: { color: 'red' },
      specs: { 'Nennstrom': '20 mA', 'Vf': '2,0 V – 3,1 V' },
    });

    this.register({
      type: 'resistor-carbon',
      displayName: 'Kohleschicht-Widerstand (0,25 W)',
      category: 'passive',
      description: 'Strombegrenzung, Pull-Up/Down und Spannungsteiler mit dynamischem 4-Band-Farbcode.',
      pins: [
        { id: 'p1', label: 'A', type: 'passive' },
        { id: 'p2', label: 'B', type: 'passive' },
      ],
      defaults: { ohms: 220 },
      specs: { 'Leistung': '250 mW', 'Toleranz': '±5 %' },
    });

    this.register({
      type: 'capacitor-electrolytic',
      displayName: 'Elektrolyt-Kondensator (Elko)',
      category: 'passive',
      description: 'Speichert elektrische Ladung für RC-Tiefpassfilter, Entprellung und Spannungsglättung.',
      pins: [
        { id: 'pos', label: 'Plus (+)', type: 'anode' },
        { id: 'neg', label: 'Minus (−)', type: 'cathode' },
      ],
      defaults: { uf: 100 },
      specs: { 'Zeitkonstante': 'τ = R · C', 'Spannungsfestigkeit': '16 V' },
    });

    this.register({
      type: 'tactile-button',
      displayName: 'Kurzhub-Taster (SPST-NO)',
      category: 'input',
      description: 'Klickbarer Schließer-Taster für Pull-Down-, Pull-Up- und Floating-Experimente.',
      pins: [
        { id: 'in', label: 'In', type: 'passive' },
        { id: 'out', label: 'Out', type: 'passive' },
      ],
      defaults: { pressed: false },
      specs: { 'Typ': 'SPST Schließer', 'Bedienung': '3D-Klick / Leertaste' },
    });

    this.register({
      type: 'ldr-sensor',
      displayName: 'Fotowiderstand (LDR GL5528)',
      category: 'sensor',
      description: 'Lichtabhängiger Widerstand für analoge Helligkeitsmessung am ADC.',
      pins: [
        { id: 'p1', label: 'A', type: 'passive' },
        { id: 'p2', label: 'B', type: 'passive' },
      ],
      defaults: { lightLevelPercent: 55 },
      specs: { 'Hell': '~500 Ω', 'Dunkel': '~100 kΩ' },
    });

    this.register({
      type: 'ld2490-radar',
      displayName: 'LD2490 24 GHz mmWave Präsenz-Radar',
      category: 'sensor',
      description: 'Hochpräziser 24-GHz-Millimeterwellen-Radarsensor für Anwesenheits-, Atem- und Distanzerkennung via UART & OUT-Pin.',
      pins: [
        { id: 'VCC', label: '5V / 3V3', type: 'power' },
        { id: 'GND', label: 'GND', type: 'ground' },
        { id: 'TX', label: 'UART TX', type: 'gpio' },
        { id: 'RX', label: 'UART RX', type: 'gpio' },
        { id: 'OUT', label: 'Präsenz OUT', type: 'gpio' },
      ],
      defaults: { rangeM: 6.0 },
      specs: { 'Frequenz': '24 GHz ISM (mmWave)', 'Schnittstelle': 'UART + Digital OUT', 'Reichweite': 'bis 6,0 m' },
    });

    this.register({
      type: 'mosfet-nchannel',
      displayName: 'Logic-Level N-Kanal MOSFET (IRLZ44N)',
      category: 'active',
      description: 'Spannungsgesteuerter Leistungstransistor zum Schalten hoher Lastströme per 3,3 V ESP32-GPIO.',
      pins: [
        { id: 'G', label: 'Gate', type: 'gpio' },
        { id: 'D', label: 'Drain', type: 'passive' },
        { id: 'S', label: 'Source', type: 'ground' },
      ],
      defaults: { rdsOn: 0.035 },
      specs: { 'V_GS(th)': '~1,5 V (Logic-Level)', 'R_DS(on)': '35 mΩ' },
    });

    this.register({
      type: 'bme280-i2c',
      displayName: 'BME280 I²C Umweltsensor',
      category: 'sensor',
      description: 'Digitaler Präzisionssensor für Temperatur, Luftfeuchtigkeit und Luftdruck über I²C (0x76).',
      pins: [
        { id: 'VIN', label: '3V3', type: 'power' },
        { id: 'GND', label: 'GND', type: 'ground' },
        { id: 'SCL', label: 'I²C SCL', type: 'gpio' },
        { id: 'SDA', label: 'I²C SDA', type: 'gpio' },
      ],
      defaults: { address: '0x76' },
      specs: { 'Bus': 'I²C (400 kHz)', 'Adresse': '0x76 / 0x77' },
    });

    this.register({
      type: 'hcsr04-ultrasonic',
      displayName: 'HC-SR04 Ultraschallsensor',
      category: 'sensor',
      description: 'Laufzeitmessung mit 40 kHz Ultraschall (2–400 cm) inkl. 3,3 V-Spannungsteiler am ECHO-Pin.',
      pins: [
        { id: 'VCC', label: '5V', type: 'power' },
        { id: 'TRIG', label: 'TRIG', type: 'gpio' },
        { id: 'ECHO', label: 'ECHO (über Teiler)', type: 'gpio' },
        { id: 'GND', label: 'GND', type: 'ground' },
      ],
      defaults: { distanceCm: 45 },
      specs: { 'Bereich': '2 – 400 cm', 'Formel': 'd = t · 343 m/s / 2' },
    });

    this.register({
      type: 'relay-flyback',
      displayName: '5V Relais + 1N4007 Freilaufdiode',
      category: 'active',
      description: 'Elektromagnetischer Schalter mit galvanischer Trennung und Schutzdiode gegen Induktionsspitzen.',
      pins: [
        { id: 'IN', label: 'Steuer-Eingang', type: 'gpio' },
        { id: 'VCC', label: '5V Spule', type: 'power' },
        { id: 'GND', label: 'GND', type: 'ground' },
      ],
      defaults: { flyback: true },
      specs: { 'Spulenstrom': '~70 mA', 'Schutz': '1N4007 antiparallel' },
    });

    this.register({
      type: 'servo-sg90',
      displayName: 'SG90 Mikro-Servo (0°–180°)',
      category: 'active',
      description: 'Positionsgeregelter Modellbau-Servo über 50-Hz-PWM-Steuersignal (1,0 ms bis 2,0 ms Pulsbreite).',
      pins: [
        { id: 'SIG', label: 'PWM Signal', type: 'gpio' },
        { id: 'VCC', label: '5V', type: 'power' },
        { id: 'GND', label: 'GND', type: 'ground' },
      ],
      defaults: { angleDeg: 90 },
      specs: { 'Frequenz': '50 Hz (20 ms)', 'Puls': '0,5–2,5 ms' },
    });

    this.register({
      type: 'piezo-buzzer',
      displayName: 'Passiver Piezo-Summer',
      category: 'active',
      description: 'Erzeugt Töne und Melodien direkt über ein Rechteck-Frequenzsignal (LEDC / tone()).',
      pins: [
        { id: 'pos', label: 'Signal (+)', type: 'gpio' },
        { id: 'neg', label: 'GND (−)', type: 'ground' },
      ],
      defaults: { frequencyHz: 880 },
      specs: { 'Frequenzbereich': '200 Hz – 4 kHz', 'Typ': 'Passiv (Piezo)' },
    });

    this.register({
      type: 'wled-ws2812b',
      displayName: 'WLED WS2812B LED-Streifen (5 V)',
      category: 'active',
      description: 'Einzeln adressierbarer RGB-LED-Streifen (800 kHz Ein-Draht-Protokoll). Benötigt 330 Ω Datenwiderstand, 1000 µF Elko und ab längeren Streifen Power Injection.',
      pins: [
        { id: '5V', label: '+5 V', type: 'power' },
        { id: 'DIN', label: 'Data In (800 kHz)', type: 'gpio' },
        { id: 'GND', label: 'GND', type: 'ground' },
      ],
      defaults: { ledCount: 30, brightnessPct: 75 },
      specs: { 'Strom / LED': 'bis 60 mA (Vollweiß)', 'Protokoll': 'WS2812B 800 kHz', 'Längen': '0,5 m – 5 m (8–300 LEDs)' },
    });

    this.register({
      type: 'level-shifter-74ahct',
      displayName: '74AHCT125 Pegelwandler (3,3 V → 5 V)',
      category: 'active',
      description: 'Hebt das 3,3-V-Datensignal des ESP32 sauber auf 5 V an, damit lange WS2812B-Streifen flackerfrei angesteuert werden.',
      pins: [
        { id: 'IN', label: '3,3 V In', type: 'gpio' },
        { id: 'OUT', label: '5,0 V Out', type: 'gpio' },
        { id: 'VCC', label: '5 V', type: 'power' },
        { id: 'GND', label: 'GND', type: 'ground' },
      ],
      defaults: { active: true },
      specs: { 'Logik-Wandlung': '3,3 V → 5,0 V', 'Einsatz': 'WLED Datenleitung' },
    });

    this.register({
      type: 'meanwell-power',
      displayName: 'Mean Well 5V Netzteil & Akku-USV-Modul',
      category: 'board',
      description: 'Industrie-5V-Schaltnetzteil (Mean Well LRS-Serie) kombiniert mit LiFePO4/Li-Ion-Akku-Pack für stabile Hochstrom-WLED-Versorgung.',
      pins: [
        { id: 'V+', label: '+5 V DC Out', type: 'power' },
        { id: 'V-', label: 'GND (−V)', type: 'ground' },
      ],
      defaults: { voltage: 5.0, capacityMah: 10000 },
      specs: { 'Ausgang': '5,0 V DC (bis 15 A)', 'Akku-Pack': '5–20 Ah (USV / Mobil)' },
    });

    this.register({
      type: 'wago-221',
      displayName: 'WAGO 221 Verbindungsklemme (Ohne Breadboard)',
      category: 'board',
      description: 'Hebelklemme für werkzeuglose, sichere Direktverdrahtung von 5 V, 3,3 V und GND im fertigen Aufbau ohne Steckbrett.',
      pins: [
        { id: 'P1', label: 'Klemme 1–5', type: 'passive' },
      ],
      defaults: { ports: 5 },
      specs: { 'Nennstrom': 'bis 32 A', 'Einsatz': 'Direktaufbau / Gehäuse' },
    });
  }
}

export const defaultComponentRegistry = new ComponentRegistry();
