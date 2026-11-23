import type { EspBoardId } from '../engine/types';
import type { FunnyIdea, FunnyPlatform } from './FunnyIdeas';
import type { PlacedPart, PlacedWire, SandboxPartType, SandboxState } from './SandboxTypes';

interface FunnySeed {
  id: string;
  emoji: string;
  title: string;
  platform: FunnyPlatform;
  board: EspBoardId;
  difficulty: FunnyIdea['difficulty'];
  gagRating: number;
  tagline: string;
  howItWorks: string;
  partsList: string[];
  bonusUpgrade: string;
  sensor: SandboxPartType;
  sensorIsI2c?: boolean;
  actuator: SandboxPartType;
  actuatorKind: 'two-pin' | 'pwm3' | 'i2c-display';
}

function buildQuickPrototype(
  id: string,
  sensor: SandboxPartType,
  sensorIsI2c: boolean | undefined,
  actuator: SandboxPartType,
  actuatorKind: 'two-pin' | 'pwm3' | 'i2c-display',
): SandboxState {
  const parts: PlacedPart[] = [
    { id: `${id}-s`, type: sensor, col: 6, row: sensorIsI2c ? 'f' : 'g' },
    { id: `${id}-a`, type: actuator, col: 18, row: actuatorKind === 'i2c-display' ? 'f' : 'g' },
  ];

  const wires: PlacedWire[] = [
    { id: `${id}-rv`, from: { kind: 'board', boardPinRole: '3V3' }, to: { kind: 'breadboard', col: 2, row: '+top' }, colorHex: '#ef4444' },
    { id: `${id}-rg`, from: { kind: 'board', boardPinRole: 'GND' }, to: { kind: 'breadboard', col: 3, row: '-top' }, colorHex: '#1e293b' },
    { id: `${id}-sv`, from: { kind: 'breadboard', col: 6, row: 'j' }, to: { kind: 'breadboard', col: 6, row: '+top' }, colorHex: '#ef4444' },
    { id: `${id}-sg`, from: { kind: 'breadboard', col: sensorIsI2c ? 7 : 8, row: 'j' }, to: { kind: 'breadboard', col: sensorIsI2c ? 7 : 8, row: '-top' }, colorHex: '#1e293b' },
  ];

  if (sensorIsI2c) {
    wires.push(
      { id: `${id}-sscl`, from: { kind: 'board', boardPinRole: 'scl' }, to: { kind: 'breadboard', col: 8, row: 'i' }, colorHex: '#facc15' },
      { id: `${id}-ssda`, from: { kind: 'board', boardPinRole: 'sda' }, to: { kind: 'breadboard', col: 9, row: 'h' }, colorHex: '#38bdf8' },
    );
  } else {
    wires.push({
      id: `${id}-ssig`,
      from: { kind: 'breadboard', col: 7, row: 'i' },
      to: { kind: 'board', boardPinRole: 'inputA' },
      colorHex: '#22c55e',
    });
  }

  if (actuatorKind === 'two-pin') {
    wires.push(
      { id: `${id}-as`, from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 18, row: 'f' }, colorHex: '#f97316' },
      { id: `${id}-ag`, from: { kind: 'breadboard', col: 20, row: 'j' }, to: { kind: 'breadboard', col: 20, row: '-top' }, colorHex: '#1e293b' },
    );
  } else if (actuatorKind === 'pwm3') {
    wires.push(
      { id: `${id}-as`, from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 18, row: 'f' }, colorHex: '#f97316' },
      { id: `${id}-av`, from: { kind: 'breadboard', col: 19, row: 'j' }, to: { kind: 'breadboard', col: 19, row: '+top' }, colorHex: '#ef4444' },
      { id: `${id}-ag`, from: { kind: 'breadboard', col: 20, row: 'j' }, to: { kind: 'breadboard', col: 20, row: '-top' }, colorHex: '#1e293b' },
    );
  } else {
    wires.push(
      { id: `${id}-dg`, from: { kind: 'breadboard', col: 18, row: 'j' }, to: { kind: 'breadboard', col: 18, row: '-top' }, colorHex: '#1e293b' },
      { id: `${id}-dv`, from: { kind: 'breadboard', col: 19, row: 'j' }, to: { kind: 'breadboard', col: 19, row: '+top' }, colorHex: '#ef4444' },
      { id: `${id}-dscl`, from: { kind: 'board', boardPinRole: 'scl' }, to: { kind: 'breadboard', col: 20, row: 'i' }, colorHex: '#facc15' },
      { id: `${id}-dsda`, from: { kind: 'board', boardPinRole: 'sda' }, to: { kind: 'breadboard', col: 21, row: 'h' }, colorHex: '#38bdf8' },
    );
  }

  return {
    parts,
    wires,
    gpioHigh: true,
    buttonPressed: false,
    lightPercent: 60,
    servoAngleDeg: 135,
    radarPresent: true,
    sensorTriggered: true,
    switchClosed: true,
  };
}

// ============================================================================
// 40 NEUE FUNNY IDEEN FÜR ESP32, RASPBERRY PI & ARDUINO (+ 12 = 52 gesamt!)
// ============================================================================
const EXTRA_FUNNY_SEEDS: FunnySeed[] = [
  { id: 'fun-13', emoji: '🧀', title: 'Käse-Dieb-Wägezelle im WG-Kühlschrank', platform: 'esp32', board: 'esp32-c3-supermini', difficulty: 'Mittel', gagRating: 5, tagline: 'Bemerkt, wenn genau 2 Scheiben Gouda fehlen — und schlägt WG-Sirene!', howItWorks: 'Der Käse liegt auf einer 24-Bit-HX711-Waage. Sinkt das Gewicht um mehr als 30 g, heult die 100-dB-Sirene los!', partsList: ['ESP32-C3 SuperMini', 'HX711 Waage', '100dB Alarm-Sirene'], bonusUpgrade: 'Schickt dem mutmaßlichen Mitbewohner eine Rechnung über 0,49 € per Telegram.', sensor: 'hx711-loadcell', actuator: 'active-siren', actuatorKind: 'two-pin' },
  { id: 'fun-14', emoji: '🍺', title: 'USB-Bierkühler mit Kalt-Garantie', platform: 'arduino', board: 'arduino-uno-r4', difficulty: 'Mittel', gagRating: 5, tagline: 'Hält dein Getränk per Peltier-Kühler exakt auf 4,5 °C — kein warmes Feierabendbier mehr!', howItWorks: 'Ein IR-Thermometer (MLX90614) prüft die Flaschentemperatur und regelt das Peltier-Kühlelement automatisch.', partsList: ['Arduino UNO R4', 'MLX90614 IR-Temp', 'Peltier-Kühler'], bonusUpgrade: 'LED-Ring wechselt von Rot (warm) auf Eisblau (perfekt gekühlt!).', sensor: 'mlx90614-ir', sensorIsI2c: true, actuator: 'peltier-tec1', actuatorKind: 'two-pin' },
  { id: 'fun-15', emoji: '🖱️', title: 'Arduino Pro Micro: Der „Ich-bin-online“-Maus-Wackler', platform: 'arduino', board: 'arduino-micro', difficulty: 'Einfach', gagRating: 5, tagline: 'Wackelt alle 3 Minuten unauffällig 2 Pixel an der Maus — Teams bleibt immer auf Grün!', howItWorks: 'Der ATmega32U4 meldet sich als echte USB-Maus an und bewegt den Zeiger sanft, sobald ein Touch-Pad aktiviert wird.', partsList: ['Arduino Pro Micro', 'TTP223 Touch-Pad', 'Status-LED'], bonusUpgrade: 'Per 4×4 PIN-Pad verschiedene Pausenlängen einstellen.', sensor: 'touch-ttp223', actuator: 'led-mini-3mm-g', actuatorKind: 'two-pin' },
  { id: 'fun-16', emoji: '🐶', title: 'Hunde-Türklingel („Ich muss mal raus!“)', platform: 'esp32', board: 'esp32-d1-mini', difficulty: 'Einfach', gagRating: 5, tagline: 'Dein Hund tippt mit der Pfote aufs Druckpad → MP3 ruft: „GASSI-ZEIT!!“', howItWorks: 'Ein robustes FSR-402 Druckpad an der Haustür triggert den DFPlayer MP3-Lautsprecher mit fröhlichem Gebell.', partsList: ['ESP32 D1 Mini', 'FSR-402 Druckpad', 'DFPlayer MP3'], bonusUpgrade: 'Sperrzeit von 5 Minuten, sonst drückt der Hund aus Spaß 40 Mal.', sensor: 'fsr402-pressure', actuator: 'dfplayer-mp3', actuatorKind: 'pwm3' },
  { id: 'fun-17', emoji: '🎮', title: 'Rage-Quit-Schreibtisch-Detektor', platform: 'raspberry-pi', board: 'rpi-4b', difficulty: 'Mittel', gagRating: 5, tagline: 'Haut jemand beim Zocken auf den Tisch, startet der Pi beruhigende Walgesänge & Nebel!', howItWorks: 'Der SW-420 Erschütterungssensor spürt den Tisch-Schlag und aktiviert sofort den Ultraschall-Nebelzerstäuber für Zen-Stimmung.', partsList: ['Raspberry Pi 4B', 'SW-420 Vibro-Sensor', 'Nebel-Modul'], bonusUpgrade: 'Fügt automatisch 1 € ins digitale Fluch-Sparschwein ein.', sensor: 'sw420-vibration', actuator: 'mist-maker-piezo', actuatorKind: 'two-pin' },
  { id: 'fun-18', emoji: '🎤', title: 'Schief-Sing-Duschen-Bewerter', platform: 'raspberry-pi', board: 'rpi-zero-2w', difficulty: 'Mittel', gagRating: 4, tagline: 'Das Mikrofon bewertet deinen Dusch-Gesang live auf der 10-LED-Pegelanzeige!', howItWorks: 'KY-037 misst Lautstärke & Ausdauer und lässt die 10-Segment-LED-Skala von „Naja“ bis „Superstar“ aufleuchten.', partsList: ['Raspberry Pi Zero 2 W', 'KY-037 Mikrofon', '10-LED Pegel'], bonusUpgrade: 'Spielt am Ende automatischen Stadion-Applaus ab!', sensor: 'sound-mic', actuator: 'led-bargraph-10', actuatorKind: 'two-pin' },
  { id: 'fun-19', emoji: '🚪', title: 'Geheim-Klopf-Büro-Türsteher', platform: 'arduino', board: 'arduino-nano', difficulty: 'Mittel', gagRating: 5, tagline: 'Nur wer die Star-Wars-Melodie an die Tür klopft, darf rein — sonst bleibt der Riegel zu!', howItWorks: 'Der Piezo-Klopfsensor misst die Pausen zwischen den Schlägen. Bei Übereinstimmung zieht der Arduino Nano den Schubriegel auf.', partsList: ['Arduino Nano', 'Klopfsensor', 'Schubriegel'], bonusUpgrade: 'Bei falschem Klopfen spielt ein Buzzer den „Sad Trombone“-Sound!', sensor: 'piezo-knock', actuator: 'solenoid-lock', actuatorKind: 'pwm3' },
  { id: 'fun-20', emoji: '🍬', title: 'M&M-Farbsortierer (Nur die Blauen!)', platform: 'arduino', board: 'arduino-mega-2560', difficulty: 'Bastler-Boss', gagRating: 5, tagline: 'Sortiert automatisch Schokolinsen nach Farbe — die roten kommen in die Spezial-Schale!', howItWorks: 'Der TCS34725 RGB-Farbsensor misst jede Linse und der MG996R-Servo lenkt sie in die passende Rinne.', partsList: ['Arduino Mega 2560', 'TCS34725 Farbsensor', 'MG996R Kraftservo'], bonusUpgrade: 'Zeigt die Farb-Statistik live auf dem IPS Farb-TFT.', sensor: 'tcs34725-color', sensorIsI2c: true, actuator: 'servo-mg996r', actuatorKind: 'pwm3' },
  { id: 'fun-21', emoji: '👻', title: 'Halloween-Nebel- & Blitz-Erschrecker', platform: 'esp32', board: 'esp32-devkit-v1', difficulty: 'Einfach', gagRating: 5, tagline: 'Kommt jemand an die Haustür, zischt Nebel los und das Stroboskop blitzt wie im Gruselfilm!', howItWorks: 'Der PIR-Bewegungsmelder erkennt Süßes-oder-Saures-Besucher und feuert Stroboskop-Blitze + Nebel ab.', partsList: ['ESP32 DevKit V1', 'PIR Melder', 'Strobo-Blitz'], bonusUpgrade: 'Zusätzlich lässt ein Servo eine Gummispinne herabfallen!', sensor: 'pir-hc501', actuator: 'strobe-flash', actuatorKind: 'two-pin' },
  { id: 'fun-22', emoji: '🥤', title: 'Soda- & Cocktail-Roboter „Barkeeper Pi“', platform: 'raspberry-pi', board: 'rpi-5', difficulty: 'Bastler-Boss', gagRating: 5, tagline: 'Mischt dir auf Fingerabdruck deinen Lieblings-Drink millilitergenau per Schlauchpumpe!', howItWorks: 'Der R503 Fingerabdruck-Scanner erkennt, wer davor steht, und die Peristaltik-Pumpe dosiert das Wunschrezept.', partsList: ['Raspberry Pi 5', 'Fingerprint R503', 'Dosierpumpe'], bonusUpgrade: 'Weboberfläche am Handy zum Bestellen vom Sofa aus!', sensor: 'r503-fingerprint', actuator: 'peristaltic-pump', actuatorKind: 'two-pin' },
  { id: 'fun-23', emoji: '📺', title: 'TV-Lautstärke-Polizei für Werbeblöcke', platform: 'esp32', board: 'esp32-c6-devkit', difficulty: 'Mittel', gagRating: 5, tagline: 'Wird die Fernsehwerbung plötzlich zu laut, dreht der IR-Blaster deinen TV heimlich leiser!', howItWorks: 'Das Mikrofon erkennt plötzliche Lautstärkesprünge und der 940-nm-IR-Blaster sendet sofort 4× „Volume Down“!', partsList: ['ESP32-C6 DevKit', 'KY-037 Mikrofon', 'IR-Blaster'], bonusUpgrade: 'Funktioniert auch gegen zu laute Fußball-Kommentatoren.', sensor: 'sound-mic', actuator: 'ir-blaster-led', actuatorKind: 'two-pin' },
  { id: 'fun-24', emoji: '🚗', title: 'Kofferraum-Einkaufs-Laser-Parkhilfe', platform: 'arduino', board: 'arduino-nano', difficulty: 'Einfach', gagRating: 4, tagline: 'Projiziert einen roten Kreuz-Laser exakt auf deine Motorhaube, wenn du perfekt in der Garage stehst!', howItWorks: 'Der VL53L0X Laser-Abstandssensor misst den Abstand zur Wand und schaltet bei exakt 40 cm den Kreuz-Laser ein.', partsList: ['Arduino Nano', 'VL53L0X Laser-ToF', 'Kreuz-Laser'], bonusUpgrade: 'Bei < 15 cm blitzt ein Stroboskop als Not-Stopp!', sensor: 'vl53l0x-tof', sensorIsI2c: true, actuator: 'led-laser-cross', actuatorKind: 'two-pin' },
  { id: 'fun-25', emoji: '🧦', title: 'Büro-Müffel- & Socken-CO₂-Ampel', platform: 'esp32', board: 'esp32-s3-devkitc', difficulty: 'Einfach', gagRating: 5, tagline: 'Zeigt ab 1500 ppm CO₂ auf dem LCD: „BITTE FENSTER AUF, GEHIRNE SCHMELZEN!“', howItWorks: 'Der echte SCD41 CO₂-Sensor überwacht das Meeting-Zimmer und schreibt witzige Warnungen aufs LCD 16×2.', partsList: ['ESP32-S3 DevKitC', 'SCD41 CO₂', 'LCD 16×2 I²C'], bonusUpgrade: 'Schaltet bei 2000 ppm automatisch den 5V-Lüfter auf Turbo.', sensor: 'scd41-co2', sensorIsI2c: true, actuator: 'lcd1602-i2c', actuatorKind: 'i2c-display' },
  { id: 'fun-26', emoji: '🍕', title: 'Pizzaofen-Perfektions-Schreihals (450 °C)', platform: 'arduino', board: 'arduino-uno-r4', difficulty: 'Mittel', gagRating: 4, tagline: 'Misst bis 1000 °C im Steinofen und ruft per 3W-Lautsprecher: „PIZZA RAUS, SONST KOHLE!“', howItWorks: 'Das Typ-K Thermoelement hält extreme Ofenhitze aus und meldet am Arduino UNO R4 nach 90 Sekunden Backzeit.', partsList: ['Arduino UNO R4', 'Typ-K 1000°C', '3W Speaker'], bonusUpgrade: 'Zählt per 4-Digit-TM1637 den 90-Sekunden-Neapel-Countdown runter!', sensor: 'max31855-thermo', actuator: 'speaker-3w', actuatorKind: 'two-pin' },
  { id: 'fun-27', emoji: '🛸', title: 'Jedi-Wisch-Lichtschalter ohne Anfassen', platform: 'esp32', board: 'esp32-s3-zero', difficulty: 'Einfach', gagRating: 5, tagline: 'Ein lässiger Handwisch in der Luft — und das Zimmerlicht geht an wie mit der Macht!', howItWorks: 'Der APDS-9960 Gestensensor erkennt Hoch/Runter/Links/Rechts und schaltet das lautlose SSR-Relais.', partsList: ['ESP32-S3-Zero', 'APDS9960 Gesten', 'SSR Relais'], bonusUpgrade: 'Bei Links-Wisch direkt das Lichtschwert-Geräusch über DFPlayer abspielen!', sensor: 'apds9960-gesture', sensorIsI2c: true, actuator: 'ssr-solidstate', actuatorKind: 'pwm3' },
  { id: 'fun-28', emoji: '💍', title: 'Schwebender Zauber-Kugelschreiber', platform: 'arduino', board: 'arduino-nano', difficulty: 'Bastler-Boss', gagRating: 5, tagline: 'Ein Hall-Sensor regelt den Elektromagneten 1000× pro Sekunde → Metall schwebt frei in der Luft!', howItWorks: 'Der Hall-Sensor misst den Abstand des schwebenden Magneten und taktet den 5V-Elektromagneten blitzschnell nach.', partsList: ['Arduino Nano', 'Hall-Sensor', 'Elektromagnet 5V'], bonusUpgrade: 'Mit UV-LED von unten beleuchten für den totalen Sci-Fi-Effekt!', sensor: 'hall-sensor', actuator: 'electromagnet-5v', actuatorKind: 'two-pin' },
  { id: 'fun-29', emoji: '⏱️', title: 'Meeting-Geldverbrennungs-Zähler (Nixie)', platform: 'raspberry-pi', board: 'rpi-pico-2w', difficulty: 'Mittel', gagRating: 5, tagline: 'Zählt auf glühenden Nixie-Röhren live mit, wie viele Euro das endlose Meeting gerade kostet!', howItWorks: 'Dreh am EC11-Encoder die Teilnehmerzahl ein — die Retro-Nixie-Röhren zählen unbarmherzig jeden Euro hoch.', partsList: ['Raspberry Pi Pico 2 W', 'EC11 Drehgeber', 'Nixie-Röhre'], bonusUpgrade: 'Ab 500 € fängt ein roter Signalturm an zu blinken!', sensor: 'rotary-ec11', actuator: 'nixie-tube', actuatorKind: 'two-pin' },
  { id: 'fun-30', emoji: '🧊', title: 'Kaffeetassen-Heiz-Thron mit Temperatur-Anzeige', platform: 'esp32', board: 'esp32-devkit-v1', difficulty: 'Einfach', gagRating: 4, tagline: 'Hält deinen Tee/Kaffee per Heizfolie exakt auf 58 °C und zeigt „TRINKBEREIT“ auf dem IPS-TFT!', howItWorks: 'Das FSR-Druckpad merkt, sobald die Tasse steht, und schaltet sanft die 5-V-Silikon-Heizfolie ein.', partsList: ['ESP32 DevKit V1', 'FSR-402 Druckpad', '5V Heizfolie'], bonusUpgrade: 'Schaltet sich nach 45 Minuten automatisch sicher aus.', sensor: 'fsr402-pressure', actuator: 'heating-pad-5v', actuatorKind: 'two-pin' },
  { id: 'fun-31', emoji: '🕵️‍♂️', title: 'Wärmebild-Geisterjäger-Scanner (Handgerät)', platform: 'raspberry-pi', board: 'rpi-zero-2w', difficulty: 'Bastler-Boss', gagRating: 5, tagline: 'Macht warme Fußspuren, versteckte Rohre & Haustiere im Dunkeln auf dem IPS-Farb-TFT sichtbar!', howItWorks: 'Die 8×8 AMG8833 Infrarot-Wärmebildkamera liefert 10 Bilder/Sekunde direkt ans farbige ST7789 IPS-Display.', partsList: ['Raspberry Pi Zero 2 W', 'AMG8833 Wärmebild', 'IPS Farb-TFT'], bonusUpgrade: 'Mit 3D-gedrucktem Star-Trek-Tricorder-Gehäuse!', sensor: 'amg8833-thermal', sensorIsI2c: true, actuator: 'tft-st7789', actuatorKind: 'i2c-display' },
  { id: 'fun-32', emoji: '🎸', title: 'Luftgitarren-Handschuh mit Biegesensoren', platform: 'arduino', board: 'arduino-micro', difficulty: 'Mittel', gagRating: 5, tagline: 'Jeder gebeugte Finger im Handschuh spielt echte MIDI-Powerchords über USB!', howItWorks: 'Flex-Biegesensoren an den Fingern melden die Beugung an den Arduino Pro Micro (USB-MIDI) + 3W-Lautsprecher.', partsList: ['Arduino Pro Micro', 'Flex-Biegesensor', '3W Speaker'], bonusUpgrade: 'Mit MPU6050 am Handgelenk für echte Luft-Strumming-Bewegungen!', sensor: 'flex-bend', actuator: 'speaker-3w', actuatorKind: 'two-pin' },
  { id: 'fun-33', emoji: '📬', title: 'Briefkasten-„Du hast Post!“-Funkmelder', platform: 'esp32', board: 'esp32-c3-supermini', difficulty: 'Einfach', gagRating: 4, tagline: 'Sobald die Briefkastenklappe aufgeht, dreht im Wohnzimmer eine kleine Flagge per Servo hoch!', howItWorks: 'Ein stromloser Reed-Magnetkontakt weckt den ESP32 aus dem Tiefschlaf und sendet per LoRa/WLAN das Signal.', partsList: ['ESP32-C3 SuperMini', 'Reed-Kontakt', 'LoRa 868MHz'], bonusUpgrade: 'Zählt per 7-Segment, wie oft heute schon eingeworfen wurde.', sensor: 'reed-door', actuator: 'lora-sx1278', actuatorKind: 'i2c-display' },
  { id: 'fun-34', emoji: '🌞', title: 'Sonnenbrand-Alarm-Hut mit UV-Signalturm', platform: 'arduino', board: 'arduino-nano-esp32', difficulty: 'Einfach', gagRating: 5, tagline: 'Sobald der UV-Index am Strand über 6 steigt, blinkt dein Strand-Signalturm: „EINCREMEN!“', howItWorks: 'Der VEML6075 misst echte UVA/UVB-Strahlung über I²C und lässt den Signalturm bunt warnen.', partsList: ['Arduino Nano ESP32', 'VEML6075 UV', 'Signalturm'], bonusUpgrade: 'Spielt per Piezo die Titelmelodie von Baywatch!', sensor: 'veml6075-uv', sensorIsI2c: true, actuator: 'led-tower-signal', actuatorKind: 'two-pin' },
  { id: 'fun-35', emoji: '🎰', title: 'Büro-Kaffee-Wer-ist-dran-Glücksrad', platform: 'arduino', board: 'arduino-uno-r4', difficulty: 'Einfach', gagRating: 5, tagline: 'Ein Tipp auf den Knopf → der 16× NeoPixel-Ring rotiert und bestimmt den nächsten Kaffee-Kocher!', howItWorks: 'Ein 360°-Endlos-Servo oder 16-LED-Ring dreht mit Zufalls-Abbremsung und stoppt dramatisch bei einem Namen.', partsList: ['Arduino UNO R4', 'TTP223 Touch-Pad', '16× Ring'], bonusUpgrade: 'Zufallsgenerator heimlich so programmieren, dass man selbst nie dran ist 😉', sensor: 'touch-ttp223', actuator: 'led-ring-16', actuatorKind: 'two-pin' },
  { id: 'fun-36', emoji: '🔋', title: 'Analoges Steampunk-CPU-Last-Zeiger-Meter', platform: 'raspberry-pi', board: 'rpi-5', difficulty: 'Mittel', gagRating: 4, tagline: 'Ein echtes Retro-Zeigerinstrument auf dem Schreibtisch schlägt live mit deiner Pi-CPU-Last aus!', howItWorks: 'Python liest jede Sekunde die CPU-Auslastung + INA219-Wattzahl und bewegt per PWM die analoge Nadel.', partsList: ['Raspberry Pi 5', 'INA219 Strommesser', 'Zeiger-Meter'], bonusUpgrade: 'Ab 90 % Last glüht eine rote Retro-LED hinter der Skala!', sensor: 'ina219-current', sensorIsI2c: true, actuator: 'analog-vu-meter', actuatorKind: 'two-pin' },
  { id: 'fun-37', emoji: '🐱‍👓', title: 'Automatischer Katzen-Laser-Bespaßer', platform: 'arduino', board: 'arduino-nano', difficulty: 'Einfach', gagRating: 5, tagline: 'Schwenkt einen sanften Laserpunkt zufällig übers Wohnzimmer — deine Katze wird es lieben!', howItWorks: 'Zwei Servos (Pan/Tilt) bewegen den Laser-Emitter sanft in zufälligen Achten, gesteuert vom PIR-Melder.', partsList: ['Arduino Nano', 'PIR Melder', 'SG90 Servo'], bonusUpgrade: 'Schaltet nach 5 Minuten automatisch ab, damit die Katze Pause bekommt!', sensor: 'pir-hc501', actuator: 'servo', actuatorKind: 'pwm3' },
  { id: 'fun-38', emoji: '🌧️', title: 'Balkon-Wäsche-Rettungs-Sirene', platform: 'esp32', board: 'esp32-d1-mini', difficulty: 'Einfach', gagRating: 4, tagline: 'Erster Regentropfen draußen → drinnen heult sofort der „WÄSCHE REINHOLEN!“-Alarm!', howItWorks: 'Der Regen-Sensor am Wäscheständer meldet jeden Tropfen per 433-MHz-Funk direkt ins Wohnzimmer.', partsList: ['ESP32 D1 Mini', 'Regen-Sensor', '433MHz Sender'], bonusUpgrade: 'Schaltet zusätzlich per WLAN alle Wohnzimmer-Lampen kurz auf Blau.', sensor: 'rain-sensor', actuator: 'rf433-tx', actuatorKind: 'pwm3' },
  { id: 'fun-39', emoji: '🧪', title: 'Lügen-Detektor (Puls-Stress-Test für Partys!)', platform: 'esp32', board: 'esp32-devkit-v1', difficulty: 'Mittel', gagRating: 5, tagline: 'Steigt der Puls bei fiesen Party-Fragen über +15 BPM, zeigt die 8×8-Matrix ein fettes „X“!', howItWorks: 'Der MAX30102 misst den Fingerpuls live über I²C. Bei plötzlichem Herzklopfen blinkt die rote 8×8 LED-Matrix!', partsList: ['ESP32 DevKit V1', 'MAX30102 Pulssensor', '8×8 LED-Matrix'], bonusUpgrade: 'Dazu ein geheimnisvolles Piepsen wie im Film!', sensor: 'max30102-pulse', sensorIsI2c: true, actuator: 'max7219-matrix', actuatorKind: 'pwm3' },
  { id: 'fun-40', emoji: '🎈', title: 'Mini-Aufzug-Höhenansager (Barometer)', platform: 'esp32', board: 'esp32-c3-supermini', difficulty: 'Mittel', gagRating: 4, tagline: 'Erkennt auf 10 cm genau, in welchem Stockwerk du bist — und zeigt es auf E-Paper an!', howItWorks: 'Der BMP390-Luftdrucksensor erkennt schon 1 Meter Höhenunterschied und aktualisiert dein E-Ink-Namensschild.', partsList: ['ESP32-C3 SuperMini', 'BMP390 Barometer', '2,9" E-Paper'], bonusUpgrade: 'Perfekt für Wander-Rucksäcke mit Live-Höhenmeter-Badge!', sensor: 'bmp390-baro', sensorIsI2c: true, actuator: 'epaper-29', actuatorKind: 'i2c-display' },
  { id: 'fun-41', emoji: '🤖', title: 'Schreibtisch-Klau-Alarm für Kugelschreiber', platform: 'arduino', board: 'arduino-nano', difficulty: 'Einfach', gagRating: 5, tagline: 'Hebt ein Kollege deinen Lieblingsstift hoch, startet sofort Polizei-Licht & Sirene!', howItWorks: 'Ein Hall-Sensor unter dem Stifthalter merkt sofort, wenn der magnetische Stift weg ist → Alarm!', partsList: ['Arduino Nano', 'Hall-Sensor', 'Bi-Color R/B'], bonusUpgrade: 'Nur mit deinem geheimen Touch-Pad-Code lässt sich der Alarm entschärfen.', sensor: 'hall-sensor', actuator: 'led-bicolor-rb', actuatorKind: 'two-pin' },
  { id: 'fun-42', emoji: '🌱', title: 'Bonsai-Disko-Wachstums-Station', platform: 'raspberry-pi', board: 'rpi-pico-2w', difficulty: 'Einfach', gagRating: 4, tagline: 'Gießt deinen Schreibtisch-Bonsai automatisch und spendiert ihm lila Grow-LED-Partylicht!', howItWorks: 'Bodenfeuchte-Sensor + BH1750 Lux-Sensor steuern vollautomatisch die Grow-LED und die 5V-Wasserpumpe.', partsList: ['Raspberry Pi Pico 2 W', 'BH1750 Lux', 'Pflanzen-Grow-LED'], bonusUpgrade: 'Jede Woche ein Zeitraffer-Foto vom Wachstum!', sensor: 'bh1750-lux', sensorIsI2c: true, actuator: 'led-grow-plant', actuatorKind: 'two-pin' },
  { id: 'fun-43', emoji: '🧭', title: 'Schatzsucher-Kompass zum nächsten Döner-Laden', platform: 'esp32', board: 'esp32-s3-devkitc', difficulty: 'Bastler-Boss', gagRating: 5, tagline: 'Zeigt per GPS + 9-DOF-Kompass immer per leuchtender LED exakt Richtung Lieblings-Imbiss!', howItWorks: 'BNO055-Kompass + NEO-6M GPS berechnen den Peilwinkel zum Ziel und zünden die passende LED am 24× Ring!', partsList: ['ESP32-S3 DevKitC', 'BNO055 9-DOF', '24× Ring'], bonusUpgrade: 'Auf Tastendruck zwischen Döner, Pizza & Eisdiele umschalten!', sensor: 'bno055-imu', sensorIsI2c: true, actuator: 'led-ring-24', actuatorKind: 'two-pin' },
  { id: 'fun-44', emoji: '🕹️', title: 'Mini-Kran-Greifautomat für Gummibärchen', platform: 'arduino', board: 'arduino-mega-2560', difficulty: 'Bastler-Boss', gagRating: 5, tagline: 'Steuere per 2-Achsen-Joystick einen echten Jahrmarkt-Greifer über deinem Schreibtisch!', howItWorks: 'Der Analog-Joystick fährt NEMA-17-Schrittmotoren in X/Y und lässt den Elektromagnet/Greifer ab.', partsList: ['Arduino Mega 2560', '2-Achsen-Joystick', 'NEMA 17 Stepper'], bonusUpgrade: 'Mit 30-Sekunden-Countdown auf der TM1637-Digitaluhr!', sensor: 'joystick-2axis', actuator: 'nema17-stepper', actuatorKind: 'pwm3' },
  { id: 'fun-45', emoji: '🧼', title: '20-Sekunden-Händewasch-Disco-Timer', platform: 'esp32', board: 'esp32-c3-supermini', difficulty: 'Einfach', gagRating: 4, tagline: 'Hand vors Waschbecken → 20 Sekunden Regenbogen-Countdown + Party-Melodie!', howItWorks: 'Der VL53L0X Laser-Sensor startet kontaktlos den 20-Sekunden-Timer auf dem 12× NeoPixel-Ring.', partsList: ['ESP32-C3 SuperMini', 'VL53L0X Laser-ToF', '12× Ring'], bonusUpgrade: 'Bei < 10 Sekunden ruft DFPlayer: „Noch ein bisschen schrubben!“', sensor: 'vl53l0x-tof', sensorIsI2c: true, actuator: 'led-ring-12', actuatorKind: 'two-pin' },
  { id: 'fun-46', emoji: '⚡', title: 'Waschmaschinen-Fertig-Trommelwirbel', platform: 'raspberry-pi', board: 'rpi-zero-2w', difficulty: 'Mittel', gagRating: 4, tagline: 'Kein müffelndes Vergessen im Keller mehr: Stromzange meldet 0 W → MP3 spielt Tusch!', howItWorks: 'Die SCT-013 Klapp-Stromwandler-Zange hängt ums Stromkabel und erkennt sicher das Programmende.', partsList: ['Raspberry Pi Zero 2 W', 'SCT-013 Stromzange', 'PAM8403 Amp'], bonusUpgrade: 'Blinkt im Wohnzimmer erst aus, wenn du die Waschküchentür öffnest!', sensor: 'sct013-clamp', actuator: 'pam8403-amp', actuatorKind: 'pwm3' },
  { id: 'fun-47', emoji: '🌌', title: 'Fake-Kaminfeuer mit Flacker-LED & Knister-Sound', platform: 'arduino', board: 'arduino-nano', difficulty: 'Einfach', gagRating: 4, tagline: 'Gemütliches Lagerfeuer-Feeling direkt auf dem Büroschreibtisch — 100 % rauchfrei!', howItWorks: 'Flacker-LEDs + Kerzen-Warmweiß werden per Poti/Lichtsensor abends automatisch gemütlich gedimmt.', partsList: ['Arduino Nano', 'LDR Sensor', 'Flacker-LED'], bonusUpgrade: 'DFPlayer spielt dazu leises Holzknistern ab.', sensor: 'ldr', actuator: 'led-candle-flicker', actuatorKind: 'two-pin' },
  { id: 'fun-48', emoji: '🔐', title: 'Geheim-Schublade hinter dem Bücherregal', platform: 'arduino', board: 'arduino-uno-r4', difficulty: 'Mittel', gagRating: 5, tagline: 'Zieh am richtigen Buch (Reed-Kontakt) → der Linearaktor fährt dein Geheimfach aus!', howItWorks: 'Ein versteckter Magnet im Buchrücken löst den Reed-Schalter aus, der den 50-mm-Linearaktor ausfährt.', partsList: ['Arduino UNO R4', 'Reed-Kontakt', 'Linearaktor'], bonusUpgrade: 'Beleuchtet das Geheimfach innen automatisch mit Warmweiß-LEDs!', sensor: 'reed-door', actuator: 'linear-actuator', actuatorKind: 'two-pin' },
  { id: 'fun-49', emoji: '🕵️', title: 'Geldschein- & Geheimtinten-Prüfbox (UV)', platform: 'arduino', board: 'arduino-nano', difficulty: 'Einfach', gagRating: 4, tagline: 'Leg einen Schein rein — die Lichtschranke schaltet automatisch 365-nm-Schwarzlicht ein!', howItWorks: 'TCRT5000 erkennt das eingeschobene Papier und aktiviert sofort die UV-LEDs im dunklen Prüfkasten.', partsList: ['Arduino Nano', 'TCRT5000 Sensor', 'UV-LED 365nm'], bonusUpgrade: 'Ideal auch für Escape-Room-Rätsel mit unsichtbarer UV-Tinte!', sensor: 'tcrt5000-line', actuator: 'uv-led-365', actuatorKind: 'two-pin' },
  { id: 'fun-50', emoji: '⏰', title: 'Der gnadenlose „Steh-auf!“-Laser-Wecker', platform: 'raspberry-pi', board: 'rpi-4b', difficulty: 'Mittel', gagRating: 5, tagline: 'Hört erst auf zu piepen, wenn du aufstehst und eine Laser-Zielscheibe quer im Raum triffst!', howItWorks: 'Der Pi 4B startet die 100-dB-Sirene — nur wer den grünen Laser auf den entfernten Lichtsensor richtet, schaltet sie aus.', partsList: ['Raspberry Pi 4B', 'BH1750 Lux', 'Grün-Laser'], bonusUpgrade: 'Zählt auf dem LCD 20×4 deine verschlafenen Snooze-Tage.', sensor: 'bh1750-lux', sensorIsI2c: true, actuator: 'led-laser-green', actuatorKind: 'two-pin' },
  { id: 'fun-51', emoji: '🐟', title: 'Automatischer Urlaubs-Fischfütterer', platform: 'esp32', board: 'esp32-c6-devkit', difficulty: 'Grundlagen' === 'Grundlagen' ? 'Einfach' : 'Mittel', gagRating: 4, tagline: 'Dreht jeden Tag um 18:00 exakt eine Futterkammer weiter — und meldet Vollzug aufs Handy!', howItWorks: 'Ein 28BYJ-48 Getriebe-Schrittmotor dreht das Futterrad exakt um 30°, während DS18B20 die Wassertemperatur prüft.', partsList: ['ESP32-C6 DevKit', 'DS18B20 Fühler', '28BYJ-48 Stepper'], bonusUpgrade: 'Live-Foto der Fische über OV2640 Kamera nach jeder Fütterung!', sensor: 'ds18b20-probe', actuator: 'stepper-28byj48', actuatorKind: 'pwm3' },
  { id: 'fun-52', emoji: '🎉', title: 'YouTube- / GitHub-Star-Konfetti-Kanone', platform: 'raspberry-pi', board: 'rpi-5', difficulty: 'Mittel', gagRating: 5, tagline: 'Neuer GitHub-Star auf deinem Repo? Sofort feuert der Servo die Party-Fahne & 4×4 RGB-Feuerwerk!', howItWorks: 'Ein Python-Skript auf dem Pi 5 pollt die GitHub-API und löst bei jedem neuen Star 4×4 RGB-Feuerwerk + Fanfare aus!', partsList: ['Raspberry Pi 5', 'OV2640 Kamera', '4×4 RGB-Panel'], bonusUpgrade: 'Zeigt den aktuellen Star-Zähler dauerhaft auf dem TM1637-Display an!', sensor: 'ov2640-cam', sensorIsI2c: true, actuator: 'ws2812-matrix-16', actuatorKind: 'pwm3' },
];

export const EXPANDED_FUNNY_IDEAS: FunnyIdea[] = EXTRA_FUNNY_SEEDS.map((s) => ({
  id: s.id,
  emoji: s.emoji,
  title: s.title,
  platform: s.platform,
  recommendedBoardId: s.board,
  difficulty: s.difficulty,
  gagRating: s.gagRating,
  tagline: s.tagline,
  howItWorks: s.howItWorks,
  partsList: s.partsList,
  bonusUpgrade: s.bonusUpgrade,
  buildPrototype: () =>
    buildQuickPrototype(s.id, s.sensor, s.sensorIsI2c, s.actuator, s.actuatorKind),
}));
