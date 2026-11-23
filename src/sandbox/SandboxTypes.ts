export type AppMode = 'lessons' | 'sandbox' | 'guided' | 'funny';

export type SandboxToolId = 'place' | 'move' | 'wire' | 'delete';

export type SandboxPartType =
  // LEDs & Ausgabe (7)
  | 'led-red'
  | 'led-green'
  | 'led-blue'
  | 'led-yellow'
  | 'led-rgb'
  | 'neopixel-ring'
  | 'laser-diode'
  // Passiv, Schalter & Leistung (8)
  | 'resistor-220'
  | 'resistor-10k'
  | 'potentiometer'
  | 'button'
  | 'slide-switch'
  | 'capacitor'
  | 'diode-1n4007'
  | 'mosfet-irlz44n'
  // Sensoren (14)
  | 'ldr'
  | 'bme280'
  | 'dht22'
  | 'hcsr04'
  | 'ld2490'
  | 'pir-hc501'
  | 'mq2-gas'
  | 'soil-moisture'
  | 'mpu6050'
  | 'rfid-rc522'
  | 'touch-ttp223'
  | 'sound-mic'
  | 'hall-sensor'
  | 'rain-sensor'
  // Aktoren & Displays (7)
  | 'oled'
  | 'seven-seg'
  | 'servo'
  | 'buzzer'
  | 'relay-module'
  | 'cooling-fan'
  | 'vib-motor';

export type SandboxCategory =
  | 'LEDs & Ausgabe'
  | 'Passiv & Schalter'
  | 'Sensoren'
  | 'Aktoren & Displays';

export interface SandboxCatalogItem {
  type: SandboxPartType;
  name: string;
  shortName: string;
  category: SandboxCategory;
  colSpan: number; // wie viele Spalten das Bauteil überspannt
  preferredRow: string;
  pinOffsets: Array<{ dCol: number; row: string; pinLabel: string }>;
  description: string;
  accentHex: string;
}

export interface WireEndpoint {
  kind: 'board' | 'breadboard';
  /** z.B. '3V3', 'GND', 'outA', 'inputA', 'sda', 'scl' */
  boardPinRole?: string;
  /** Breadboard Spalte 1..30 */
  col?: number;
  /** Breadboard Reihe 'a'..'j' | '+top' | '-top' | '+bot' | '-bot' */
  row?: string;
}

export interface PlacedPart {
  id: string;
  type: SandboxPartType;
  col: number; // Anker-Spalte (1..28)
  row: string; // Anker-Reihe (z.B. 'g', 'h')
}

export interface PlacedWire {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  colorHex: string;
}

export interface SandboxState {
  parts: PlacedPart[];
  wires: PlacedWire[];
  gpioHigh: boolean;
  buttonPressed: boolean;
  lightPercent: number;
  servoAngleDeg: number;
  radarPresent: boolean;
  sensorTriggered: boolean; // Globaler Test-Auslöser für PIR, Gas, Feuchte, Touch, Sound, Hall, Regen, RFID
  switchClosed: boolean; // Schiebeschalter EIN/AUS
}

export interface PartRuntimeState {
  partId: string;
  powered: boolean;
  active: boolean;
  brightnessPct: number;
  overcurrent: boolean;
  currentMa: number;
  statusText: string;
}

export interface SandboxSimSummary {
  totalCurrentMa: number;
  activePartsCount: number;
  overcurrentAlert: boolean;
  nodeVoltage: number;
  probeLabel: string;
  partStates: Map<string, PartRuntimeState>;
  statusBadge: string;
  statusTone: 'ok' | 'info' | 'warning' | 'danger';
  whatHappens: string;
  whyItHappens: string;
}

export interface HighlightMarker {
  endpoint: WireEndpoint;
  colorHex: string;
  label?: string;
}
