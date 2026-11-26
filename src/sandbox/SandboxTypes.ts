export type AppMode = 'lessons' | 'sandbox' | 'guided' | 'funny' | 'favorites' | 'soldering' | 'glossary';

export type SandboxToolId = 'place' | 'move' | 'wire' | 'delete';

export type SandboxCategory =
  | 'LEDs & Ausgabe'
  | 'Passiv & Schalter'
  | 'Sensoren'
  | 'Aktoren & Displays';

export type ExtraMeshStyle =
  | 'sensor-pcb'
  | 'sensor-probe'
  | 'sensor-lens'
  | 'sensor-coil'
  | 'sensor-pad'
  | 'actuator-motor'
  | 'actuator-display'
  | 'actuator-relay'
  | 'actuator-audio';

export type ExtraSimKind =
  | 'i2c-sensor'
  | 'digital-sensor'
  | 'analog-sensor'
  | 'uart-sensor'
  | 'two-pin-actuator'
  | 'pwm-actuator'
  | 'i2c-display'
  | 'relay-actuator';

export interface ExtraPartMeta {
  simKind: ExtraSimKind;
  meshStyle: ExtraMeshStyle;
  badgeTitle: string;
  badgeSub: string;
  currentMa: number;
  activeText: string;
  idleText: string;
}

export type SandboxPartType = string;

export interface SandboxCatalogItem {
  type: SandboxPartType;
  name: string;
  shortName: string;
  icon?: string;
  category: SandboxCategory;
  colSpan: number; // wie viele Spalten das Bauteil überspannt
  preferredRow: string;
  pinOffsets: Array<{ dCol: number; row: string; pinLabel: string }>;
  description: string;
  accentHex: string;
  /** Optionales Profil für die 80 erweiterten Sensoren & Aktoren */
  extraMeta?: ExtraPartMeta;
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
  sensorTriggered: boolean; // Globaler Test-Auslöser für Sensoren
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
