import type { GuidedProject, GuidedStep } from './GuidedProjects';
import { getElectricalNetId } from './SandboxEngine';
import type { SandboxPartType, SandboxState, WireEndpoint } from './SandboxTypes';

function hasPartAt(state: SandboxState, type: SandboxPartType, col: number, tolerance = 2): boolean {
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

function wireStep(
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

function partStep(
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
    highlights: [{ endpoint: { kind: 'breadboard', col, row }, colorHex: '#f59e0b', label: 'Hier' }],
    isCompleted: (s) => hasPartAt(s, partType, col),
  };
}

type BuildRecipe =
  | {
      kind: 'sensor-and-actuator';
      id: string;
      title: string;
      difficulty: GuidedProject['difficulty'];
      summary: string;
      completion: string;
      sensorType: SandboxPartType;
      sensorLabel: string;
      sensorIsI2c?: boolean;
      actuatorType: SandboxPartType;
      actuatorLabel: string;
      actuatorKind: 'two-pin' | 'pwm3' | 'i2c-display';
    };

function buildGuidedFromRecipe(r: BuildRecipe): GuidedProject {
  const steps: GuidedStep[] = [
    wireStep(
      `${r.id}-vcc`,
      '3,3-V-Plus-Schiene versorgen',
      'Verbinde 3V3 am Board mit der roten Plus-Schiene (Spalte 2, +top).',
      'Versorgt Sensor und Aktor gemeinsam über die obere Stromschiene.',
      { kind: 'board', boardPinRole: '3V3' },
      { kind: 'breadboard', col: 2, row: '+top' },
      '#ef4444',
    ),
    wireStep(
      `${r.id}-gnd`,
      'GND-Minus-Schiene verbinden',
      'Verbinde GND am Board mit der blauen Minus-Schiene (Spalte 3, -top).',
      'Gemeinsame Masse ist Pflicht, damit alle Signale denselben Bezugspunkt haben.',
      { kind: 'board', boardPinRole: 'GND' },
      { kind: 'breadboard', col: 3, row: '-top' },
      '#1e293b',
    ),
    partStep(
      `${r.id}-s-part`,
      `${r.sensorLabel} bei Spalte 6 stecken`,
      `Klicke auf Spalte 6, um ${r.sensorLabel} auf dem Steckbrett zu platzieren.`,
      'Der Sensor misst die physikalische Größe und liefert das Eingangssignal ans Board.',
      r.sensorType,
      6,
      r.sensorIsI2c ? 'f' : 'g',
    ),
    wireStep(
      `${r.id}-s-vcc`,
      `${r.sensorLabel} mit +3,3 V versorgen`,
      'Verbinde Spalte 6 (Reihe j) mit der Plus-Schiene (6 +top).',
      'Aktiviert die interne Sensor-Elektronik.',
      { kind: 'breadboard', col: 6, row: 'j' },
      { kind: 'breadboard', col: 6, row: '+top' },
      '#ef4444',
    ),
    wireStep(
      `${r.id}-s-gnd`,
      `${r.sensorLabel} an GND anschließen`,
      `Verbinde Spalte ${r.sensorIsI2c ? 7 : 8} (Reihe j) mit der Minus-Schiene.`,
      'Schließt den Versorgungskreis des Sensors.',
      { kind: 'breadboard', col: r.sensorIsI2c ? 7 : 8, row: 'j' },
      { kind: 'breadboard', col: r.sensorIsI2c ? 7 : 8, row: '-top' },
      '#1e293b',
    ),
  ];

  if (r.sensorIsI2c) {
    steps.push(
      wireStep(
        `${r.id}-s-scl`,
        `I²C Takt (SCL) für ${r.sensorLabel}`,
        'Verbinde SCL am Board mit Spalte 8 (Reihe i).',
        'Synchronisiert die digitale I²C-Kommunikation.',
        { kind: 'board', boardPinRole: 'scl' },
        { kind: 'breadboard', col: 8, row: 'i' },
        '#facc15',
      ),
      wireStep(
        `${r.id}-s-sda`,
        `I²C Daten (SDA) für ${r.sensorLabel}`,
        'Verbinde SDA am Board mit Spalte 9 (Reihe h).',
        'Überträgt die digitalen Messwerte vom Sensor ans Board.',
        { kind: 'board', boardPinRole: 'sda' },
        { kind: 'breadboard', col: 9, row: 'h' },
        '#38bdf8',
      ),
    );
  } else {
    steps.push(
      wireStep(
        `${r.id}-s-sig`,
        `Sensor-Signal von ${r.sensorLabel} ans Board`,
        'Verbinde Spalte 7 (Reihe i) mit dem Board-Eingang (inputA).',
        'Liest das Mess- oder Schaltsignal live am Mikrocontroller ein.',
        { kind: 'breadboard', col: 7, row: 'i' },
        { kind: 'board', boardPinRole: 'inputA' },
        '#22c55e',
      ),
    );
  }

  // Actuator placement & wiring at col 18
  steps.push(
    partStep(
      `${r.id}-a-part`,
      `${r.actuatorLabel} bei Spalte 18 stecken`,
      `Klicke auf Spalte 18, um ${r.actuatorLabel} auf dem Steckbrett einzusetzen.`,
      'Der Aktor reagiert sichtbar oder hörbar auf dein Sensor-Signal!',
      r.actuatorType,
      18,
      r.actuatorKind === 'i2c-display' ? 'f' : 'g',
    ),
  );

  if (r.actuatorKind === 'two-pin') {
    steps.push(
      wireStep(
        `${r.id}-a-sig`,
        `${r.actuatorLabel} an GPIO-Ausgang anschließen`,
        'Verbinde Ausgang 1 (outA) am Board mit Spalte 18 (Reihe f).',
        'Steuert deinen Aktor direkt über den Board-Ausgang.',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 18, row: 'f' },
        '#f97316',
      ),
      wireStep(
        `${r.id}-a-gnd`,
        `${r.actuatorLabel} an GND — Schaltung startet!`,
        'Verbinde Spalte 20 (Reihe j) mit der Minus-Schiene (20 -top).',
        'Schließt den Lastkreis — sofort wird dein Aktor live aktiv!',
        { kind: 'breadboard', col: 20, row: 'j' },
        { kind: 'breadboard', col: 20, row: '-top' },
        '#1e293b',
      ),
    );
  } else if (r.actuatorKind === 'pwm3') {
    steps.push(
      wireStep(
        `${r.id}-a-vcc`,
        `${r.actuatorLabel} mit +V versorgen`,
        'Verbinde Spalte 19 (Reihe j) mit der Plus-Schiene (19 +top).',
        'Versorgt die Leistungsendstufe des Aktors.',
        { kind: 'breadboard', col: 19, row: 'j' },
        { kind: 'breadboard', col: 19, row: '+top' },
        '#ef4444',
      ),
      wireStep(
        `${r.id}-a-gnd`,
        `${r.actuatorLabel} an GND anschließen`,
        'Verbinde Spalte 20 (Reihe j) mit der Minus-Schiene (20 -top).',
        'Gemeinsame Masse für saubere PWM-/Steuersignale.',
        { kind: 'breadboard', col: 20, row: 'j' },
        { kind: 'breadboard', col: 20, row: '-top' },
        '#1e293b',
      ),
      wireStep(
        `${r.id}-a-sig`,
        `Steuersignal an ${r.actuatorLabel} — Projekt läuft!`,
        'Verbinde Ausgang 1 (outA) am Board mit Spalte 18 (Reihe f).',
        'Aktiviert den Aktor mit voller 3D-Animation!',
        { kind: 'board', boardPinRole: 'outA' },
        { kind: 'breadboard', col: 18, row: 'f' },
        '#f97316',
      ),
    );
  } else {
    steps.push(
      wireStep(
        `${r.id}-d-gnd`,
        `${r.actuatorLabel} Masse (GND) anschließen`,
        'Verbinde Spalte 18 (Reihe j) mit der Minus-Schiene (18 -top).',
        'Masseanschluss für das I²C-Display.',
        { kind: 'breadboard', col: 18, row: 'j' },
        { kind: 'breadboard', col: 18, row: '-top' },
        '#1e293b',
      ),
      wireStep(
        `${r.id}-d-vcc`,
        `${r.actuatorLabel} Plus (+3,3 V) anschließen`,
        'Verbinde Spalte 19 (Reihe j) mit der Plus-Schiene (19 +top).',
        'Versorgt Display-Controller und Hintergrundbeleuchtung.',
        { kind: 'breadboard', col: 19, row: 'j' },
        { kind: 'breadboard', col: 19, row: '+top' },
        '#ef4444',
      ),
      wireStep(
        `${r.id}-d-scl`,
        `I²C SCL an ${r.actuatorLabel}`,
        'Verbinde SCL am Board mit Spalte 20 (Reihe i).',
        'Gemeinsamer I²C-Takt (mehrere Geräte können sich SCL teilen!).',
        { kind: 'board', boardPinRole: 'scl' },
        { kind: 'breadboard', col: 20, row: 'i' },
        '#facc15',
      ),
      wireStep(
        `${r.id}-d-sda`,
        `I²C SDA an ${r.actuatorLabel} — Anzeige ONLINE!`,
        'Verbinde SDA am Board mit Spalte 21 (Reihe h).',
        'Sofort leuchtet dein Display mit Live-Daten auf!',
        { kind: 'board', boardPinRole: 'sda' },
        { kind: 'breadboard', col: 21, row: 'h' },
        '#38bdf8',
      ),
    );
  }

  return {
    id: r.id,
    title: r.title,
    difficulty: r.difficulty,
    durationLabel: `${steps.length} Schritte · ~3 Min.`,
    summary: r.summary,
    completionMessage: r.completion,
    steps,
  };
}

// ============================================================================
// 40 NEUE GEFÜHRTE BAUPROJEKTE (+ 10 bestehende = 50 geführte Projekte!)
// ============================================================================
const EXTRA_RECIPES: BuildRecipe[] = [
  { kind: 'sensor-and-actuator', id: 'gp-11', title: 'CO₂-Lüftungsampel (SCD41 + LCD 16×2)', difficulty: 'Smart Home', summary: 'Miss echtes Raum-CO₂ über I²C und zeige die Lüftungsempfehlung direkt auf dem LCD 1602 an!', completion: '🌿 Top! Dein CO₂-Sensor und das LCD 1602 laufen gemeinsam am selben I²C-Bus.', sensorType: 'scd41-co2', sensorLabel: 'SCD41 CO₂-Sensor', sensorIsI2c: true, actuatorType: 'lcd1602-i2c', actuatorLabel: 'LCD 16×2 Display', actuatorKind: 'i2c-display' },
  { kind: 'sensor-and-actuator', id: 'gp-12', title: 'Aquarium-Thermometer (DS18B20 + OLED)', difficulty: 'Grundlagen', summary: 'Verbinde den wasserdichten DS18B20-Fühler mit einem selbstleuchtenden SSD1306-OLED.', completion: '🐟 Klasse! Dein Aquarium-Thermometer zeigt die Wassertemperatur live an.', sensorType: 'ds18b20-probe', sensorLabel: 'DS18B20 Fühler', actuatorType: 'oled', actuatorLabel: 'SSD1306 OLED', actuatorKind: 'i2c-display' },
  { kind: 'sensor-and-actuator', id: 'gp-13', title: 'Automatische Pflanzen-Bewässerung (Feuchte + 5V Pumpe)', difficulty: 'Smart Home', summary: 'Erkenne trockene Blumenerde und starte automatisch die 5-V-Mini-Wasserpumpe!', completion: '🌱 Bewässerung aktiv! Sensor & 5V-Wasserpumpe arbeiten perfekt zusammen.', sensorType: 'soil-moisture', sensorLabel: 'Bodenfeuchte-Sensor', actuatorType: 'water-pump-5v', actuatorLabel: '5V Wasserpumpe', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-14', title: 'Laser-Abstandsmesser (VL53L0X + IPS Farb-TFT)', difficulty: 'Smart Home', summary: 'Millimetergenaue Laser-Time-of-Flight-Messung mit Anzeige auf dem 240×240 IPS Farb-TFT.', completion: '📏 Exakt! Laser-ToF und IPS-Display funken fehlerfrei über I²C.', sensorType: 'vl53l0x-tof', sensorLabel: 'VL53L0X Laser-ToF', sensorIsI2c: true, actuatorType: 'tft-st7789', actuatorLabel: 'IPS Farb-TFT', actuatorKind: 'i2c-display' },
  { kind: 'sensor-and-actuator', id: 'gp-15', title: 'Berührungsloser Gesten-Dimmer (APDS9960 + 4×4 RGB)', difficulty: 'Smart Home', summary: 'Wische mit der Hand über den Gestensensor, um das 16-LED WS2812B-Panel zu steuern!', completion: '✋ Magisch! Dein Gestensensor steuert das 4×4 RGB-Panel berührungslos.', sensorType: 'apds9960-gesture', sensorLabel: 'APDS9960 Gestensensor', sensorIsI2c: true, actuatorType: 'ws2812-matrix-16', actuatorLabel: '4×4 RGB-Panel', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-16', title: 'Feuer- & Kerzen-Alarm (Flammen-Sensor + 100dB Sirene)', difficulty: 'Grundlagen', summary: 'Erkenne offene Flammen per IR-Sensor und löse sofort die 100-dB-Alarmsirene aus!', completion: '🚨 Feueralarm bereit! Flammensensor und Sirene sind sauber verkabelt.', sensorType: 'flame-ir-sensor', sensorLabel: 'Flammen-Sensor', actuatorType: 'active-siren', actuatorLabel: '100dB Alarm-Sirene', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-17', title: 'Geheim-Tresor mit PIN-Pad & Schubriegel', difficulty: 'Smart Home', summary: 'Gib den richtigen Code am 4×4 PIN-Pad ein und ziehe den elektrischen Schubriegel zurück!', completion: '🔒 Tresor scharf! Dein PIN-Pad steuert den Magnet-Schubriegel zuverlässig.', sensorType: 'keypad-4x4', sensorLabel: '4×4 PIN-Pad', actuatorType: 'solenoid-lock', actuatorLabel: 'Schubriegel-Schloss', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-18', title: 'Klatsch-Schalter für Schreibtischlicht (Mikrofon + 3W COB)', difficulty: 'Grundlagen', summary: 'Zweimal klatschen am KY-037 Mikrofon schaltet dein superhelles 3-W-COB-Arbeitslicht ein!', completion: '👏 Licht an! Dein Klatsch-Schalter steuert das 3W-COB-Arbeitslicht.', sensorType: 'sound-mic', sensorLabel: 'KY-037 Mikrofon', actuatorType: 'cob-led-white', actuatorLabel: '3W COB-Licht', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-19', title: 'Herzfrequenz-Monitor (MAX30102 + E-Paper)', difficulty: 'Smart Home', summary: 'Miss deinen Puls & Blutsauerstoff (SpO₂) per I²C und zeige die Werte stromsparend auf E-Ink!', completion: '❤️ Puls-Check online! MAX30102 & E-Paper arbeiten harmonisch zusammen.', sensorType: 'max30102-pulse', sensorLabel: 'MAX30102 Pulssensor', sensorIsI2c: true, actuatorType: 'epaper-29', actuatorLabel: '2,9" E-Paper', actuatorKind: 'i2c-display' },
  { kind: 'sensor-and-actuator', id: 'gp-20', title: 'Digital-Küchenwaage (HX711 + LCD 20×4)', difficulty: 'Smart Home', summary: 'Lies eine 24-Bit-Wägezelle per HX711 aus und zeige Gramm & Tara auf dem großen LCD 2004!', completion: '⚖️ Präzise! Deine 24-Bit-Waage läuft auf dem 4-Zeilen-Display.', sensorType: 'hx711-loadcell', sensorLabel: 'HX711 Waagen-Modul', actuatorType: 'lcd2004-i2c', actuatorLabel: 'LCD 20×4 Display', actuatorKind: 'i2c-display' },
  { kind: 'sensor-and-actuator', id: 'gp-21', title: 'Retro-Steampunk-Uhr (SHT31 + Nixie-Röhre)', difficulty: 'Grundlagen', summary: 'Verbinde den hochgenauen SHT31-Klimasensor mit dem warmorangen Glühen einer Retro-Nixie-Röhre!', completion: '🟠 Wunderschön! Deine Nixie-Röhre glimmt warm (probier „Raum dunkel“!).', sensorType: 'sht31-climate', sensorLabel: 'SHT31 Klimasensor', sensorIsI2c: true, actuatorType: 'nixie-tube', actuatorLabel: 'Retro Nixie-Röhre', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-22', title: 'Kaffeetassen-Wärmer mit IR-Thermometer (MLX90614 + Heizfolie)', difficulty: 'Smart Home', summary: 'Miss berührungslos die Tassen-Temperatur und schalte bei < 55 °C automatisch die 5V-Heizfolie ein!', completion: '☕ Nie wieder kalter Kaffee! IR-Sensor und Heizfolie arbeiten live.', sensorType: 'mlx90614-ir', sensorLabel: 'MLX90614 IR-Temp', sensorIsI2c: true, actuatorType: 'heating-pad-5v', actuatorLabel: '5V Heizfolie', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-23', title: 'Mini-Getränkekühler (NTC + Peltier-Element)', difficulty: 'Grundlagen', summary: 'Überwache die Temperatur mit einem NTC-Fühler und kühle per TEC1-Peltier-Kühlelement herunter.', completion: '❄️ Eisgekühlt! Dein NTC-Sensor steuert das Peltier-Element.', sensorType: 'ntc-thermistor', sensorLabel: 'NTC 10 kΩ Fühler', actuatorType: 'peltier-tec1', actuatorLabel: 'Peltier-Kühler', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-24', title: 'Terrarium-Nebelautomatik (DHT22 + Ultraschall-Nebler)', difficulty: 'Smart Home', summary: 'Sinkt die Luftfeuchte im Terrarium, erzeugt der 113-kHz-Nebelzerstäuber sofort feinen kühlen Nebel!', completion: '🌫️ Tropenklima perfekt! DHT22 & Ultraschall-Nebler sind online.', sensorType: 'dht22', sensorLabel: 'DHT22 Klimasensor', actuatorType: 'mist-maker-piezo', actuatorLabel: 'Nebel-Modul', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-25', title: 'Solar-Leistungsmesser (INA219 + Analoges Zeiger-Meter)', difficulty: 'Grundlagen', summary: 'Miss Strom & Watt deiner Solarzelle per INA219 und lass ein echtes Retro-Zeigerinstrument ausschlagen!', completion: '⚡ Retro trifft Digital! INA219 & analoges VU-Zeiger-Meter laufen.', sensorType: 'ina219-current', sensorLabel: 'INA219 Strommesser', sensorIsI2c: true, actuatorType: 'analog-vu-meter', actuatorLabel: 'Zeiger-Meter', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-26', title: 'M&M-Farbsortierer (TCS34725 + MG996R Kraftservo)', difficulty: 'Smart Home', summary: 'Erkenne die Farbe jedes Bonbons per I²C-Farbsensor und schwenke die Rutsche per Metallservo!', completion: '🎨 Sortiermaschine bereit! Farbsensor & Kraftservo arbeiten zusammen.', sensorType: 'tcs34725-color', sensorLabel: 'TCS34725 Farbsensor', sensorIsI2c: true, actuatorType: 'servo-mg996r', actuatorLabel: 'MG996R Kraftservo', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-27', title: 'Musik-VU-Meter (Mikrofon + 10-LED Pegelanzeige)', difficulty: 'Einstieg', summary: 'Lass 10 bunte LED-Balken im Takt deiner Lieblingsmusik tanzen!', completion: '📊 Party-Modus! Mikrofon und 10-Segment-Pegelanzeige sind aktiv.', sensorType: 'sound-mic', sensorLabel: 'KY-037 Mikrofon', actuatorType: 'led-bargraph-10', actuatorLabel: '10-LED Pegel', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-28', title: 'TV-Fernbedienungs-Relais (IR-Empfänger + 4× Relais)', difficulty: 'Smart Home', summary: 'Nutze eine alte Fernbedienung, um 4 Geräte bequem vom Sofa aus per Relais zu schalten!', completion: '📺 Bequem! IR-Empfänger & 4-Kanal-Relaisboard reagieren sauber.', sensorType: 'ir-recv-1838', sensorLabel: 'IR-Empfänger 38kHz', actuatorType: 'relay-4ch', actuatorLabel: '4× Relais-Board', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-29', title: 'Geheim-Klopf-Schloss (Piezo-Klopfsensor + Schubriegel)', difficulty: 'Smart Home', summary: 'Nur wer den geheimen Klopf-Rhythmus an die Tür klopft, öffnet den versteckten Schubriegel!', completion: '🥁 Klopf-klopf! Dein Geheim-Klopf-Schloss ist einsatzbereit.', sensorType: 'piezo-knock', sensorLabel: 'Klopfsensor', actuatorType: 'solenoid-lock', actuatorLabel: 'Schubriegel', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-30', title: 'Fahrrad-Diebstahl-Alarm (SW-420 + 100dB Sirene)', difficulty: 'Grundlagen', summary: 'Sobald jemand dein Rad anfasst, erkennt SW-420 die Erschütterung und startet die laute Sirene!', completion: '🚲 Sicher abgestellt! Erschütterungssensor & Sirene sind scharf.', sensorType: 'sw420-vibration', sensorLabel: 'SW-420 Vibro-Sensor', actuatorType: 'active-siren', actuatorLabel: '100dB Sirene', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-31', title: 'Smarte Fenster-Erinnerung (Reed-Kontakt + 8×8 Matrix)', difficulty: 'Smart Home', summary: 'Zeige ein fettes „ZU!“-Icon auf der 8×8 LED-Matrix, wenn noch ein Fenster offen steht!', completion: '🪟 Nie wieder Heizkosten verschwenden! Reed-Kontakt & Matrix laufen.', sensorType: 'reed-door', sensorLabel: 'Reed-Fensterkontakt', actuatorType: 'max7219-matrix', actuatorLabel: '8×8 LED-Matrix', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-32', title: 'Sitz-Erkennungs-Wecker (FSR-Druckpad + Vibro-Motor)', difficulty: 'Grundlagen', summary: 'Das Druckpad auf dem Stuhl merkt nach 60 Minuten Sitzen und erinnert per Vibration ans Aufstehen!', completion: '🪑 Gesund gearbeitet! FSR-Druckpad und Vibrations-Motor sind aktiv.', sensorType: 'fsr402-pressure', sensorLabel: 'FSR-402 Druckpad', actuatorType: 'vib-motor', actuatorLabel: 'Vibro-Motor', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-33', title: 'Power-Glove Roboter-Steuerung (Flex-Sensor + Servo)', difficulty: 'Grundlagen', summary: 'Beuge deinen Finger im Flex-Sensor — der SG90-Servo imitiert exakt deine Fingerbewegung!', completion: '🦾 Cyborg-Style! Flex-Biegesensor und Servo sind perfekt gekoppelt.', sensorType: 'flex-bend', sensorLabel: 'Flex-Biegesensor', actuatorType: 'servo', actuatorLabel: 'SG90 Servo', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-34', title: 'Joystick-Kransteuerung (Joystick + NEMA 17 Stepper)', difficulty: 'Smart Home', summary: 'Bewege den 2-Achsen-Joystick, um einen kraftvollen NEMA-17-Schrittmotor präzise zu positionieren!', completion: '🕹️ Präzisions-Antrieb! Joystick & NEMA 17 Schrittmotor drehen live.', sensorType: 'joystick-2axis', sensorLabel: '2-Achsen-Joystick', actuatorType: 'nema17-stepper', actuatorLabel: 'NEMA 17 Stepper', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-35', title: 'CNC-Drehregler-Konsole (EC11 Encoder + TM1637 Uhr)', difficulty: 'Grundlagen', summary: 'Stelle per rastendem Drehgeber Countdown-Minuten ein und zeige sie auf der 4-stelligen TM1637-Anzeige!', completion: '⏰ Exakt einstellbar! Drehgeber EC11 & TM1637 Display sind aktiv.', sensorType: 'rotary-ec11', sensorLabel: 'EC11 Drehgeber', actuatorType: 'tm1637-4digit', actuatorLabel: 'TM1637 4-Digit', actuatorKind: 'i2c-display' },
  { kind: 'sensor-and-actuator', id: 'gp-36', title: 'Auto-Markise bei Regen (Regen-Sensor + Linearaktor)', difficulty: 'Smart Home', summary: 'Bei den ersten Regentropfen fährt der elektrische Hubzylinder dein Balkondach automatisch aus!', completion: '🌧️ Trockener Balkon! Regensensor und Linearaktor sind verbunden.', sensorType: 'rain-sensor', sensorLabel: 'Regen-Sensor', actuatorType: 'linear-actuator', actuatorLabel: 'Linearaktor', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-37', title: 'UV-Sonnenbrand-Warner (VEML6075 + Signalturm)', difficulty: 'Grundlagen', summary: 'Misst die aktuelle UV-Strahlung im Garten und warnt über den Industrie-Signalturm ab UV-Index 6!', completion: '🕶️ Sicher in der Sonne! UV-Sensor & Signalturm sind online.', sensorType: 'veml6075-uv', sensorLabel: 'VEML6075 UV-Sensor', sensorIsI2c: true, actuatorType: 'led-tower-signal', actuatorLabel: 'Signalturm', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-38', title: 'Smart-Rollladen nach Helligkeit (BH1750 + 28BYJ-48)', difficulty: 'Smart Home', summary: 'Erkennt morgens die Sonne per digitalem Lux-Sensor und zieht per Getriebe-Schrittmotor das Rollo hoch!', completion: '☀️ Guten Morgen! BH1750 Lux-Sensor und 28BYJ-48 Stepper laufen.', sensorType: 'bh1750-lux', sensorLabel: 'BH1750 Lux-Sensor', sensorIsI2c: true, actuatorType: 'stepper-28byj48', actuatorLabel: '28BYJ-48 Stepper', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-39', title: 'Cocktail-Dosier-Maschine (Touch-Pad + Peristaltik-Pumpe)', difficulty: 'Smart Home', summary: 'Ein Tipp aufs kapazitive Touch-Pad dosiert per Schlauchpumpe exakt 40 ml Sirup ins Glas!', completion: '🍹 Prost! Touch-Pad und Peristaltik-Dosierpumpe sind einsatzbereit.', sensorType: 'touch-ttp223', sensorLabel: 'TTP223 Touch-Pad', actuatorType: 'peristaltic-pump', actuatorLabel: 'Dosierpumpe', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-40', title: 'Aquarium-Sprudler nach Wasserqualität (TDS + Luftpumpe)', difficulty: 'Smart Home', summary: 'Überwacht den TDS-Wert des Wassers und schaltet bei Bedarf automatisch den Sauerstoff-Sprudler zu!', completion: '🫧 Frisches Wasser! TDS-Sonde und 5V-Luftpumpe arbeiten zusammen.', sensorType: 'tds-water-quality', sensorLabel: 'TDS Wasser-Sonde', actuatorType: 'air-pump-5v', actuatorLabel: '5V Luftpumpe', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-41', title: 'Hydroponik pH-Wächter (pH-Sonde + Magnetventil)', difficulty: 'Smart Home', summary: 'Überwacht den pH-Wert deiner Nährlösung und öffnet bei Bedarf kurz das Magnetventil.', completion: '🧪 Perfekter pH-Wert! pH-Sensor und Magnetventil sind gekoppelt.', sensorType: 'ph-water-probe', sensorLabel: 'pH-Sensor', actuatorType: 'solenoid-valve', actuatorLabel: 'Magnetventil', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-42', title: 'Keller-Hochwasser-Warnung (Wasserstand + 433MHz Funk)', difficulty: 'Smart Home', summary: 'Erkennt Wasser am Kellerboden und schickt sofort ein 433-MHz-Funksignal an die Warn-Steckdose im Wohnzimmer!', completion: '🌊 Rechtzeitig gewarnt! Wasserstand & 433-MHz-Sender funken.', sensorType: 'water-level-float', sensorLabel: 'Wasserstand-Sensor', actuatorType: 'rf433-tx', actuatorLabel: '433MHz Sender', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-43', title: 'Waschmaschinen-Fertig-Melder (SCT-013 + DFPlayer MP3)', difficulty: 'Smart Home', summary: 'Misst berührungslos den Strom der Waschmaschine — fällt er auf 0 W, spielt DFPlayer eine Fanfare ab!', completion: '🎵 Wäsche fertig! Stromzange & DFPlayer MP3-Modul sind aktiv.', sensorType: 'sct013-clamp', sensorLabel: 'SCT-013 Stromzange', actuatorType: 'dfplayer-mp3', actuatorLabel: 'DFPlayer MP3', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-44', title: 'Wärmebild-Kameradetektor (AMG8833 + Stroboskop)', difficulty: 'Smart Home', summary: 'Die 8×8 Infrarot-Wärmebildkamera entdeckt nächtliche Besucher und blitzt per Stroboskop auf!', completion: '⚡ Wärmebild-Alarm scharf! AMG8833 und Stroboskop-Blitz laufen.', sensorType: 'amg8833-thermal', sensorLabel: 'AMG8833 Wärmebild', sensorIsI2c: true, actuatorType: 'strobe-flash', actuatorLabel: 'Strobo-Blitz', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-45', title: 'Smoker- & Grill-Alarm (Typ-K 1000°C + Lautsprecher)', difficulty: 'Grundlagen', summary: 'Überwacht Grill- oder Pizzaofen-Temperaturen bis 1000 °C und meldet die perfekte Kerntemperatur über den 3W-Speaker!', completion: '🔥 Perfektes BBQ! Typ-K-Fühler & 3W-Speaker sind einsatzbereit.', sensorType: 'max31855-thermo', sensorLabel: 'Typ-K 1000°C Fühler', actuatorType: 'speaker-3w', actuatorLabel: '3W Speaker', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-46', title: 'Wetterballon-Höhenmesser (BMP390 + LoRa 868MHz)', difficulty: 'Smart Home', summary: 'Misst Luftdruck & Flughöhe auf Zentimeter genau und funkt die Telemetrie per LoRa kilometerweit!', completion: '🎈 Ready for Takeoff! BMP390 & LoRa 868 MHz senden Telemetrie.', sensorType: 'bmp390-baro', sensorLabel: 'BMP390 Barometer', sensorIsI2c: true, actuatorType: 'lora-sx1278', actuatorLabel: 'LoRa 868MHz', actuatorKind: 'i2c-display' },
  { kind: 'sensor-and-actuator', id: 'gp-47', title: 'Linienfolger-Mini-Roboter (TCRT5000 + L298N H-Brücke)', difficulty: 'Grundlagen', summary: 'Der IR-Sensor verfolgt eine schwarze Klebeband-Linie und lenkt über die L298N-H-Brücke die Motoren!', completion: '🤖 Spurtreu! TCRT5000 Linienfolger & L298N Motortreiber sind aktiv.', sensorType: 'tcrt5000-line', sensorLabel: 'TCRT5000 Sensor', actuatorType: 'l298n-hbridge', actuatorLabel: 'L298N H-Brücke', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-48', title: 'Magnet-Greifer-Kran (AS5600 Winkel + Elektromagnet)', difficulty: 'Grundlagen', summary: 'Prüft die Kranarm-Stellung per 360°-Magnetsensor und schaltet den 2,5-kg-Elektromagneten gezielt ein!', completion: '🧲 Schwergut-Kran bereit! AS5600 Winkelsensor & Elektromagnet laufen.', sensorType: 'as5600-angle', sensorLabel: 'AS5600 Winkelsensor', sensorIsI2c: true, actuatorType: 'electromagnet-5v', actuatorLabel: 'Elektromagnet 5V', actuatorKind: 'two-pin' },
  { kind: 'sensor-and-actuator', id: 'gp-49', title: 'Lautloser Smart-Heizungsregler (SGP40 + SSR Relais)', difficulty: 'Smart Home', summary: 'Schaltet über das verschleißfreie Solid-State-Relais komplett geräuschlos ohne lautes Klicken!', completion: '🤫 Flüsterleise! SGP40 & Solid-State-Relais arbeiten zusammen.', sensorType: 'sgp40-voc', sensorLabel: 'SGP40 Luftgüte', sensorIsI2c: true, actuatorType: 'ssr-solidstate', actuatorLabel: 'SSR Relais', actuatorKind: 'pwm3' },
  { kind: 'sensor-and-actuator', id: 'gp-50', title: 'Indoor-Kräutergarten (Bodenfeuchte + Grow-LED)', difficulty: 'Smart Home', summary: 'Überwacht deine Küchenkräuter und beleuchtet sie automatisch mit Vollspektrum-Pflanzenlicht!', completion: '🌿 Grüner Daumen! Bodenfeuchte-Sensor & Grow-LED strahlen live.', sensorType: 'soil-moisture', sensorLabel: 'Bodenfeuchte-Sensor', actuatorType: 'led-grow-plant', actuatorLabel: 'Pflanzen-Grow-LED', actuatorKind: 'two-pin' },
];

export const EXPANDED_GUIDED_PROJECTS: GuidedProject[] = EXTRA_RECIPES.map(buildGuidedFromRecipe);
