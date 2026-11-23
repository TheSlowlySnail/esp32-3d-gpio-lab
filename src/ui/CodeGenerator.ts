import { getEspBoardById } from '../engine/BoardCatalog';
import { formatResistance, LED_SPECS } from '../engine/ComponentRegistry';
import type { CircuitParameters, SimulationResult, ThemeMode } from '../engine/types';
import { renderFritzingSvg } from './FritzingSchematic';

type CodeTab = 'arduino' | 'esphome' | 'fritzing';

export function generateArduinoCode(params: CircuitParameters, result: SimulationResult): string {
  const board = getEspBoardById(params.boardId);
  const p = board.pins;
  const header = `// Board: ${board.name} (${board.architecture})`;

  switch (params.topology) {
    case 'led-resistor': {
      const ledSpec = LED_SPECS[params.ledColor];
      return `${header}
// Lektion 01: LED & Vorwiderstand (${ledSpec.label}, R = ${formatResistance(params.resistorOhms)})
// Berechneter Strom bei 3.3V: ~${result.currentMa.toFixed(1)} mA (Limit: 20 mA)

constexpr uint8_t PIN_LED = ${p.outA.gpio};

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, ${params.gpioOutputHigh ? 'HIGH' : 'LOW'});
}

void loop() {
  digitalWrite(PIN_LED, HIGH);
  delay(1000);
  digitalWrite(PIN_LED, LOW);
  delay(1000);
}`;
    }

    case 'button-pull': {
      const pinModeArg =
        params.pullMode === 'pull-up'
          ? 'INPUT_PULLUP'
          : params.pullMode === 'pull-down'
            ? 'INPUT_PULLDOWN'
            : 'INPUT';
      const activeState = params.pullMode === 'pull-up' ? 'LOW' : 'HIGH';
      return `${header}
// Lektion 02: Taster (${params.pullMode}) an GPIO ${p.inputA.gpio}

constexpr uint8_t PIN_BUTTON = ${p.inputA.gpio};
constexpr uint8_t PIN_STATUS_LED = ${p.outB.gpio};

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUTTON, ${pinModeArg});
  pinMode(PIN_STATUS_LED, OUTPUT);
}

void loop() {
  int raw = digitalRead(PIN_BUTTON);
  bool pressed = (raw == ${activeState});
  digitalWrite(PIN_STATUS_LED, raw);
  Serial.printf("GPIO%d = %s | Taster: %s\\n", PIN_BUTTON, raw ? "HIGH" : "LOW", pressed ? "GEDRUECKT" : "FREI");
  delay(50);
}`;
    }

    case 'voltage-divider': {
      const r2Desc =
        params.dividerMode === 'ldr'
          ? `LDR (~${formatResistance(result.effectiveR2Ohms)})`
          : `R2 = ${formatResistance(params.r2Ohms)}`;
      return `${header}
// Lektion 03: Spannungsteiler & 12-Bit ADC (R1 = ${formatResistance(params.r1Ohms)}, ${r2Desc})

constexpr uint8_t PIN_ADC = ${p.adc.gpio};
constexpr float VCC = 3.3f;
constexpr float R1_OHMS = ${Math.round(params.r1Ohms)}.0f;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
}

void loop() {
  int raw = analogRead(PIN_ADC);
  float vOut = (raw / 4095.0f) * VCC;
  float r2 = (vOut < VCC - 0.01f) ? R1_OHMS * (vOut / (VCC - vOut)) : 1e6f;
  Serial.printf("ADC: %4d | U: %.2f V | R2: %.0f Ohm\\n", raw, vOut, r2);
  delay(200);
}`;
    }

    case 'pwm-dimmer': {
      const duty8 = Math.round((params.pwmDutyPercent / 100) * 255);
      return `${header}
// Lektion 04: Hardware PWM-Dimmer (LEDC) — ${params.pwmDutyPercent}% @ ${params.pwmFrequencyHz} Hz

constexpr uint8_t PIN_PWM = ${p.outA.gpio};
constexpr uint32_t PWM_FREQ_HZ = ${Math.round(params.pwmFrequencyHz)};
constexpr uint8_t PWM_RES_BITS = 8;

void setup() {
  ledcAttach(PIN_PWM, PWM_FREQ_HZ, PWM_RES_BITS);
  ledcWrite(PIN_PWM, ${duty8}); // ${Math.round(params.pwmDutyPercent)} % Tastgrad
}

void loop() {
  // Sanftes Atmen (Fade)
  for (int d = 0; d <= 255; d++) { ledcWrite(PIN_PWM, d); delay(8); }
  for (int d = 255; d >= 0; d--) { ledcWrite(PIN_PWM, d); delay(8); }
}`;
    }

    case 'rgb-led': {
      return `${header}
// Lektion 05: 3-Kanal RGB-LED Farbmischung (${result.rgbHex.toUpperCase()})

constexpr uint8_t PIN_R = ${p.outA.gpio};
constexpr uint8_t PIN_G = ${p.outB.gpio};
constexpr uint8_t PIN_B = ${p.outC.gpio};

void setRgb(uint8_t r, uint8_t g, uint8_t b) {
  ledcWrite(PIN_R, r);
  ledcWrite(PIN_G, g);
  ledcWrite(PIN_B, b);
}

void setup() {
  ledcAttach(PIN_R, 5000, 8);
  ledcAttach(PIN_G, 5000, 8);
  ledcAttach(PIN_B, 5000, 8);
  setRgb(${Math.round(params.rgbRed)}, ${Math.round(params.rgbGreen)}, ${Math.round(params.rgbBlue)});
}

void loop() {}`;
    }

    case 'rc-lowpass': {
      const tauMs = ((params.rcResistorOhms * params.rcCapacitorUf) / 1000).toFixed(1);
      return `${header}
// Lektion 06: RC-Tiefpass (R = ${formatResistance(params.rcResistorOhms)}, C = ${Math.round(params.rcCapacitorUf)} uF, tau = ${tauMs} ms)

constexpr uint8_t PIN_DRIVE = ${p.outA.gpio};
constexpr uint8_t PIN_CAP_ADC = ${p.adc.gpio};

void setup() {
  Serial.begin(115200);
  pinMode(PIN_DRIVE, OUTPUT);
  analogReadResolution(12);
}

void loop() {
  digitalWrite(PIN_DRIVE, ${params.rcInputHigh ? 'HIGH' : 'LOW'});
  float vCap = (analogRead(PIN_CAP_ADC) / 4095.0f) * 3.3f;
  Serial.printf("U_C = %.2f V\\n", vCap);
  delay(25);
}`;
    }

    case 'mosfet-driver': {
      return `${header}
// Lektion 07: Logic-Level N-Kanal MOSFET Lasttreiber (${params.mosfetLoadVoltage} V Last)

constexpr uint8_t PIN_GATE = ${p.outA.gpio};

void setup() {
  pinMode(PIN_GATE, OUTPUT);
  // 10 kOhm Gate-Pulldown sorgt fuer sicheres AUS beim Boot
  digitalWrite(PIN_GATE, ${params.mosfetGateHigh ? 'HIGH' : 'LOW'});
}

void loop() {
  // Optional: PWM am Gate fuer stufenloses Dimmen der ${params.mosfetLoadVoltage}V-Last
  delay(100);
}`;
    }

    case 'i2c-bme280': {
      return `${header}
// Lektion 08: I2C-Bus & BME280 Umweltsensor (Adresse 0x76)
#include <Wire.h>
#include <Adafruit_BME280.h>

constexpr int PIN_SDA = ${p.sda.gpio};
constexpr int PIN_SCL = ${p.scl.gpio};
Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  Wire.begin(PIN_SDA, PIN_SCL, 400000);
  if (!bme.begin(0x76, &Wire)) {
    Serial.println("BME280 nicht gefunden — 4,7k Pull-Ups pruefen!");
    while (true) delay(500);
  }
}

void loop() {
  Serial.printf("T: %.1f C | rH: %.0f %% | P: %.0f hPa\\n",
                bme.readTemperature(), bme.readHumidity(), bme.readPressure() / 100.0f);
  delay(1000);
}`;
    }

    case 'ultrasonic-hcsr04': {
      return `${header}
// Lektion 09: HC-SR04 Ultraschall (ECHO ueber 1k/2k Spannungsteiler auf 3,3V!)

constexpr uint8_t PIN_TRIG = ${p.outA.gpio};
constexpr uint8_t PIN_ECHO = ${p.inputA.gpio};
constexpr uint8_t PIN_WARN_LED = ${p.outB.gpio};

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_WARN_LED, OUTPUT);
}

void loop() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long durationUs = pulseIn(PIN_ECHO, HIGH, 30000);
  float distCm = durationUs / 58.2f;
  digitalWrite(PIN_WARN_LED, (distCm > 0 && distCm < 50.0f) ? HIGH : LOW);
  Serial.printf("Abstand: %.1f cm\\n", distCm);
  delay(150);
}`;
    }

    case 'ld2490-radar': {
      return `${header}
// Lektion 10: HLK-LD2490 24 GHz mmWave Praesenz-Radar (UART + OUT-Pin)
// Verkabelung: LD2490 TX -> ESP GPIO ${p.uartRx.gpio} | LD2490 RX -> ESP GPIO ${p.uartTx.gpio} | OUT -> GPIO ${p.inputA.gpio}

constexpr int PIN_RADAR_RX = ${p.uartRx.gpio};
constexpr int PIN_RADAR_TX = ${p.uartTx.gpio};
constexpr uint8_t PIN_RADAR_OUT = ${p.inputA.gpio};
constexpr uint8_t PIN_STATUS_LED = ${p.outA.gpio};

HardwareSerial RadarSerial(1);

void setup() {
  Serial.begin(115200);
  RadarSerial.begin(256000, SERIAL_8N1, PIN_RADAR_RX, PIN_RADAR_TX);
  pinMode(PIN_RADAR_OUT, INPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  Serial.println("HLK-LD2490 24 GHz mmWave Radar initialisiert.");
}

void loop() {
  bool presence = (digitalRead(PIN_RADAR_OUT) == HIGH);
  digitalWrite(PIN_STATUS_LED, presence ? HIGH : LOW);

  while (RadarSerial.available()) {
    uint8_t frameByte = RadarSerial.read();
    // Hier LD2490-Datenframe (Distanz, Bewegungs- & Ruhe-Energie) parsen
    (void)frameByte;
  }

  Serial.printf("LD2490 OUT: %s | Schwelle: %.1f m\\n",
                presence ? "PRAESENZ ERKANNT" : "FREI", ${params.ld2490ThresholdM.toFixed(1)}f);
  delay(150);
}`;
    }

    case 'relay-flyback': {
      return `${header}
// Lektion 11: 5V Relais mit 1N4007 Freilaufdiode (${params.relayFlybackDiode ? 'SCHUTZ AKTIV' : 'WARNUNG: DIODE FEHLT!'})

constexpr uint8_t PIN_RELAY = ${p.outA.gpio};

void setup() {
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, ${params.relayEnergized ? 'HIGH' : 'LOW'});
}

void loop() {
  digitalWrite(PIN_RELAY, HIGH); // Relais zieht an
  delay(2000);
  digitalWrite(PIN_RELAY, LOW);  // 1N4007 leitet Induktionsspitze sicher ab
  delay(2000);
}`;
    }

    case 'servo-pwm': {
      return `${header}
// Lektion 12: SG90 Mikro-Servo (50 Hz PWM, aktuell ${Math.round(params.servoAngleDeg)} Grad)
#include <ESP32Servo.h>

constexpr uint8_t PIN_SERVO = ${p.outA.gpio};
Servo myServo;

void setup() {
  myServo.setPeriodHertz(50);
  myServo.attach(PIN_SERVO, 500, 2500);
  myServo.write(${Math.round(params.servoAngleDeg)});
}

void loop() {
  // Beispiel: sanfter Schwenk 0..180 Grad
  delay(500);
}`;
    }

    case 'piezo-buzzer': {
      return `${header}
// Lektion 13: Passiver Piezo-Buzzer (${Math.round(params.buzzerFrequencyHz)} Hz)

constexpr uint8_t PIN_BUZZER = ${p.outA.gpio};

void setup() {
  ledcAttach(PIN_BUZZER, ${Math.round(params.buzzerFrequencyHz)}, 8);
  ${params.buzzerEnabled ? `ledcWriteTone(PIN_BUZZER, ${Math.round(params.buzzerFrequencyHz)});` : 'ledcWriteTone(PIN_BUZZER, 0); // Stumm'}
}

void loop() {
  delay(500);
}`;
    }

    case 'wled-compact':
    case 'wled-medium':
    case 'wled-long-injection': {
      const meters = (params.wledLedCount / 60).toFixed(2);
      const bright255 = Math.round((params.wledBrightnessPct / 100) * 255);
      const needsShifter = params.topology !== 'wled-compact';
      const hasInj = params.topology === 'wled-long-injection' && params.wledPowerInjection;
      return `${header}
// WLED / FastLED WS2812B Streifen: ${params.wledLedCount} LEDs (~${meters} m) | Effekt: ${params.wledEffect}
// Hardware: 330 Ohm vor DIN, 1000 uF Elko an 5V/GND${needsShifter ? ', 74AHCT125 Pegelwandler (3.3V->5V)' : ''}${hasInj ? ', 5V Power Injection am Ende' : ''}
// WLED Web-UI Empfehlung: LED Preferences -> GPIO ${p.outA.gpio}, Length ${params.wledLedCount}, Max Current ${params.wledCurrentLimitMa} mA
#include <FastLED.h>

constexpr uint8_t PIN_WLED_DATA = ${p.outA.gpio};
constexpr uint16_t NUM_LEDS = ${params.wledLedCount};
CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2812B, PIN_WLED_DATA, GRB>(leds, NUM_LEDS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, ${Math.round(params.wledCurrentLimitMa)});
  FastLED.setBrightness(${bright255}); // ${Math.round(params.wledBrightnessPct)} %
}

void loop() {
  static uint8_t hue = 0;
  ${
    params.wledEffect === 'solid-white'
      ? 'fill_solid(leds, NUM_LEDS, CRGB::White);'
      : 'fill_rainbow(leds, NUM_LEDS, hue++, 7);'
  }
  FastLED.show();
  delay(20);
}`;
    }
  }
}

export function generateEspHomeYaml(params: CircuitParameters, result: SimulationResult): string {
  const board = getEspBoardById(params.boardId);
  const p = board.pins;
  const espBlock = `esp32:
  board: ${board.esphomeBoard}
  variant: ${board.esphomeVariant}
  framework:
    type: arduino`;

  switch (params.topology) {
    case 'led-resistor': {
      const ledSpec = LED_SPECS[params.ledColor];
      return `# ${board.name} — Lektion 01: LED (${ledSpec.label}, R = ${formatResistance(params.resistorOhms)})
esphome:
  name: learn-${board.id}-led

${espBlock}

output:
  - platform: ledc
    pin: GPIO${p.outA.gpio}
    id: led_output

light:
  - platform: monochromatic
    output: led_output
    name: "Status LED (${ledSpec.id})"`;
    }

    case 'button-pull': {
      const pullYaml =
        params.pullMode === 'pull-up'
          ? `      mode: { input: true, pullup: true }\n      inverted: true`
          : params.pullMode === 'pull-down'
            ? `      mode: { input: true, pulldown: true }`
            : `      mode: { input: true } # WARNUNG: Floating!`;
      return `# ${board.name} — Lektion 02: Taster (${params.pullMode})
esphome:
  name: learn-${board.id}-button

${espBlock}

binary_sensor:
  - platform: gpio
    name: "Steckbrett Taster"
    pin:
      number: GPIO${p.inputA.gpio}
${pullYaml}
    filters:
      - delayed_on: 15ms`;
    }

    case 'voltage-divider': {
      return `# ${board.name} — Lektion 03: Spannungsteiler & ADC (${result.nodeVoltage.toFixed(2)} V)
esphome:
  name: learn-${board.id}-adc

${espBlock}

sensor:
  - platform: adc
    pin: GPIO${p.adc.gpio}
    id: divider_v
    name: "${params.dividerMode === 'ldr' ? 'LDR Spannung' : 'Teiler Spannung'}"
    attenuation: 12db
    update_interval: 1s

  - platform: resistance
    sensor: divider_v
    configuration: DOWNSTREAM
    resistor: ${Math.round(params.r1Ohms)}Ohm
    name: "${params.dividerMode === 'ldr' ? 'LDR Widerstand' : 'R2 Widerstand'}"
    reference_voltage: 3.3V`;
    }

    case 'pwm-dimmer': {
      return `# ${board.name} — Lektion 04: LEDC PWM-Dimmer (${Math.round(params.pwmFrequencyHz)} Hz)
esphome:
  name: learn-${board.id}-pwm

${espBlock}

output:
  - platform: ledc
    pin: GPIO${p.outA.gpio}
    frequency: ${Math.round(params.pwmFrequencyHz)}Hz
    id: pwm_led

light:
  - platform: monochromatic
    output: pwm_led
    name: "Dimmbare LED"`;
    }

    case 'rgb-led': {
      return `# ${board.name} — Lektion 05: 3-Kanal RGB-LED (${result.rgbHex.toUpperCase()})
esphome:
  name: learn-${board.id}-rgb

${espBlock}

output:
  - platform: ledc
    pin: GPIO${p.outA.gpio}
    id: out_r
  - platform: ledc
    pin: GPIO${p.outB.gpio}
    id: out_g
  - platform: ledc
    pin: GPIO${p.outC.gpio}
    id: out_b

light:
  - platform: rgb
    name: "RGB Steckbrett-LED"
    red: out_r
    green: out_g
    blue: out_b`;
    }

    case 'rc-lowpass': {
      return `# ${board.name} — Lektion 06: RC-Tiefpass (R = ${formatResistance(params.rcResistorOhms)}, C = ${Math.round(params.rcCapacitorUf)}uF)
esphome:
  name: learn-${board.id}-rc

${espBlock}

output:
  - platform: gpio
    pin: GPIO${p.outA.gpio}
    id: rc_drive

sensor:
  - platform: adc
    pin: GPIO${p.adc.gpio}
    name: "Kondensator Spannung"
    attenuation: 12db
    update_interval: 100ms`;
    }

    case 'mosfet-driver': {
      return `# ${board.name} — Lektion 07: N-Kanal MOSFET Lasttreiber (${params.mosfetLoadVoltage}V)
esphome:
  name: learn-${board.id}-mosfet

${espBlock}

output:
  - platform: ledc
    pin: GPIO${p.outA.gpio}
    frequency: 1000Hz
    id: mosfet_gate

light:
  - platform: monochromatic
    output: mosfet_gate
    name: "${params.mosfetLoadVoltage}V LED-Streifen (MOSFET)"`;
    }

    case 'i2c-bme280': {
      return `# ${board.name} — Lektion 08: I2C-Bus & BME280 Umweltsensor
esphome:
  name: learn-${board.id}-bme280

${espBlock}

i2c:
  sda: GPIO${p.sda.gpio}
  scl: GPIO${p.scl.gpio}
  frequency: 400kHz

sensor:
  - platform: bme280_i2c
    address: 0x76
    temperature: { name: "Temperatur" }
    humidity: { name: "Luftfeuchtigkeit" }
    pressure: { name: "Luftdruck" }
    update_interval: 10s`;
    }

    case 'ultrasonic-hcsr04': {
      return `# ${board.name} — Lektion 09: HC-SR04 Ultraschall (ECHO via 1k/2k Teiler)
esphome:
  name: learn-${board.id}-hcsr04

${espBlock}

sensor:
  - platform: ultrasonic
    trigger_pin: GPIO${p.outA.gpio}
    echo_pin: GPIO${p.inputA.gpio}
    name: "Ultraschall Abstand"
    update_interval: 0.5s`;
    }

    case 'ld2490-radar': {
      return `# ${board.name} — Lektion 10: HLK-LD2490 24 GHz mmWave Präsenz-Radar
esphome:
  name: learn-${board.id}-ld2490

${espBlock}

uart:
  id: ld2490_uart
  tx_pin: GPIO${p.uartTx.gpio}
  rx_pin: GPIO${p.uartRx.gpio}
  baud_rate: 256000
  parity: NONE
  stop_bits: 1

binary_sensor:
  - platform: gpio
    name: "LD2490 Präsenz (OUT)"
    pin: GPIO${p.inputA.gpio}
    device_class: occupancy
    on_state:
      then:
        - output.set_level:
            id: presence_led
            level: !lambda 'return x ? 1.0 : 0.0;'

output:
  - platform: ledc
    pin: GPIO${p.outA.gpio}
    id: presence_led`;
    }

    case 'relay-flyback': {
      return `# ${board.name} — Lektion 11: 5V Relais + 1N4007 Freilaufdiode
esphome:
  name: learn-${board.id}-relay

${espBlock}

switch:
  - platform: gpio
    pin: GPIO${p.outA.gpio}
    name: "5V Relais-Schalter"
    restore_mode: ALWAYS_OFF`;
    }

    case 'servo-pwm': {
      return `# ${board.name} — Lektion 12: SG90 Mikro-Servo (50 Hz PWM)
esphome:
  name: learn-${board.id}-servo

${espBlock}

output:
  - platform: ledc
    pin: GPIO${p.outA.gpio}
    frequency: 50Hz
    id: servo_pwm

servo:
  - id: sg90_servo
    output: servo_pwm
    min_level: 2.5%
    max_level: 12.5%`;
    }

    case 'piezo-buzzer': {
      return `# ${board.name} — Lektion 13: Passiver Piezo-Buzzer (RTTTL / LEDC)
esphome:
  name: learn-${board.id}-buzzer

${espBlock}

output:
  - platform: ledc
    pin: GPIO${p.outA.gpio}
    id: rtttl_out

rtttl:
  output: rtttl_out
  id: piezo_player`;
    }

    case 'wled-compact':
    case 'wled-medium':
    case 'wled-long-injection': {
      const meters = (params.wledLedCount / 60).toFixed(2);
      return `# ${board.name} — WLED / WS2812B (${params.wledLedCount} LEDs, ~${meters} m)
# WLED-Settings: GPIO ${p.outA.gpio} | LEDs: ${params.wledLedCount} | Limiter: ${Math.round(params.wledCurrentLimitMa)} mA
# Hinweis: ESPHome unterstützt auch direkte WLED-E1.31/DDP-Steuerung!
esphome:
  name: wled-${board.id}-${params.wledLedCount}leds

${espBlock}

light:
  - platform: esp32_rmt_led_strip
    rgb_order: GRB
    pin: GPIO${p.outA.gpio}
    num_leds: ${params.wledLedCount}
    chipset: WS2812
    name: "WLED Streifen (${params.wledLedCount} LEDs)"
    effects:
      - addressable_rainbow:
      - addressable_scan:
      - addressable_fireworks:
      - wled:
          port: 21324`;
    }
  }
}

export class CodeGeneratorPanel {
  private readonly container: HTMLElement;
  private readonly onOpenLargeSchematic?: () => void;
  private activeTab: CodeTab = 'arduino';
  private theme: ThemeMode = 'dark';
  private lastCode = '';
  private lastSvg = '';
  private lastParams: CircuitParameters | null = null;
  private lastResult: SimulationResult | null = null;
  private copyTimer = 0;

  private tabArduinoBtn!: HTMLButtonElement;
  private tabEsphomeBtn!: HTMLButtonElement;
  private tabFritzingBtn!: HTMLButtonElement;
  private copyBtn!: HTMLButtonElement;
  private expandBtn!: HTMLButtonElement;
  private codeWrapEl!: HTMLElement;
  private fritzingWrapEl!: HTMLElement;
  private codeEl!: HTMLElement;

  constructor(container: HTMLElement, onOpenLargeSchematic?: () => void) {
    this.container = container;
    this.onOpenLargeSchematic = onOpenLargeSchematic;
    this.renderShell();
  }

  private renderShell(): void {
    this.container.innerHTML = `
      <div class="eng-code-panel flex flex-col h-full rounded-lg border overflow-hidden">
        <div class="eng-header flex items-center justify-between px-2.5 py-1.5 border-b gap-2">
          <div class="flex items-center gap-1 overflow-x-auto">
            <button data-code="tab-arduino" type="button" class="px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap">
              Arduino C++
            </button>
            <button data-code="tab-esphome" type="button" class="px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap">
              ESPHome YAML
            </button>
            <button data-code="tab-fritzing" type="button" class="px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap">
              Fritzing-Plan
            </button>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button data-code="expand" type="button" class="hidden eng-btn-neutral px-2 py-1 rounded border text-[11px] font-mono transition cursor-pointer">
              Großansicht ↗
            </button>
            <button data-code="copy" type="button" class="eng-btn-neutral px-2.5 py-1 rounded border text-[11px] font-mono transition cursor-pointer">
              Kopieren
            </button>
          </div>
        </div>
        <div data-code="code-wrap" class="flex-1 overflow-auto p-3">
          <pre class="code-block eng-text-main whitespace-pre"><code data-code="content"></code></pre>
        </div>
        <div data-code="fritzing-wrap" class="hidden flex-1 overflow-hidden p-1.5 items-center justify-center"></div>
      </div>
    `;

    this.tabArduinoBtn = this.container.querySelector('[data-code="tab-arduino"]')!;
    this.tabEsphomeBtn = this.container.querySelector('[data-code="tab-esphome"]')!;
    this.tabFritzingBtn = this.container.querySelector('[data-code="tab-fritzing"]')!;
    this.copyBtn = this.container.querySelector('[data-code="copy"]')!;
    this.expandBtn = this.container.querySelector('[data-code="expand"]')!;
    this.codeWrapEl = this.container.querySelector('[data-code="code-wrap"]')!;
    this.fritzingWrapEl = this.container.querySelector('[data-code="fritzing-wrap"]')!;
    this.codeEl = this.container.querySelector('[data-code="content"]')!;

    this.tabArduinoBtn.addEventListener('click', () => this.setTab('arduino'));
    this.tabEsphomeBtn.addEventListener('click', () => this.setTab('esphome'));
    this.tabFritzingBtn.addEventListener('click', () => this.setTab('fritzing'));
    this.copyBtn.addEventListener('click', () => this.copyCurrentCode());
    this.expandBtn.addEventListener('click', () => this.onOpenLargeSchematic?.());

    this.updateTabStyles();
  }

  public setTheme(theme: ThemeMode): void {
    this.theme = theme;
    this.lastSvg = '';
    if (this.lastParams && this.lastResult && this.activeTab === 'fritzing') {
      this.refreshView(this.lastParams, this.lastResult);
    }
  }

  public setTab(tab: CodeTab): void {
    this.activeTab = tab;
    this.updateTabStyles();
    if (this.lastParams && this.lastResult) {
      this.refreshView(this.lastParams, this.lastResult);
    }
  }

  private updateTabStyles(): void {
    const activeCls = 'bg-cyan-500/15 eng-text-accent border border-cyan-500/45';
    const inactiveCls = 'eng-text-muted hover:eng-text-main border border-transparent';

    this.tabArduinoBtn.className = `px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap ${
      this.activeTab === 'arduino' ? activeCls : inactiveCls
    }`;
    this.tabEsphomeBtn.className = `px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap ${
      this.activeTab === 'esphome' ? activeCls : inactiveCls
    }`;
    this.tabFritzingBtn.className = `px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap ${
      this.activeTab === 'fritzing' ? activeCls : inactiveCls
    }`;

    const isFritzing = this.activeTab === 'fritzing';
    this.codeWrapEl.classList.toggle('hidden', isFritzing);
    this.fritzingWrapEl.classList.toggle('hidden', !isFritzing);
    this.fritzingWrapEl.classList.toggle('flex', isFritzing);
    this.expandBtn.classList.toggle('hidden', !isFritzing);
    this.copyBtn.classList.toggle('hidden', isFritzing);
  }

  public update(params: CircuitParameters, result: SimulationResult): void {
    this.lastParams = { ...params };
    this.lastResult = result;
    this.refreshView(params, result);
  }

  private refreshView(params: CircuitParameters, result: SimulationResult): void {
    if (this.activeTab === 'fritzing') {
      const svg = renderFritzingSvg(params, result, this.theme);
      if (svg !== this.lastSvg) {
        this.lastSvg = svg;
        this.fritzingWrapEl.innerHTML = svg;
      }
      return;
    }

    const code =
      this.activeTab === 'arduino'
        ? generateArduinoCode(params, result)
        : generateEspHomeYaml(params, result);

    if (code !== this.lastCode) {
      this.lastCode = code;
      this.codeEl.textContent = code;
    }
  }

  private async copyCurrentCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.lastCode);
      this.copyBtn.textContent = 'Kopiert ✓';
      this.copyBtn.classList.add('!text-emerald-500', '!border-emerald-500/60');
    } catch {
      this.copyBtn.textContent = 'Markiert';
    }
    window.clearTimeout(this.copyTimer);
    this.copyTimer = window.setTimeout(() => {
      this.copyBtn.textContent = 'Kopieren';
      this.copyBtn.classList.remove('!text-emerald-500', '!border-emerald-500/60');
    }, 1800);
  }
}
