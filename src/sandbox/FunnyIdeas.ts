import type { EspBoardId } from '../engine/types';
import type { PlacedPart, PlacedWire, SandboxState } from './SandboxTypes';

export type FunnyPlatform = 'esp32' | 'raspberry-pi' | 'both';

export interface FunnyIdea {
  id: string;
  emoji: string;
  title: string;
  platform: FunnyPlatform;
  recommendedBoardId: EspBoardId;
  difficulty: 'Einfach' | 'Mittel' | 'Bastler-Boss';
  gagRating: number; // 1..5
  tagline: string;
  howItWorks: string;
  partsList: string[];
  bonusUpgrade: string;
  buildPrototype: () => SandboxState;
}

function makeState(parts: PlacedPart[], wires: PlacedWire[]): SandboxState {
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

const RAIL_WIRES: PlacedWire[] = [
  {
    id: 'fi-rail-vcc',
    from: { kind: 'board', boardPinRole: '3V3' },
    to: { kind: 'breadboard', col: 2, row: '+top' },
    colorHex: '#ef4444',
  },
  {
    id: 'fi-rail-gnd',
    from: { kind: 'board', boardPinRole: 'GND' },
    to: { kind: 'breadboard', col: 3, row: '-top' },
    colorHex: '#1e293b',
  },
];

export const FUNNY_IDEAS: FunnyIdea[] = [
  {
    id: 'fridge-midnight-shame',
    emoji: '🍕',
    title: 'Mitternachts-Kühlschrank-Pranger',
    platform: 'esp32',
    recommendedBoardId: 'esp32-c3-supermini',
    difficulty: 'Einfach',
    gagRating: 5,
    tagline: 'Schlägt nach 23 Uhr Sirene & Laser-Alarm, sobald jemand heimlich den Kühlschrank öffnet!',
    howItWorks:
      'Ein Hall-Magnetsensor (oder LDR-Lichtsensor für das Kühlschranklicht) erkennt sofort, wenn die Tür aufgeht. Zwischen 23:00 und 06:00 startet der ESP32-C3 den Piezo-Alarm, blinkt mit dem NeoPixel-Ring rot und postet „SNACK-DIEB ERWISCHT!“ per Home-Assistant-Push aufs Handy.',
    partsList: ['ESP32-C3 SuperMini', 'Hall-Sensor + Magnet', 'Piezo-Buzzer', 'NeoPixel-Ring'],
    bonusUpgrade: 'Spiele über ein MP3-Modul eine strenge Stimme ab: „Leg den Käse sofort wieder zurück!“',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f1-hall', type: 'hall-sensor', col: 6, row: 'g' },
          { id: 'f1-buzz', type: 'buzzer', col: 12, row: 'g' },
          { id: 'f1-ring', type: 'neopixel-ring', col: 20, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f1-w1', from: { kind: 'breadboard', col: 6, row: 'j' }, to: { kind: 'breadboard', col: 6, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f1-w2', from: { kind: 'breadboard', col: 8, row: 'j' }, to: { kind: 'breadboard', col: 8, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f1-w3', from: { kind: 'breadboard', col: 7, row: 'i' }, to: { kind: 'board', boardPinRole: 'inputA' }, colorHex: '#facc15' },
          { id: 'f1-w4', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 12, row: 'f' }, colorHex: '#38bdf8' },
          { id: 'f1-w5', from: { kind: 'breadboard', col: 15, row: 'j' }, to: { kind: 'breadboard', col: 15, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f1-w6', from: { kind: 'breadboard', col: 20, row: 'j' }, to: { kind: 'breadboard', col: 20, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f1-w7', from: { kind: 'breadboard', col: 22, row: 'j' }, to: { kind: 'breadboard', col: 22, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f1-w8', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 21, row: 'f' }, colorHex: '#22c55e' },
        ],
      ),
  },
  {
    id: 'cat-sofa-radar',
    emoji: '🐱',
    title: 'Katzen-vom-Sofa-24GHz-Radar',
    platform: 'esp32',
    recommendedBoardId: 'esp32-s3-zero',
    difficulty: 'Mittel',
    gagRating: 5,
    tagline: 'Erkennt per mmWave-Radar selbst schlafende Katzen auf dem verbotenen Sessel — und winkt sie mit einem Servo-Wedel weg!',
    howItWorks:
      'Der HLK-LD2490 24-GHz-Radar misst selbst Atembewegungen durch dünne Decken. Sobald sich ein Vierbeiner länger als 5 Sekunden im Sperrgebiet breit macht, wedelt der SG90-Servo eine Feder und der 5V-Lüfter macht sanften Gegenwind.',
    partsList: ['ESP32-S3-Zero', 'HLK-LD2490 Radar', 'SG90 Servo', '5V Lüfter'],
    bonusUpgrade: 'Schicke ein Foto oder zähle auf dem OLED die täglichen „Sofa-Verstöße“!',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f2-rad', type: 'ld2490', col: 5, row: 'h' },
          { id: 'f2-srv', type: 'servo', col: 14, row: 'g' },
          { id: 'f2-fan', type: 'cooling-fan', col: 22, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f2-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f2-w2', from: { kind: 'breadboard', col: 6, row: 'j' }, to: { kind: 'breadboard', col: 6, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f2-w3', from: { kind: 'breadboard', col: 9, row: 'i' }, to: { kind: 'board', boardPinRole: 'inputA' }, colorHex: '#22c55e' },
          { id: 'f2-w4', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 14, row: 'f' }, colorHex: '#f97316' },
          { id: 'f2-w5', from: { kind: 'breadboard', col: 15, row: 'j' }, to: { kind: 'breadboard', col: 15, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f2-w6', from: { kind: 'breadboard', col: 16, row: 'j' }, to: { kind: 'breadboard', col: 16, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f2-w7', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 22, row: 'f' }, colorHex: '#38bdf8' },
          { id: 'f2-w8', from: { kind: 'breadboard', col: 24, row: 'j' }, to: { kind: 'breadboard', col: 24, row: '-top' }, colorHex: '#1e293b' },
        ],
      ),
  },
  {
    id: 'drama-queen-plant',
    emoji: '🪴',
    title: 'Die Drama-Queen-Zimmerpflanze',
    platform: 'esp32',
    recommendedBoardId: 'esp32-devkit-v1',
    difficulty: 'Einfach',
    gagRating: 5,
    tagline: 'Schickt passiv-aggressive Nachrichten auf dein OLED („ICH VERDURSTE!!“) und jammert per Piezo!',
    howItWorks:
      'Ein kapazitiver Bodenfeuchte-Sensor prüft die Erde. Fällt die Feuchte unter 30 %, zeigt das SSD1306-OLED dramatische Hilferufe, die rote LED blinkt SOS und per WLAN landet eine traurige Nachricht im Familien-Chat.',
    partsList: ['ESP32 DevKit V1', 'Bodenfeuchte-Sensor', 'SSD1306 OLED', 'Piezo-Buzzer'],
    bonusUpgrade: 'Mit einem 5V-Relais + Mini-Pumpe gießt sich die Diva zur Not auch selbst.',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f3-soil', type: 'soil-moisture', col: 5, row: 'g' },
          { id: 'f3-buzz', type: 'buzzer', col: 11, row: 'g' },
          { id: 'f3-oled', type: 'oled', col: 20, row: 'f' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f3-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f3-w2', from: { kind: 'breadboard', col: 7, row: 'j' }, to: { kind: 'breadboard', col: 7, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f3-w3', from: { kind: 'breadboard', col: 6, row: 'i' }, to: { kind: 'board', boardPinRole: 'adc' }, colorHex: '#22c55e' },
          { id: 'f3-w4', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 11, row: 'f' }, colorHex: '#38bdf8' },
          { id: 'f3-w5', from: { kind: 'breadboard', col: 14, row: 'j' }, to: { kind: 'breadboard', col: 14, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f3-w6', from: { kind: 'breadboard', col: 20, row: 'j' }, to: { kind: 'breadboard', col: 20, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f3-w7', from: { kind: 'breadboard', col: 21, row: 'j' }, to: { kind: 'breadboard', col: 21, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f3-w8', from: { kind: 'board', boardPinRole: 'scl' }, to: { kind: 'breadboard', col: 22, row: 'i' }, colorHex: '#facc15' },
          { id: 'f3-w9', from: { kind: 'board', boardPinRole: 'sda' }, to: { kind: 'breadboard', col: 23, row: 'h' }, colorHex: '#38bdf8' },
        ],
      ),
  },
  {
    id: 'pi-boss-is-coming',
    emoji: '🕵️',
    title: 'Raspberry Pi „Chef-kommt“-Laser-Tarnung',
    platform: 'raspberry-pi',
    recommendedBoardId: 'rpi-zero-2w',
    difficulty: 'Mittel',
    gagRating: 5,
    tagline: 'Laser-Lichtschranke vor der Bürotür: Sobald jemand durchläuft, wechselt der Pi blitzschnell auf eine Excel-Tabelle!',
    howItWorks:
      'Eine 650-nm-Laser-Diode leuchtet quer über den Türrahmen auf einen LDR. Unterbricht jemand den Strahl, sendet der Raspberry Pi Zero 2 W als USB-HID-Tastatur sofort „Alt+Tab“ an deinen PC und schaltet die rote Warn-LED ein!',
    partsList: ['Raspberry Pi Zero 2 W', 'KY-008 Laser-Diode', 'LDR Sensor + 10 kΩ', 'LED Rot'],
    bonusUpgrade: 'In Python zusätzlich die Spotify-Musik automatisch auf stumm schalten!',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f4-laser', type: 'laser-diode', col: 5, row: 'g' },
          { id: 'f4-ldr', type: 'ldr', col: 11, row: 'g' },
          { id: 'f4-r220', type: 'resistor-220', col: 17, row: 'h' },
          { id: 'f4-led', type: 'led-red', col: 23, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f4-w1', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 5, row: 'f' }, colorHex: '#ef4444' },
          { id: 'f4-w2', from: { kind: 'breadboard', col: 7, row: 'j' }, to: { kind: 'breadboard', col: 7, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f4-w3', from: { kind: 'breadboard', col: 11, row: 'j' }, to: { kind: 'breadboard', col: 11, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f4-w4', from: { kind: 'breadboard', col: 14, row: 'i' }, to: { kind: 'board', boardPinRole: 'inputA' }, colorHex: '#facc15' },
          { id: 'f4-w5', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 17, row: 'f' }, colorHex: '#38bdf8' },
          { id: 'f4-w6', from: { kind: 'breadboard', col: 25, row: 'j' }, to: { kind: 'breadboard', col: 25, row: '-top' }, colorHex: '#1e293b' },
        ],
      ),
  },
  {
    id: 'toilet-paper-sos',
    emoji: '🧻',
    title: 'Klopapier-Leer-Notruf (Smart WC)',
    platform: 'esp32',
    recommendedBoardId: 'esp32-c6-devkit',
    difficulty: 'Einfach',
    gagRating: 5,
    tagline: 'Misst per Ultraschall die Restdicke der Rolle — und ruft rechtzeitig per LED & Push nach Nachschub!',
    howItWorks:
      'Der HC-SR04 sitzt im Halter und misst den Abstand zur Papierrolle. Überschreitet der Abstand 9 cm (= nur noch Papprolle!), blinkt vor der Tür eine 7-Segment-Countdown-Anzeige und eine Push-Nachricht geht an die WG-Gruppe.',
    partsList: ['ESP32-C6 DevKitC-1', 'HC-SR04 Ultraschall', '7-Segment-Anzeige', 'LED Gelb'],
    bonusUpgrade: 'Per Zigbee direkt die Badezimmer-Lampe kurz rot aufblitzen lassen.',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f5-us', type: 'hcsr04', col: 5, row: 'h' },
          { id: 'f5-7s', type: 'seven-seg', col: 16, row: 'g' },
          { id: 'f5-r', type: 'resistor-220', col: 20, row: 'h' },
          { id: 'f5-led', type: 'led-yellow', col: 26, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f5-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f5-w2', from: { kind: 'breadboard', col: 11, row: 'j' }, to: { kind: 'breadboard', col: 11, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f5-w3', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 16, row: 'f' }, colorHex: '#38bdf8' },
          { id: 'f5-w4', from: { kind: 'breadboard', col: 18, row: 'j' }, to: { kind: 'breadboard', col: 18, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f5-w5', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 20, row: 'f' }, colorHex: '#facc15' },
          { id: 'f5-w6', from: { kind: 'breadboard', col: 28, row: 'j' }, to: { kind: 'breadboard', col: 28, row: '-top' }, colorHex: '#1e293b' },
        ],
      ),
  },
  {
    id: 'pi-bad-air-extractor',
    emoji: '💨',
    title: 'Pi-Pups-Detektor & Turbo-Abzug',
    platform: 'raspberry-pi',
    recommendedBoardId: 'rpi-4b',
    difficulty: 'Mittel',
    gagRating: 5,
    tagline: 'MQ-2 Gassensor erkennt verdächtige Methan-Wolken, startet den Turbo-Lüfter und protokolliert den „Vorfall“!',
    howItWorks:
      'Der MQ-2 Gassensor reagiert empfindlich auf Methan/Schwefelgase. Steigt der Wert sprunghaft an, dreht der Raspberry Pi 4B sofort den 5V-Lüfter auf 100 %, schaltet die rote Warn-LED ein und spielt per Python eine feierliche Fanfare.',
    partsList: ['Raspberry Pi 4B', 'MQ-2 Gassensor', '5V PWM-Lüfter', 'Piezo-Buzzer'],
    bonusUpgrade: 'Zeige auf einem OLED live den „Raumluft-Überlebens-Index“ in Prozent an.',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f6-mq', type: 'mq2-gas', col: 5, row: 'g' },
          { id: 'f6-fan', type: 'cooling-fan', col: 14, row: 'g' },
          { id: 'f6-buzz', type: 'buzzer', col: 22, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f6-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f6-w2', from: { kind: 'breadboard', col: 6, row: 'j' }, to: { kind: 'breadboard', col: 6, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f6-w3', from: { kind: 'breadboard', col: 7, row: 'i' }, to: { kind: 'board', boardPinRole: 'inputA' }, colorHex: '#facc15' },
          { id: 'f6-w4', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 14, row: 'f' }, colorHex: '#38bdf8' },
          { id: 'f6-w5', from: { kind: 'breadboard', col: 16, row: 'j' }, to: { kind: 'breadboard', col: 16, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f6-w6', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 22, row: 'f' }, colorHex: '#f97316' },
          { id: 'f6-w7', from: { kind: 'breadboard', col: 25, row: 'j' }, to: { kind: 'breadboard', col: 25, row: '-top' }, colorHex: '#1e293b' },
        ],
      ),
  },
  {
    id: 'snack-vault-rfid',
    emoji: '🍫',
    title: 'RFID-Schokoladen-Tresor',
    platform: 'raspberry-pi',
    recommendedBoardId: 'rpi-pico-2w',
    difficulty: 'Mittel',
    gagRating: 4,
    tagline: 'Schützt deine Süßigkeiten mit NFC-Karte & Servo-Riegel — bei falscher Karte heult die Sirene!',
    howItWorks:
      'Der MFRC522 RFID-Leser prüft deine geheime Schlüsselkarte. Nur bei richtiger UID dreht der Raspberry Pi Pico 2 W den SG90-Servo-Riegel auf „Offen“ und lässt die grüne LED leuchten. Unbefugte Finger kassieren Buzzer-Alarm!',
    partsList: ['Raspberry Pi Pico 2 W', 'MFRC522 RFID-Leser', 'SG90 Servo', 'LED Grün + Buzzer'],
    bonusUpgrade: 'Zeit-Sperre einbauen: Der Tresor öffnet sich erst nach 18:00 Uhr!',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f7-rfid', type: 'rfid-rc522', col: 5, row: 'h' },
          { id: 'f7-srv', type: 'servo', col: 14, row: 'g' },
          { id: 'f7-r', type: 'resistor-220', col: 19, row: 'h' },
          { id: 'f7-led', type: 'led-green', col: 25, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f7-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f7-w2', from: { kind: 'breadboard', col: 6, row: 'j' }, to: { kind: 'breadboard', col: 6, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f7-w3', from: { kind: 'breadboard', col: 7, row: 'i' }, to: { kind: 'board', boardPinRole: 'sda' }, colorHex: '#38bdf8' },
          { id: 'f7-w4', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 14, row: 'f' }, colorHex: '#f97316' },
          { id: 'f7-w5', from: { kind: 'breadboard', col: 15, row: 'j' }, to: { kind: 'breadboard', col: 15, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f7-w6', from: { kind: 'breadboard', col: 16, row: 'j' }, to: { kind: 'breadboard', col: 16, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f7-w7', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 19, row: 'f' }, colorHex: '#22c55e' },
          { id: 'f7-w8', from: { kind: 'breadboard', col: 27, row: 'j' }, to: { kind: 'breadboard', col: 27, row: '-top' }, colorHex: '#1e293b' },
        ],
      ),
  },
  {
    id: 'zoom-on-air-ampel',
    emoji: '🎙️',
    title: 'Home-Office „NICHT STÖREN“-Ampel',
    platform: 'raspberry-pi',
    recommendedBoardId: 'rpi-5',
    difficulty: 'Einfach',
    gagRating: 4,
    tagline: 'Schaltet vor deiner Zimmertür automatisch auf knallrotes ON-AIR-Licht, sobald du in einem Video-Call bist!',
    howItWorks:
      'Ein Python-Skript auf dem Raspberry Pi 5 fragt Teams/Zoom oder ein kleines Touch-Pad am Schreibtisch ab. Ein Tipp aufs TTP223-Touch-Pad lässt draußen den NeoPixel-Ring & das OLED „ON AIR — BITTE NICHT REINPLATZEN!“ leuchten.',
    partsList: ['Raspberry Pi 5', 'TTP223 Touch-Pad', 'NeoPixel-Ring', 'SSD1306 OLED'],
    bonusUpgrade: 'Zusätzlich eine Taste für „Kaffee-Nachschub erwünscht ☕“ einbauen!',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f8-touch', type: 'touch-ttp223', col: 5, row: 'g' },
          { id: 'f8-ring', type: 'neopixel-ring', col: 12, row: 'g' },
          { id: 'f8-oled', type: 'oled', col: 21, row: 'f' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f8-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f8-w2', from: { kind: 'breadboard', col: 7, row: 'j' }, to: { kind: 'breadboard', col: 7, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f8-w3', from: { kind: 'breadboard', col: 6, row: 'i' }, to: { kind: 'board', boardPinRole: 'inputA' }, colorHex: '#facc15' },
          { id: 'f8-w4', from: { kind: 'breadboard', col: 12, row: 'j' }, to: { kind: 'breadboard', col: 12, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f8-w5', from: { kind: 'breadboard', col: 14, row: 'j' }, to: { kind: 'breadboard', col: 14, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f8-w6', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 13, row: 'f' }, colorHex: '#22c55e' },
          { id: 'f8-w7', from: { kind: 'breadboard', col: 21, row: 'j' }, to: { kind: 'breadboard', col: 21, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f8-w8', from: { kind: 'breadboard', col: 22, row: 'j' }, to: { kind: 'breadboard', col: 22, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f8-w9', from: { kind: 'board', boardPinRole: 'scl' }, to: { kind: 'breadboard', col: 23, row: 'i' }, colorHex: '#facc15' },
          { id: 'f8-w10', from: { kind: 'board', boardPinRole: 'sda' }, to: { kind: 'breadboard', col: 24, row: 'h' }, colorHex: '#38bdf8' },
        ],
      ),
  },
  {
    id: 'snore-nudge-pillow',
    emoji: '😴',
    title: 'Schnarch-Detektor mit Kissen-Stupser',
    platform: 'esp32',
    recommendedBoardId: 'esp32-s3-devkitc',
    difficulty: 'Mittel',
    gagRating: 5,
    tagline: 'Hört auf Sägewerk-Geräusche im Schlafzimmer und weckt per sanftem Vibrations-Motor — ganz ohne Ellbogen!',
    howItWorks:
      'Das KY-037 Mikrofon erkennt rhythmische Schnarch-Spitzen über 5 Sekunden. Statt den ganzen Raum aufzuwecken, summt ein winziger Vibrations-Motor am Bettrahmen kurz an — genau genug, damit sich der Schläfer umdreht.',
    partsList: ['ESP32-S3 DevKitC-1', 'KY-037 Mikrofon', 'Vibrations-Motor', 'LED Blau'],
    bonusUpgrade: 'Morgens per ESP32-Webserver das persönliche „Schnarch-Diagramm der Nacht“ abrufen!',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f9-mic', type: 'sound-mic', col: 6, row: 'g' },
          { id: 'f9-vib', type: 'vib-motor', col: 13, row: 'g' },
          { id: 'f9-r', type: 'resistor-220', col: 19, row: 'h' },
          { id: 'f9-led', type: 'led-blue', col: 25, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f9-w1', from: { kind: 'breadboard', col: 6, row: 'j' }, to: { kind: 'breadboard', col: 6, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f9-w2', from: { kind: 'breadboard', col: 8, row: 'j' }, to: { kind: 'breadboard', col: 8, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f9-w3', from: { kind: 'breadboard', col: 7, row: 'i' }, to: { kind: 'board', boardPinRole: 'inputA' }, colorHex: '#f97316' },
          { id: 'f9-w4', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 13, row: 'f' }, colorHex: '#38bdf8' },
          { id: 'f9-w5', from: { kind: 'breadboard', col: 15, row: 'j' }, to: { kind: 'breadboard', col: 15, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f9-w6', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 19, row: 'f' }, colorHex: '#38bdf8' },
          { id: 'f9-w7', from: { kind: 'breadboard', col: 27, row: 'j' }, to: { kind: 'breadboard', col: 27, row: '-top' }, colorHex: '#1e293b' },
        ],
      ),
  },
  {
    id: 'useless-box-pro',
    emoji: '🤖',
    title: 'Die beleidigte „Useless Box“ (ESP32)',
    platform: 'esp32',
    recommendedBoardId: 'esp32-d1-mini',
    difficulty: 'Mittel',
    gagRating: 5,
    tagline: 'Du legst den Schalter um → ein Servo-Finger schaltet ihn sofort genervt wieder aus!',
    howItWorks:
      'Sobald du den Schiebeschalter einschaltest, merkt es der ESP32 D1 Mini, wartet beim 3. Mal dramatisch 2 Sekunden, blinkt wütend mit der RGB-LED rot und schnippt per SG90-Servo den Schalter direkt wieder zurück!',
    partsList: ['ESP32 D1 Mini', 'Schiebeschalter', 'SG90 Servo', 'RGB-LED'],
    bonusUpgrade: '10 verschiedene „Persönlichkeits-Modi“ programmieren — von schüchtern bis empört!',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f10-sw', type: 'slide-switch', col: 5, row: 'g' },
          { id: 'f10-srv', type: 'servo', col: 13, row: 'g' },
          { id: 'f10-rgb', type: 'led-rgb', col: 22, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f10-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f10-w2', from: { kind: 'breadboard', col: 6, row: 'i' }, to: { kind: 'board', boardPinRole: 'inputA' }, colorHex: '#facc15' },
          { id: 'f10-w3', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 13, row: 'f' }, colorHex: '#f97316' },
          { id: 'f10-w4', from: { kind: 'breadboard', col: 14, row: 'j' }, to: { kind: 'breadboard', col: 14, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f10-w5', from: { kind: 'breadboard', col: 15, row: 'j' }, to: { kind: 'breadboard', col: 15, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f10-w6', from: { kind: 'breadboard', col: 23, row: 'j' }, to: { kind: 'breadboard', col: 23, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f10-w7', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 22, row: 'f' }, colorHex: '#ef4444' },
        ],
      ),
  },
  {
    id: 'coffee-overflow-guardian',
    emoji: '☕',
    title: 'Kaffeetassen-Überlauf- & Kalt-Wächter',
    platform: 'both',
    recommendedBoardId: 'rpi-pico-2w',
    difficulty: 'Einfach',
    gagRating: 4,
    tagline: 'Warnt dich, bevor dein Kaffee kalt wird — oder wenn dein Vollautomat mal wieder die Tasse verfehlt!',
    howItWorks:
      'Ein Regen-/Tropfensensor unter der Tasse meldet sofort Tropfen-Alarm, während ein DHT22 / BME280 daneben die Abkühlkurve verfolgt. Per Relais-Modul lässt sich sogar direkt ein USB-Tassenwärmer zuschalten!',
    partsList: ['Raspberry Pi Pico 2 W / ESP32', 'Regen-Sensor', '5V Relais-Modul', 'Piezo-Buzzer'],
    bonusUpgrade: 'Zähle auf der 7-Segment-Anzeige deine heutigen Tassen Kaffee (Warnung ab Tasse 6)!',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f11-rain', type: 'rain-sensor', col: 5, row: 'g' },
          { id: 'f11-rel', type: 'relay-module', col: 14, row: 'g' },
          { id: 'f11-buzz', type: 'buzzer', col: 22, row: 'g' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f11-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f11-w2', from: { kind: 'breadboard', col: 7, row: 'j' }, to: { kind: 'breadboard', col: 7, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f11-w3', from: { kind: 'breadboard', col: 6, row: 'i' }, to: { kind: 'board', boardPinRole: 'inputA' }, colorHex: '#38bdf8' },
          { id: 'f11-w4', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 14, row: 'f' }, colorHex: '#22c55e' },
          { id: 'f11-w5', from: { kind: 'breadboard', col: 15, row: 'j' }, to: { kind: 'breadboard', col: 15, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f11-w6', from: { kind: 'breadboard', col: 16, row: 'j' }, to: { kind: 'breadboard', col: 16, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f11-w7', from: { kind: 'board', boardPinRole: 'outB' }, to: { kind: 'breadboard', col: 22, row: 'f' }, colorHex: '#f97316' },
          { id: 'f11-w8', from: { kind: 'breadboard', col: 25, row: 'j' }, to: { kind: 'breadboard', col: 25, row: '-top' }, colorHex: '#1e293b' },
        ],
      ),
  },
  {
    id: 'pi-slouch-shamer',
    emoji: '🪑',
    title: 'Krumm-Sitz-Gyro-Erzieher (Pi + MPU6050)',
    platform: 'raspberry-pi',
    recommendedBoardId: 'rpi-zero-2w',
    difficulty: 'Bastler-Boss',
    gagRating: 4,
    tagline: 'Sobald du am Schreibtisch wie ein Fragezeichen sitzt, vibriert der Stuhl und dein Pi zählt deine „Shrimp-Minuten“!',
    howItWorks:
      'Ein MPU6050 6-Achsen-Gyroskop am Rückenlehnen-Clip oder Headset misst deinen Neigungswinkel per I²C. Sobald du länger als 20 Sekunden krumm sitzt, brummt der Vibrations-Motor und das OLED zeigt: „GERADE SITZEN, DU GARNELE!“',
    partsList: ['Raspberry Pi Zero 2 W', 'MPU6050 Gyro (I²C)', 'Vibrations-Motor', 'SSD1306 OLED'],
    bonusUpgrade: 'Täglicher Highscore für die beste Rückenhaltung im Home-Office!',
    buildPrototype: () =>
      makeState(
        [
          { id: 'f12-mpu', type: 'mpu6050', col: 5, row: 'f' },
          { id: 'f12-vib', type: 'vib-motor', col: 13, row: 'g' },
          { id: 'f12-oled', type: 'oled', col: 21, row: 'f' },
        ],
        [
          ...RAIL_WIRES,
          { id: 'f12-w1', from: { kind: 'breadboard', col: 5, row: 'j' }, to: { kind: 'breadboard', col: 5, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f12-w2', from: { kind: 'breadboard', col: 6, row: 'j' }, to: { kind: 'breadboard', col: 6, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f12-w3', from: { kind: 'board', boardPinRole: 'scl' }, to: { kind: 'breadboard', col: 7, row: 'i' }, colorHex: '#facc15' },
          { id: 'f12-w4', from: { kind: 'board', boardPinRole: 'sda' }, to: { kind: 'breadboard', col: 8, row: 'h' }, colorHex: '#38bdf8' },
          { id: 'f12-w5', from: { kind: 'board', boardPinRole: 'outA' }, to: { kind: 'breadboard', col: 13, row: 'f' }, colorHex: '#f97316' },
          { id: 'f12-w6', from: { kind: 'breadboard', col: 15, row: 'j' }, to: { kind: 'breadboard', col: 15, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f12-w7', from: { kind: 'breadboard', col: 21, row: 'j' }, to: { kind: 'breadboard', col: 21, row: '-top' }, colorHex: '#1e293b' },
          { id: 'f12-w8', from: { kind: 'breadboard', col: 22, row: 'j' }, to: { kind: 'breadboard', col: 22, row: '+top' }, colorHex: '#ef4444' },
          { id: 'f12-w9', from: { kind: 'board', boardPinRole: 'scl' }, to: { kind: 'breadboard', col: 23, row: 'i' }, colorHex: '#facc15' },
          { id: 'f12-w10', from: { kind: 'board', boardPinRole: 'sda' }, to: { kind: 'breadboard', col: 24, row: 'h' }, colorHex: '#38bdf8' },
        ],
      ),
  },
];
