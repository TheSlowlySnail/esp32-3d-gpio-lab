# Learn ESP32 3D — Interaktive Elektronik- & Mikrocontroller-Lernplattform

Eine interaktive 3D-Web-App zum praxisnahen Lernen von Elektronik, GPIO-Grundlagen, Sensoren, Aktoren und WLED-LED-Streifen rund um die ESP32-Mikrocontroller-Familie — gebaut mit **Vite, TypeScript, Tailwind CSS und Three.js** (ohne Framework-Overhead).

**Live-Demo:** https://theslowlysnail.github.io/esp32-3d-gpio-lab/

---

## Highlights & Features

- **4 interaktive Arbeitsbereiche (Navigationsleiste):**
  - **📚 Lektionen (19):** 19 fertige Schaltungen von LED & Taster bis WLED & Raspberry Pi.
  - **🔧 Freie Werkbank (36 Bauteile & Kabel):** Eigene Schaltungen direkt auf dem 3D-Steckbrett aufbauen, **verschieben (`✋` in 3D + `◀`/`▶`)**, **löschen (`🗑` in 3D + `×`)** und mit **6-farbigen 3D-Jumperkabeln** verkabeln — inkl. Suche, Kategorie-Filter und **36 Bauteilen, Sensoren & Aktoren** (LEDs, RGB, WS2812B NeoPixel-Ring, 650-nm-Laser-Diode, Widerstände, Poti, Taster, Schiebeschalter, Elko, 1N4007, MOSFET, LDR, BME280, DHT22, HC-SR04, HLK-LD2490 Radar, PIR-Bewegungsmelder, MQ-2 Gassensor, Bodenfeuchte-Sensor, MPU6050 Gyro, RFID-RC522, TTP223 Touch, KY-037 Mikrofon, Hall-Sensor, Regen-Sensor, SSD1306 OLED, 7-Segment-Anzeige, SG90 Servo, Piezo-Buzzer, 5V-Relais, 5V-Lüfter & Vibrations-Motor).
  - **🧭 Bau mit mir! (10 Geführte Bauprojekte):** Nimmt Einsteiger Schritt für Schritt an die Hand — von der ersten LED über Ampel, PIR-Alarm, Pflanzen-Gießwächter, DHT22+OLED Wetterstation, Laser-Lichtschranke und Ultraschall-Parkschranke bis zu 5V-Lüfter + NeoPixel-Ring, mit pulsierenden 3D-Zielmarkierungen und Ein-Klick-Helfer (`✨ Diesen Schritt für mich stecken`).
  - **😂 Funny Ideen (12 Spaß-Projekte für ESP32 & Raspberry Pi):** 12 kreative, lustige und wirklich baubare Maker-Ideen (z. B. *Mitternachts-Kühlschrank-Pranger*, *Katzen-vom-Sofa-Radar*, *Drama-Queen-Zimmerpflanze*, *Pi „Chef-kommt“-Laser-Tarnung*, *Klopapier-Leer-Notruf*, *RFID-Schokoladen-Tresor*, *Home-Office „NICHT STÖREN“-Ampel* u. v. m.) — filterbar nach ESP32/Pi und jede mit **„⚡ Prototyp in 3D-Werkbank laden“**!
- **Interaktive 3D-Szene (Three.js + OrbitControls):**
  - Maßstabsgetreue 3D-Bauteile mit weichen Schatten, Live-LED-Glow (`emissiveIntensity`, additiver Halo, `PointLight`), automatisch aktualisierten 4-Band-Widerstandsfarbringen (IEC 60062), klickbarem 3D-Taster, drehendem SG90-Servo-Arm, 24-GHz-HLK-LD2490-Radarwellen, Mean Well 5V-Netzteil/Akku-Pack, flexiblen WS2812B-WLED-Streifen, rotierendem 5-V-Axiallüfter und selbstleuchtendem 0,96"-SSD1306-OLED-Display.
  - **10 wählbare Mikrocomputer & Mikrocontroller (inkl. eigener Vergleichs-Rubrik „Boards (10)“):**
    - *ESP32 Standard & Mini:* `ESP32 DevKit V1`, `ESP32-S3 DevKitC-1 (Dual USB-C)`, `ESP32-C6 DevKitC-1 (Wi-Fi 6 / Zigbee)`, `ESP32-C3 SuperMini`, `ESP32-S3-Zero`, `ESP32 D1 Mini`
    - *Raspberry Pi (Linux SBC & MCU):* `Raspberry Pi 5 (8 GB)`, `Raspberry Pi 4 Model B`, `Raspberry Pi Zero 2 W`, `Raspberry Pi Pico 2 W (RP2350)`
  - **Raum abdunkeln (`Raum dunkel`):** Dimmt das 3D-Umgebungslicht auf Dunkelraum-Niveau herunter, sodass LEDs, WLED-Streifen, Ampel und das SSD1306-OLED besonders kontrastreich strahlen.
  - **Mit Steckbrett oder „Ohne Breadboard“:** Per Klick lässt sich das Steckbrett ausblenden und die komplette Schaltung als fertiger Direktaufbau mit **WAGO 221-415 Hebelklemmen** anzeigen.
- **Reine Schaltungs-Simulations-Engine (`src/engine/`, 0 % Three.js):**
  - Berechnet Spannungen, Ströme (Ohmsches Gesetz), Leistungen, ESP32-Logikpegel (`HIGH`, `LOW`, `FLOATING` inkl. 50-Hz-Netzbrummen, `UNDEFINED`), 12-Bit-ADC-Werte (0–4095), RC-Zeitkonstanten ($\tau = R \cdot C$), induktive Relais-Abschaltspitzen, WLED-Spannungsabfall (Voltage Drop) und Akku-Restlaufzeiten.
  - **Bauteil-Diagnose & Fehler-Simulation:** Jedes Schlüsselbauteil lässt sich direkt per Klick in 3D oder im Inspector entfernen (geisterhafte 3D-Darstellung) — die Engine berechnet sofort die realen physikalischen Folgen (offener Kreis, 50-Hz-Floating, 5-V-Überspannung am HC-SR04, Relais-Kickback ohne 1N4007, WLED-Daten-Glitches oder Voltage Drop ohne Power Injection).
  - **3D-Hover-Tooltips & Live-Erklärer („Was passiert hier gerade? & Warum?“):** Jedes Bauteil wird beim Hovern erklärt; der Live-Erklärer beschreibt in Echtzeit den aktuellen Zustand und die physikalische Ursache.
- **Messinstrumente & Code-Export:**
  - **Telemetrie-HUD:** Ruhige Echtzeit-Anzeige (`tabular-nums`, 5 Hz gedrosselt + Sofort-Update bei Interaktion) für Spannung, Strom, Leistung, Logikpegel und Kontext-Metrik.
  - **2D-Oszilloskop (`<canvas>`):** Echtzeit-Signalverlauf (0–3,6 V) mit eingezeichneten ESP32-Logikschwellen ($V_{IH} = 2{,}48\,\text{V}$, $V_{IL} = 0{,}83\,\text{V}$) und `HOLD`/`RUN`-Taste.
  - **Live-Code-Generator & Fritzing-Schaltplan:** Erzeugt für jede Schaltung und jedes ESP-Board passenden **Arduino-C++-Code**, **ESPHome-YAML** sowie einen dynamischen **Fritzing-Style SVG-Schaltplan** (inkl. Vollbild-Ansicht & SVG-Download).
- **Dark Mode & Light Mode:** Umschaltbar für das komplette UI, die 3D-Arbeitsfläche, das Oszilloskop und den Fritzing-Schaltplan.

---

## Übersicht der 19 interaktiven Lektionen

| Nr. | Kategorie | Lektion | Schwerpunkte |
| --- | --- | --- | --- |
| **01** | Grundlagen | **LED & Vorwiderstand** | Ohmsches Gesetz, Durchlassspannung $V_f$, Live-Farbringe, Überstromschutz (> 20 mA) |
| **02** | Grundlagen | **Taster: Pull-Down, Pull-Up & Floating** | 50-Hz-Störrauschen bei offenen GPIOs, Active-Low, klickbarer 3D-Taster & Leertaste |
| **03** | Grundlagen | **Spannungsteiler & ESP32-ADC** | Teilerformel, 12-Bit-ADC (0–4095), umschaltbar auf Fotowiderstand (LDR GL5528) |
| **04** | PWM & Leistung | **PWM-Dimming (LEDC-Controller)** | Tastgrad (Duty-Cycle), Hardware-LEDC, Rechtecksignal im Oszilloskop |
| **05** | PWM & Leistung | **RGB-LED & 3-Kanal-Farbmischung** | Additive Farbmischung, getrennte Vorwiderstände je Farbkanal |
| **06** | Grundlagen | **RC-Tiefpass & Kondensator-Ladekurve** | Zeitkonstante $\tau = R \cdot C$, exponentielles Laden/Entladen, Tiefpass-Glättung |
| **07** | PWM & Leistung | **N-Kanal MOSFET Lasttreiber** | Logic-Level IRLZ44N (5–24 V Lasten), 10 kΩ Gate-Pulldown & Floating-Gate-Test |
| **08** | Sensoren & Busse | **I²C-Bus & BME280 Umweltsensor** | Open-Drain SDA/SCL, 4,7 kΩ Pull-Ups, Adresse `0x76`, Bus-Ausfall ohne Pull-Ups |
| **09** | Sensoren & Busse | **Ultraschall-Sensor (HC-SR04)** | Laufzeitmessung, 1 kΩ / 2 kΩ Pegelwandler am 5-V-ECHO-Pin (Überspannungsschutz) |
| **10** | Sensoren & Busse | **LD2490 24 GHz mmWave Präsenz-Radar** | Gekreuzter UART (256.000 Baud) + OUT-Pin, Bewegung vs. statische Atem-Präsenz, Gate-Limit |
| **11** | Aktoren | **Relais-Treiber & Freilaufdiode (1N4007)** | Induktive Abschaltspitzen ($U = -L \cdot dI/dt$), Kickback-Spike mit/ohne 1N4007 |
| **12** | Aktoren | **SG90 Mikro-Servo (50 Hz PWM)** | 0°–180° Live-Animation in 3D, 0,5–2,5 ms Steuerpulse alle 20 ms |
| **13** | Aktoren | **Piezo-Buzzer & Tonfrequenzen** | Rechteck-Frequenzen (200–4000 Hz), Noten-Presets (`C4`–`A5`, `Alarm`) |
| **14** | WLED & LED-Streifen | **WLED Kompakt-Streifen (16 LEDs / 0,5 m)** | WS2812B 800 kHz, 330 Ω Datenwiderstand, 1000 µF Elko, Mean Well PSU / Akku-Pack |
| **15** | WLED & LED-Streifen | **WLED Raum-Streifen (60 LEDs / 2 m) & Pegelwandler** | 74AHCT125 Pegelwandler (3,3 V → 5 V), WLED-Strombegrenzer, Daten-Glitch-Simulation |
| **16** | WLED & LED-Streifen | **WLED Lang-Streifen (180–300 LEDs / 5 m) & Power Injection** | Spannungsabfall (Voltage Drop → Gelb-/Rotstich am Ende), beidseitige 5-V-Einspeisung |
| **17** | Raspberry Pi | **Raspberry Pi Ampel-Steuerung (Python GPIO)** | 40-Pin-GPIO-Leiste, 3× 220 Ω + Rot/Gelb/Grün LEDs, Python (`gpiozero`) & MicroPython |
| **18** | Raspberry Pi | **Raspberry Pi PWM-Lüftersteuerung (5 V)** | Temperaturkurve (35–85 °C), N-Kanal-MOSFET, drehender 3D-Axiallüfter |
| **19** | Raspberry Pi | **Raspberry Pi I²C OLED-Display (SSD1306)** | 128×64 Zweifarben-OLED (0x3C), Live-System-/Netzwerk-/GPIO-Anzeige (`luma.oled`) |

---

## Tech-Stack

- **Build & Tooling:** [Vite 6](https://vitejs.dev/), [TypeScript 5](https://www.typescriptlang.org/) (strict mode)
- **3D-Rendering:** [Three.js](https://threejs.org/) (`WebGLRenderer`, `OrbitControls`, `PCFSoftShadowMap`, `CatmullRomCurve3`, `ResizeObserver`)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) mit eigenem Dark/Light-Designsystem & `tabular-nums`
- **2D-Instrumente & Schaltpläne:** Native HTML5 `<canvas>` (HiDPI-Oszilloskop) und dynamisches SVG (Fritzing-Schaltplan-Generator)

---

## Lokales Setup

Voraussetzung: **Node.js ≥ 20** (empfohlen: **Node.js 26 LTS**) und **npm**.

```bash
# Repository klonen
git clone https://github.com/TheSlowlySnail/esp32-3d-gpio-lab.git
cd esp32-3d-gpio-lab

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (Standard: http://localhost:5173)
npm run dev
```

### Nützliche Skripte

```bash
npm run typecheck   # Reine TypeScript-Prüfung (tsc --noEmit)
npm run build       # Typecheck + optimierter Production-Build in dist/
npm run preview     # Lokale Vorschau des Production-Builds
```

---

## Projektstruktur & Architektur

```text
src/
├── engine/              # Reine Simulations-Logik (0 % Three.js)
│   ├── BoardCatalog.ts      # 10 Boards (6 ESP32 + 4 Raspberry Pi) inkl. Pin-Mappings
│   ├── CircuitSolver.ts     # Physik-Engine, Fehler-Simulation & Live-Erklärungen
│   ├── ComponentRegistry.ts # Erweiterbare Bauteil-Bibliothek & Farbcode-Berechnung
│   └── types.ts             # Zentrale TypeScript-Interfaces
├── sandbox/             # Werkbank-Netzlisten-Engine & Geführte Projekte (0 % Three.js)
│   ├── SandboxTypes.ts      # Typen für 14 Bauteile, Jumperkabel & 3D-Zielmarkierungen
│   ├── SandboxEngine.ts     # Echte Breadboard-Union-Find-Simulation & 14-Teile-Katalog
│   └── GuidedProjects.ts    # 3 Schritt-für-Schritt-Bauprojekte mit Live-Prüfung
├── lessons/
│   └── lessons.ts           # 19 strukturierte Lektionen inkl. Formeln & Challenges
├── scene/               # 3D-Darstellung in Three.js
│   ├── SceneManager.ts      # Renderer, Licht/Raumdimmer, Raycasting, Lektionen & Sandbox
│   └── components/          # Modulare 3D-Bauteile (ESP32, Pi, Breadboard, LED, LD2490, WLED, OLED …)
├── ui/                  # Framework-freies Engineering-UI
│   ├── TelemetryHud.ts      # 5-Hz-gedrosseltes Messwert-HUD
│   ├── Oscilloscope.ts      # HiDPI-2D-Oszilloskop mit VIH/VIL-Schwellen
│   ├── CodeGenerator.ts     # Arduino C++, Python/MicroPython, ESPHome YAML & Fritzing-Tab
│   ├── FritzingSchematic.ts # Dynamischer SVG-Schaltplan-Renderer für alle 19 Lektionen
│   ├── SandboxPanel.ts      # UI für Freie Werkbank & Geführten Bau-Assistenten
│   └── ControlsPanel.ts     # Live-Erklärer, Parameter-Regler & Bauteil-Entfernen-UI
└── main.ts              # Orchestrierung & Haupt-Simulationsschleife
```

Ausführliche Details zum Zusammenspiel der Module sowie eine Schritt-für-Schritt-Anleitung zum Hinzufügen eigener 3D-Bauteile findest du in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## GitHub Pages Deployment

Das Projekt enthält bereits eine relative Vite-Konfiguration (`base: './'`) sowie den Workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Nach dem Aktivieren von **Settings → Pages → Source: GitHub Actions** wird jeder Push auf `main` automatisch gebaut und veröffentlicht.

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).
