export type AppMode = 'lessons' | 'sandbox' | 'guided';

export type SandboxToolId = 'place' | 'wire' | 'delete';

export type SandboxPartType =
  | 'led-red'
  | 'led-green'
  | 'led-blue'
  | 'resistor-220'
  | 'resistor-10k'
  | 'button'
  | 'ldr'
  | 'capacitor'
  | 'bme280'
  | 'hcsr04'
  | 'ld2490'
  | 'oled'
  | 'servo'
  | 'buzzer';

export interface SandboxCatalogItem {
  type: SandboxPartType;
  name: string;
  shortName: string;
  category: 'LEDs & Ausgabe' | 'Passiv & Taster' | 'Sensoren' | 'Aktoren & Display';
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
  col: number; // Anker-Spalte (1..26)
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
