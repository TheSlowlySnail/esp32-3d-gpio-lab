export type LogicLevel = 'HIGH' | 'LOW' | 'FLOATING' | 'UNDEFINED';

export type ThemeMode = 'dark' | 'light';

export type LedColorId = 'red' | 'yellow' | 'green' | 'blue' | 'white';

export type PullMode = 'pull-down' | 'pull-up' | 'floating';

export type DividerSensorMode = 'resistors' | 'ldr';

export type WledEffectId = 'rainbow' | 'chase' | 'solid-white' | 'fire' | 'breathe';

export type WledPowerSourceId = 'meanwell-psu' | 'meanwell-battery';

export type EspBoardId =
  | 'esp32-devkit-v1'
  | 'esp32-c3-supermini'
  | 'esp32-s3-zero'
  | 'esp32-d1-mini'
  | 'esp32-s3-devkitc'
  | 'esp32-c6-devkit';

export type CircuitTopologyId =
  | 'led-resistor'
  | 'button-pull'
  | 'voltage-divider'
  | 'pwm-dimmer'
  | 'rgb-led'
  | 'rc-lowpass'
  | 'mosfet-driver'
  | 'i2c-bme280'
  | 'ultrasonic-hcsr04'
  | 'ld2490-radar'
  | 'relay-flyback'
  | 'servo-pwm'
  | 'piezo-buzzer'
  | 'wled-compact'
  | 'wled-medium'
  | 'wled-long-injection';

export type ComponentCategory = 'mcu' | 'passive' | 'active' | 'input' | 'sensor' | 'board';

export interface ColorBand {
  name: string;
  hex: string;
  label: string;
}

export interface ComponentPinDef {
  id: string;
  label: string;
  type: 'power' | 'ground' | 'gpio' | 'adc' | 'passive' | 'anode' | 'cathode';
}

export interface ComponentDefinition {
  type: string;
  displayName: string;
  category: ComponentCategory;
  description: string;
  pins: ComponentPinDef[];
  defaults: Record<string, number | string | boolean>;
  specs: Record<string, string>;
}

export interface LedSpec {
  id: LedColorId;
  label: string;
  forwardVoltage: number;
  hex: string;
  glowHex: string;
  wavelengthNm: number;
}

export interface BoardPinAssignment {
  outA: { label: string; gpio: number };
  outB: { label: string; gpio: number };
  outC: { label: string; gpio: number };
  inputA: { label: string; gpio: number };
  adc: { label: string; gpio: number };
  sda: { label: string; gpio: number };
  scl: { label: string; gpio: number };
  uartTx: { label: string; gpio: number };
  uartRx: { label: string; gpio: number };
}

export interface EspBoardSpec {
  id: EspBoardId;
  name: string;
  shortName: string;
  isMini: boolean;
  chipLabel: string;
  architecture: string;
  wireless: string;
  flash: string;
  esphomeBoard: string;
  esphomeVariant: 'ESP32' | 'ESP32C3' | 'ESP32S3' | 'ESP32C6';
  pcbColorHex: string;
  accentHex: string;
  width: number;
  depth: number;
  pinCountPerSide: number;
  hasDualUsb: boolean;
  hasCeramicAntenna: boolean;
  hasRgbOnboardLed: boolean;
  pins: BoardPinAssignment;
  leftPinLabels: string[];
  rightPinLabels: string[];
}

export interface RemovablePartDef {
  id: string;
  label: string;
  shortLabel: string;
  role: string;
  removedEffectHint: string;
}

export interface HoverPartInfo {
  partId: string;
  name: string;
  categoryLabel: string;
  description: string;
  specLine: string;
  removable: boolean;
  isRemoved: boolean;
}

export interface SceneExplanation {
  statusBadge: string;
  statusTone: 'ok' | 'info' | 'warning' | 'danger';
  whatHappens: string;
  whyItHappens: string;
}

export interface CircuitParameters {
  boardId: EspBoardId;
  topology: CircuitTopologyId;
  supplyVoltage: number; // 3.3 V

  // Virtuell entfernte Bauteile in der aktiven Lektion
  removedParts: string[];

  // Aufbau-Modus: mit Steckbrett oder direkte Verdrahtung (WAGO / Löten)
  withoutBreadboard: boolean;

  // 01: LED & Vorwiderstand
  gpioOutputHigh: boolean;
  ledColor: LedColorId;
  resistorOhms: number;

  // 02: Taster & Pull-Up/Down/Floating
  pullMode: PullMode;
  pullResistorOhms: number;
  buttonPressed: boolean;
  noiseAmplitude: number;

  // 03: Spannungsteiler & ADC
  dividerMode: DividerSensorMode;
  r1Ohms: number;
  r2Ohms: number;
  lightLevelPercent: number;

  // 04: PWM-Dimmer (LEDC)
  pwmDutyPercent: number;
  pwmFrequencyHz: number;

  // 05: RGB-LED
  rgbRed: number;
  rgbGreen: number;
  rgbBlue: number;

  // 06: RC-Tiefpass & Kondensator
  rcInputHigh: boolean;
  rcAutoPulse: boolean;
  rcResistorOhms: number;
  rcCapacitorUf: number;

  // 07: MOSFET Lasttreiber
  mosfetGateHigh: boolean;
  mosfetLoadVoltage: number;
  mosfetLoadOhms: number;

  // 08: I2C BME280 Sensor
  bmeTempC: number;
  bmeHumidityPct: number;
  bmePressureHpa: number;
  i2cPullupEnabled: boolean;

  // 09: HC-SR04 Ultraschall
  ultrasonicDistanceCm: number;

  // 10: LD2490 24 GHz mmWave Radar
  ld2490TargetDistanceM: number;
  ld2490ThresholdM: number;
  ld2490TargetMoving: boolean;
  ld2490TargetPresent: boolean;

  // 11: Relais & Freilaufdiode
  relayEnergized: boolean;
  relayFlybackDiode: boolean;

  // 12: SG90 Servo
  servoAngleDeg: number;

  // 13: Piezo-Buzzer
  buzzerEnabled: boolean;
  buzzerFrequencyHz: number;

  // 14–16: WLED WS2812B LED-Streifen + Mean Well PSU / Akku
  wledLedCount: number; // 8 .. 300 LEDs
  wledBrightnessPct: number; // 0 .. 100 %
  wledEffect: WledEffectId;
  wledPowerInjection: boolean;
  wledCurrentLimitMa: number;
  wledPowerSource: WledPowerSourceId;
  wledBatteryCapacityMah: number; // z.B. 5000 .. 20000 mAh
  wledBatterySocPct: number; // 10 .. 100 % Ladezustand
}

export interface CircuitWarning {
  severity: 'info' | 'warning' | 'danger';
  code: string;
  title: string;
  message: string;
}

export interface SimulationResult {
  timestamp: number;
  topology: CircuitTopologyId;
  boardId: EspBoardId;

  probeLabel: string;
  probePin: string;
  nodeVoltage: number;
  currentMa: number;
  powerMw: number;
  logicLevel: LogicLevel;

  extraTitle: string;
  extraDisplay: string;
  extraPercent: number;

  ledForwardVoltage: number;
  ledVoltageDrop: number;
  resistorVoltageDrop: number;
  ledBrightnessPercent: number;
  isOvercurrent: boolean;
  isCriticalOvercurrent: boolean;

  adcRaw: number;
  adcPercent: number;
  effectiveR1Ohms: number;
  effectiveR2Ohms: number;

  statusLedOn: boolean;
  rgbHex: string;
  capacitorChargeRatio: number;
  radarDetected: boolean;
  radarSignalStrength: number;
  relayClosed: boolean;
  kickbackSpikeActive: boolean;
  servoAngleDeg: number;
  buzzerActive: boolean;

  // WLED-specific telemetry
  wledEndVoltage: number; // 5V at start -> drops toward end without injection!
  wledVoltageDropRatio: number; // 0 (none) .. 1 (severe yellow/red shift at tail)
  wledDataGlitch: boolean; // true when data resistor or level shifter removed
  wledEffectiveBrightnessPct: number;
  wledBatteryRuntimeHours: number; // geschätzte Laufzeit im Akku-Betrieb

  // Live human-readable narration of what happens & why
  explanation: SceneExplanation;

  warnings: CircuitWarning[];
}
