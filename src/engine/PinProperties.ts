import type {
  BoardPinAssignment,
  EspBoardSpec,
  HoverPartInfo,
  HoverPinProperty,
  PinPropertyKind,
} from './types';

export function getPinKindColorHex(kind: PinPropertyKind): string {
  switch (kind) {
    case 'power':
      return '#ef4444';
    case 'ground':
      return '#94a3b8';
    case 'bus':
      return '#facc15';
    case 'analog':
      return '#fb923c';
    case 'passive':
      return '#22c55e';
    case 'warning':
      return '#f59e0b';
    case 'signal':
    default:
      return '#38bdf8';
  }
}

/**
 * Liefert für jedes Bauteil-Pin-Label (alle 200 Werkbank-Teile & Lektionen)
 * Rolle, verständliche Eigenschaft und Farbkodierung.
 */
export function describeComponentPin(pinLabel: string, slotLabel?: string): HoverPinProperty {
  const raw = pinLabel.trim();
  const upper = raw.toUpperCase();
  const displayPin = slotLabel ? `${slotLabel} · ${raw}` : raw;

  // Stromversorgung (+)
  if (
    upper === 'VCC' ||
    upper === '+V' ||
    upper === '3V3' ||
    upper === '5V' ||
    upper === '+5V' ||
    upper === '5V/3V3' ||
    upper === 'PLUS (+)'
  ) {
    const voltHint =
      upper === '5V' || upper === '+5V'
        ? '+5 V Versorgungsspannung (an 5V / VIN / Netzteil +)'
        : upper === '3V3'
          ? '+3,3 V Versorgungsspannung (an Board 3V3 — nicht 5V!)'
          : upper === '5V/3V3'
            ? '+3,3 V oder +5 V Versorgung (bei vielen LEDs/Lasten 5 V)'
            : 'Pluspol / Betriebsspannung (+3,3 V oder +5 V)';
    return {
      pin: displayPin,
      role: upper === '3V3' ? '+3,3 V' : upper.includes('5V') ? '+5 V' : '+VCC',
      property: voltHint,
      kind: 'power',
    };
  }

  // Kombi-Versorgung / Signal-Eingang (z. B. 2-Pin-Module, Aktoren)
  if (
    upper === '+3,3V/SIG' ||
    upper === '+V/SIG' ||
    upper === 'VCC/SIG' ||
    upper === '+5V/PWM'
  ) {
    return {
      pin: displayPin,
      role: upper.includes('PWM') ? '+5 V / PWM' : 'Plus / Signal',
      property: upper.includes('PWM')
        ? 'Steuer- oder Versorgungs-Pluspol (über MOSFET/PWM schaltbar)'
        : 'Pluspol bzw. geschalteter Signal-Ausgang vom GPIO',
      kind: 'power',
    };
  }

  // Masse / Minuspol (-)
  if (
    upper === 'GND' ||
    upper === 'GND (−)' ||
    upper === 'MINUS (−)' ||
    upper === 'COM'
  ) {
    return {
      pin: displayPin,
      role: upper === 'COM' ? 'COM / Masse' : 'GND (0 V)',
      property:
        upper === 'COM'
          ? 'Gemeinsamer Anschluss (Common) — Bezugspotenzial / Rückleiter'
          : 'Masse / Minuspol (0 V) — an Board-GND bzw. blaue Schiene',
      kind: 'ground',
    };
  }

  // LED / Dioden Polarität
  if (upper.startsWith('ANODE')) {
    return {
      pin: displayPin,
      role: 'Anode (+)',
      property: 'Pluspol (langer Fuß) — Strom fließt hinein (bei LED über 220 Ω an GPIO)',
      kind: 'power',
    };
  }
  if (upper.startsWith('KATHODE')) {
    return {
      pin: displayPin,
      role: 'Kathode (−)',
      property: upper.includes('RING')
        ? 'Sperr-/Ring-Seite (silberner Ring) — bei Freilaufdiode Richtung +V'
        : 'Minuspol (kurzer Fuß / flache Gehäusekante) — Richtung GND',
      kind: 'ground',
    };
  }

  // RGB-LED Farbkanäle
  if (upper.startsWith('ROT (')) {
    return {
      pin: displayPin,
      role: 'PWM Rot',
      property: 'Rot-Kanal (Vf ≈ 2,0 V) — über 220 Ω an PWM-GPIO',
      kind: 'power',
    };
  }
  if (upper.startsWith('GRÜN (')) {
    return {
      pin: displayPin,
      role: 'PWM Grün',
      property: 'Grün-Kanal (Vf ≈ 2,2 V) — über 220 Ω an PWM-GPIO',
      kind: 'passive',
    };
  }
  if (upper.startsWith('BLAU (')) {
    return {
      pin: displayPin,
      role: 'PWM Blau',
      property: 'Blau-Kanal (Vf ≈ 3,0 V) — über 220 Ω an PWM-GPIO',
      kind: 'signal',
    };
  }

  // MOSFET Pins
  if (upper.startsWith('GATE')) {
    return {
      pin: displayPin,
      role: 'Gate (Steuerung)',
      property: 'Hochohmiger Steuereingang (3,3 V schaltet durch; 10 kΩ Pull-Down an GND)',
      kind: 'signal',
    };
  }
  if (upper.startsWith('DRAIN')) {
    return {
      pin: displayPin,
      role: 'Drain (Last)',
      property: 'Geschalteter Minuspol zur Last (Lüfter, Motor, LED-Streifen)',
      kind: 'analog',
    };
  }
  if (upper.startsWith('SOURCE')) {
    return {
      pin: displayPin,
      role: 'Source (GND)',
      property: 'Direkt an gemeinsame Masse (GND) anschließen',
      kind: 'ground',
    };
  }

  // I²C / SPI / UART Busse
  if (upper === 'SDA' || upper === 'SDA/SS') {
    return {
      pin: displayPin,
      role: upper === 'SDA/SS' ? 'I²C SDA / SPI SS' : 'I²C Daten',
      property: 'Bidirektionale I²C-Datenleitung (Open-Drain, an Board-SDA mit Pull-Up)',
      kind: 'bus',
    };
  }
  if (upper === 'SCL') {
    return {
      pin: displayPin,
      role: 'I²C Takt',
      property: 'I²C-Taktleitung vom Master (an Board-SCL, 100–400 kHz)',
      kind: 'bus',
    };
  }
  if (upper === 'SCK' || upper === 'CLK') {
    return {
      pin: displayPin,
      role: 'Takt (CLK)',
      property: 'Synchroner Schiebe-/SPI-Takt vom Mikrocontroller',
      kind: 'bus',
    };
  }
  if (upper === 'TX') {
    return {
      pin: displayPin,
      role: 'UART TX',
      property: 'Serieller Sende-Ausgang — gekreuzt an Board-RX anschließen!',
      kind: 'bus',
    };
  }
  if (upper === 'RX') {
    return {
      pin: displayPin,
      role: 'UART RX',
      property: 'Serieller Empfangs-Eingang — gekreuzt an Board-TX anschließen!',
      kind: 'bus',
    };
  }

  // Analog / Potentiometer
  if (upper === 'AOUT' || upper === 'AO' || upper === 'SCHLEIFER') {
    return {
      pin: displayPin,
      role: 'Analog (ADC)',
      property:
        upper === 'SCHLEIFER'
          ? 'Verstellbare Teilspannung (0–3,3 V) — an einen ADC-Pin des Boards'
          : 'Analoger Spannungsausgang (0–3,3 V) — an ADC-Eingang messen',
      kind: 'analog',
    };
  }

  // Ultraschall / PWM / NeoPixel / Digital Signal
  if (upper === 'TRIG') {
    return {
      pin: displayPin,
      role: 'Trigger (IN)',
      property: '10 µs HIGH-Impuls vom GPIO startet Ultraschall-Messung',
      kind: 'signal',
    };
  }
  if (upper === 'ECHO') {
    return {
      pin: displayPin,
      role: 'Echo (5 V OUT)',
      property: 'Antwort-Puls (Länge = Distanz) — bei 3,3-V-Board über Spannungsteiler!',
      kind: 'warning',
    };
  }
  if (upper === 'DIN' || upper === 'DATA') {
    return {
      pin: displayPin,
      role: 'Daten-Pin',
      property:
        upper === 'DIN'
          ? 'Serielle 800-kHz-Datenleitung (WS2812B) — 330 Ω Schutzwiderstand empfohlen'
          : 'Digitale Datenleitung (1-Wire / DHT / Schieberegister) an GPIO',
      kind: 'signal',
    };
  }
  if (upper === 'PWM') {
    return {
      pin: displayPin,
      role: 'PWM-Steuerung',
      property: 'Pulsweiten-Steuersignal (z. B. 50 Hz für Servo oder LEDC-Dimming)',
      kind: 'signal',
    };
  }
  if (
    upper === 'OUT' ||
    upper === 'DO' ||
    upper === 'AUS' ||
    upper === 'AUSGANG' ||
    upper === 'I/O'
  ) {
    return {
      pin: displayPin,
      role: upper === 'I/O' ? 'Digital I/O' : 'Signal-Ausgang',
      property: 'Digitales Sensor-/Schaltsignal (HIGH/LOW) — an Board-Eingang (GPIO)',
      kind: 'signal',
    };
  }
  if (
    upper === 'IN' ||
    upper === 'EIN' ||
    upper === 'EINGANG' ||
    upper === 'SIGNAL (+)'
  ) {
    return {
      pin: displayPin,
      role: 'Steuer-Eingang',
      property: 'Digitales Steuersignal vom Mikrocontroller-GPIO (HIGH = aktiv)',
      kind: 'signal',
    };
  }
  if (upper === 'NC') {
    return {
      pin: displayPin,
      role: 'Nicht belegt',
      property: 'Not Connected — intern nicht angeschlossen, frei lassen',
      kind: 'ground',
    };
  }

  // Ungepolte passive Anschlüsse (Widerstand, Taster, LDR, Schalter)
  if (upper === 'A' || upper === 'B' || upper === 'PIN A' || upper === 'PIN B') {
    return {
      pin: displayPin,
      role: 'Ungepolt',
      property: 'Richtung egal — passiver Anschluss (links/rechts frei austauschbar)',
      kind: 'passive',
    };
  }

  return {
    pin: displayPin,
    role: 'Anschluss',
    property: `Bauteil-Anschluss „${raw}“`,
    kind: 'signal',
  };
}

/**
 * Findet heraus, ob ein Board-Pin eine zugewiesene Labor-Rolle (outA, sda, adc …) besitzt.
 */
function findBoardPinRoleText(spec: EspBoardSpec, cleanLabel: string, explicitRole?: string): string | null {
  const roleDescriptions: Record<string, string> = {
    '3V3': '3,3-V-Hauptversorgungsschiene für Sensoren & Logik',
    GND: 'Gemeinsamer Masse-Bezugspunkt (Common Ground)',
    outA: 'Haupt-Ausgang (outA) für LEDs, PWM, Relais & WLED-Daten',
    outB: 'Zweiter Ausgang (outB) z. B. für Ampel-Gelb oder RGB-Grün',
    outC: 'Dritter Ausgang (outC) z. B. für Ampel-Grün oder RGB-Blau',
    inputA: 'Digital-Eingang (inputA) für Taster, Echo & Präsenz-Signal',
    adc: 'Analog-Eingang (ADC) für Spannungsteiler, LDR & Poti',
    sda: 'Standard I²C-Datenleitung (SDA) für BME280 & OLED',
    scl: 'Standard I²C-Taktleitung (SCL) für BME280 & OLED',
    uartTx: 'Serieller Sende-Pin (UART TX) z. B. für LD2490 Radar',
    uartRx: 'Serieller Empfangs-Pin (UART RX) z. B. für LD2490 Radar',
  };

  if (explicitRole && roleDescriptions[explicitRole]) {
    return roleDescriptions[explicitRole];
  }

  const entries = Object.entries(spec.pins) as Array<[keyof BoardPinAssignment, { label: string; gpio: number }]>;
  for (const [role, assign] of entries) {
    if (assign.label.toUpperCase() === cleanLabel.toUpperCase()) {
      return roleDescriptions[role] ?? null;
    }
  }
  return null;
}

/**
 * Beschreibt jeden einzelnen Pin auf allen 15 Boards (ESP32, Raspberry Pi, Arduino)
 * mit exakter Spannung, Stromlimit, Bus-Funktion und Hardware-Besonderheiten.
 */
export function describeBoardPin(
  spec: EspBoardSpec,
  rawLabel: string,
  explicitRole?: string,
  physicalPinNumber?: number,
): HoverPartInfo {
  // Suffixe wie GND2..GND8, 3V3B, 5VB für saubere Anzeige normalisieren
  const clean = rawLabel.replace(/^(GND|3V3|5V)[2-8B]$/, '$1');
  const upper = clean.toUpperCase();
  const is5vLogic = spec.family === 'arduino' && spec.id !== 'arduino-nano-esp32';
  const logicV = is5vLogic ? '5,0 V' : '3,3 V';
  const maxMa =
    spec.family === 'raspberry-pi-sbc'
      ? '16 mA pro Pin (50 mA gesamt)'
      : spec.family === 'arduino' && is5vLogic
        ? '20 mA empfohlen (40 mA max.)'
        : '12–20 mA empfohlen (max. 40 mA)';
  const pinNumTag = physicalPinNumber ? ` · Header Pin #${physicalPinNumber}` : '';
  const roleNote = findBoardPinRoleText(spec, clean, explicitRole);

  // 1. Stromversorgungs-Pins
  if (upper === '3V3' || upper === '3V3_EN') {
    const isEn = upper === '3V3_EN';
    return {
      partId: `board-pin-${rawLabel}`,
      name: `${clean} — ${isEn ? '3,3-V-Regler Enable' : '3,3 V Stromversorgung'}`,
      categoryLabel: `${spec.shortName}${pinNumTag}`,
      badgeLabel: 'POWER',
      description: isEn
        ? 'Aktiviert den internen 3,3-V-Spannungsregler (auf GND ziehen schaltet 3V3 ab).'
        : 'Stabilisierter +3,3 V Ausgang vom Onboard-Regler für Sensoren, OLEDs und Pull-Ups.',
      specLine: `${spec.name} · +3,3 V DC`,
      removable: false,
      isRemoved: false,
      pinDetails: [
        { pin: 'Spannung', role: '+3,3 V DC', property: 'Geregelte Gleichspannung (nicht mit 5 V verbinden!)', kind: 'power' },
        {
          pin: 'Belastbarkeit',
          role: spec.family === 'arduino' ? '50–150 mA' : '300–500 mA',
          property: 'Reicht für Sensoren & Displays — Motoren/LED-Streifen extern versorgen',
          kind: 'warning',
        },
        ...(roleNote ? [{ pin: 'Labor-Rolle', role: 'Aktiv', property: roleNote, kind: 'signal' as const }] : []),
      ],
    };
  }

  if (upper === '5V' || upper === 'VBUS' || upper === 'VIN' || upper === 'VSYS' || upper === 'RAW') {
    const isVin = upper === 'VIN' || upper === 'RAW' || upper === 'VSYS';
    return {
      partId: `board-pin-${rawLabel}`,
      name: `${clean} — ${isVin ? 'Versorgungs-Eingang' : '5 V Stromversorgung'}`,
      categoryLabel: `${spec.shortName}${pinNumTag}`,
      badgeLabel: 'POWER',
      description: isVin
        ? 'Spannungseingang vor dem Onboard-Regler (z. B. 5 V Akku/Netzteil; bei Arduino UNO/Nano 7–12 V).'
        : 'Direkte +5 V vom USB-Anschluss / Netzteil — ideal für Servos, Relais & WS2812B-Streifen.',
      specLine: `${spec.name} · ${isVin ? 'Power-Eingang' : '+5,0 V DC'}`,
      removable: false,
      isRemoved: false,
      pinDetails: [
        {
          pin: 'Spannung',
          role: isVin && is5vLogic ? '7–12 V DC' : '+5,0 V DC',
          property: isVin ? 'Speist den internen Spannungsregler des Boards' : 'Ungeregelt direkt von USB-VBUS (nicht an 3,3-V-GPIO!)',
          kind: 'power',
        },
        {
          pin: 'Strom',
          role: 'Bis 500–2000 mA',
          property: 'Abhängig vom USB-Port / Netzteil (bei Kurzschluss USB-Schutz!)',
          kind: 'warning',
        },
      ],
    };
  }

  if (upper === 'GND') {
    return {
      partId: `board-pin-${rawLabel}`,
      name: 'GND — Masse (0 V)',
      categoryLabel: `${spec.shortName}${pinNumTag}`,
      badgeLabel: 'GND',
      description: 'Gemeinsamer Bezugspunkt (0 V / Minuspol). Alle GND-Pins auf dem Board sind intern miteinander verbunden.',
      specLine: `${spec.name} · 0 V Referenz`,
      removable: false,
      isRemoved: false,
      pinDetails: [
        { pin: 'Potenzial', role: '0,0 V', property: 'Elektrischer Rückleiter für Stromversorgung & alle Signale', kind: 'ground' },
        { pin: 'Wichtig', role: 'Common GND', property: 'Externe Netzteile/Akkus immer mit Board-GND verbinden!', kind: 'signal' },
      ],
    };
  }

  if (upper === 'EN' || upper === 'RST' || upper === 'RUN') {
    return {
      partId: `board-pin-${rawLabel}`,
      name: `${clean} — Reset / Chip-Enable`,
      categoryLabel: `${spec.shortName}${pinNumTag}`,
      badgeLabel: 'SYSTEM',
      description: 'Startet den Mikrocontroller neu, sobald der Pin kurz auf GND (LOW) gezogen wird.',
      specLine: `${spec.name} · Active-Low Reset`,
      removable: false,
      isRemoved: false,
      pinDetails: [
        { pin: 'Funktion', role: 'Active-LOW', property: 'Intern per Pull-Up auf HIGH; kurzer Kontakt zu GND = Neustart', kind: 'warning' },
        { pin: 'Hinweis', role: 'Kein GPIO', property: 'Nicht als normaler Sensor- oder LED-Pin verwendbar', kind: 'ground' },
      ],
    };
  }

  if (upper === 'AREF' || upper === 'REF' || upper === 'ADC_V' || upper === 'IOREF') {
    return {
      partId: `board-pin-${rawLabel}`,
      name: `${clean} — Spannungs-Referenz`,
      categoryLabel: `${spec.shortName}${pinNumTag}`,
      badgeLabel: 'REFERENZ',
      description:
        upper === 'IOREF'
          ? `Meldet Aufsteck-Shields die Board-Logikspannung (${logicV}).`
          : 'Externe Referenzspannung für besonders genaue ADC-Analogmessungen.',
      specLine: `${spec.name} · Referenz-Pin`,
      removable: false,
      isRemoved: false,
      pinDetails: [
        { pin: 'Funktion', role: 'Referenz', property: upper === 'IOREF' ? `Liefert ${logicV} Logik-Referenz` : 'Präzisions-Referenz für Analog-Digital-Wandler', kind: 'analog' },
      ],
    };
  }

  // 2. Funktions-Erkennung für GPIO / Bus / Analog Pins
  const features: string[] = ['Digital I/O'];
  let kind: PinPropertyKind = 'signal';
  let badgeLabel = 'GPIO';
  let specialWarning: string | null = null;

  // ESP32 Spezialfunktionen
  if (spec.family === 'esp32' || spec.id === 'arduino-nano-esp32') {
    const numMatch = upper.match(/^(?:G|D)(\d+)$/);
    const num = numMatch ? Number(numMatch[1]) : -1;

    if (upper === 'VP' || upper === 'VN' || num === 34 || num === 35 || num === 36 || num === 39) {
      features.length = 0;
      features.push('Nur Eingang (Input-Only)', '12-Bit ADC1');
      kind = 'analog';
      badgeLabel = 'ADC / IN';
      specialWarning = 'Kein Ausgang & kein interner Pull-Up/Down! Perfekt für Sensoren & ADC.';
    } else {
      features.push('Hardware-PWM (LEDC)');
      if (num === 25 || num === 26) {
        features.push('8-Bit DAC (echt analog)', 'ADC2');
        kind = 'analog';
        badgeLabel = 'DAC / PWM';
      } else if ((num >= 32 && num <= 33) || (spec.esphomeVariant !== 'ESP32' && num >= 0 && num <= 5)) {
        features.push('12-Bit ADC1 (WLAN-sicher)');
        kind = 'analog';
        badgeLabel = 'ADC / GPIO';
      }
      if (num === 0 || num === 2 || num === 12 || num === 15) {
        specialWarning = 'Strapping-Pin: Beeinflusst den Boot-Modus beim Einschalten (vorsichtig beschalten).';
      }
    }

    if (upper === 'D21' || upper === 'G21' || spec.pins.sda.label.toUpperCase() === upper) {
      features.push('I²C SDA (Daten)');
      kind = 'bus';
      badgeLabel = 'I²C SDA';
    }
    if (upper === 'D22' || upper === 'G22' || spec.pins.scl.label.toUpperCase() === upper) {
      features.push('I²C SCL (Takt)');
      kind = 'bus';
      badgeLabel = 'I²C SCL';
    }
    if (upper.startsWith('TX') || upper.startsWith('RX')) {
      features.push(upper.startsWith('TX') ? 'UART Senden (TX)' : 'UART Empfangen (RX)');
      kind = 'bus';
      badgeLabel = 'UART';
      if (upper === 'TX0' || upper === 'RX0') {
        specialWarning = 'Wird für USB-Programmierung & Seriellen Monitor genutzt.';
      }
    }
    if (num === 18 || num === 19 || num === 23 || num === 5) {
      features.push(num === 18 ? 'SPI SCK' : num === 19 ? 'SPI MISO' : num === 23 ? 'SPI MOSI' : 'SPI CS');
    }
  } else if (spec.family === 'raspberry-pi-sbc') {
    // Raspberry Pi 40-Pin Header
    if (upper === 'ID_SD' || upper === 'ID_SC') {
      features.length = 0;
      features.push('HAT EEPROM I²C0');
      kind = 'warning';
      badgeLabel = 'HAT I²C';
      specialWarning = 'Reserviert für automatische HAT-Erkennung beim Booten.';
    } else {
      if (upper === 'G2') {
        features.push('I²C1 SDA (Daten)', '1,8 kΩ Pull-Up an Bord');
        kind = 'bus';
        badgeLabel = 'I²C SDA';
      } else if (upper === 'G3') {
        features.push('I²C1 SCL (Takt)', '1,8 kΩ Pull-Up an Bord');
        kind = 'bus';
        badgeLabel = 'I²C SCL';
      } else if (upper === 'G14' || upper === 'G15') {
        features.push(upper === 'G14' ? 'UART TXD' : 'UART RXD');
        kind = 'bus';
        badgeLabel = 'UART';
      } else if (upper === 'G18' || upper === 'G12' || upper === 'G13' || upper === 'G19') {
        features.push('Hardware-PWM');
        badgeLabel = 'PWM / GPIO';
      } else if (upper === 'G7' || upper === 'G8' || upper === 'G9' || upper === 'G10' || upper === 'G11') {
        features.push('SPI0 Bus');
        kind = 'bus';
        badgeLabel = 'SPI';
      } else if (upper === 'G4') {
        features.push('1-Wire Standard (DS18B20)');
      }
      specialWarning = 'NICHT 5-V-tolerant! Direkt 5 V am Pi-GPIO zerstört den SoC (Spannungsteiler nutzen).';
    }
  } else if (spec.family === 'raspberry-pi-mcu') {
    // Raspberry Pi Pico 2 W (RP2350)
    features.push('Hardware-PWM', 'PIO-State-Machine');
    if (upper === 'GP26' || upper === 'GP27' || upper === 'GP28') {
      features.push('12-Bit ADC');
      kind = 'analog';
      badgeLabel = 'ADC / GP';
    } else if (upper === 'GP4' || upper === 'GP5') {
      features.push(upper === 'GP4' ? 'I²C0 SDA' : 'I²C0 SCL');
      kind = 'bus';
      badgeLabel = upper === 'GP4' ? 'I²C SDA' : 'I²C SCL';
    } else if (upper === 'GP0' || upper === 'GP1') {
      features.push(upper === 'GP0' ? 'UART0 TX' : 'UART0 RX');
      kind = 'bus';
      badgeLabel = 'UART';
    }
  } else if (spec.family === 'arduino') {
    // Arduino 5V Boards
    if (/^A\d+$/.test(upper)) {
      features.push(spec.id === 'arduino-uno-r4' ? '14-Bit ADC Analog-In' : '10-Bit ADC Analog-In');
      if (upper === 'A4') features.push('I²C SDA (UNO/Nano)');
      if (upper === 'A5') features.push('I²C SCL (UNO/Nano)');
      kind = 'analog';
      badgeLabel = 'ANALOG IN';
    } else if (upper === 'D0' || upper === 'D1' || upper === 'RX' || upper === 'TX' || upper === 'RX1' || upper === 'TX1') {
      features.push(upper.includes('TX') || upper === 'D1' ? 'UART TX (Senden)' : 'UART RX (Empfangen)');
      kind = 'bus';
      badgeLabel = 'UART';
    } else if (upper === 'D3' || upper === 'D5' || upper === 'D6' || upper === 'D9' || upper === 'D10' || upper === 'D11') {
      features.push('Hardware-PWM (~)');
      badgeLabel = 'PWM ~';
    } else if (upper === 'D13') {
      features.push('Onboard-LED (LED_BUILTIN)', 'SPI SCK');
      badgeLabel = 'LED / SCK';
    } else if (upper === 'D20' || upper === 'D21') {
      features.push(upper === 'D20' ? 'I²C SDA (Mega)' : 'I²C SCL (Mega)');
      kind = 'bus';
      badgeLabel = 'I²C';
    }
  }

  const pinDetails: HoverPinProperty[] = [
    {
      pin: 'Logikpegel',
      role: logicV,
      property: is5vLogic
        ? '5-V-TTL-Logik (HIGH ≈ 5 V, LOW = 0 V) — bei 3,3-V-Sensoren Pegelwandler prüfen'
        : '3,3-V-CMOS-Logik (HIGH ≥ 2,48 V, LOW ≤ 0,83 V) — nicht 5-V-tolerant',
      kind: is5vLogic ? 'power' : 'signal',
    },
    {
      pin: 'Funktionen',
      role: badgeLabel,
      property: features.join(' · '),
      kind,
    },
    {
      pin: 'Stromlimit',
      role: spec.family === 'raspberry-pi-sbc' ? '≤ 16 mA' : '≤ 20 mA',
      property: `${maxMa} — LEDs immer mit Vorwiderstand (220 Ω) betreiben`,
      kind: 'passive',
    },
  ];

  if (roleNote) {
    pinDetails.push({
      pin: 'Im Labor',
      role: 'Belegung',
      property: roleNote,
      kind: 'bus',
    });
  }
  if (specialWarning) {
    pinDetails.push({
      pin: 'Hinweis',
      role: 'Achtung',
      property: specialWarning,
      kind: 'warning',
    });
  }

  return {
    partId: `board-pin-${rawLabel}`,
    name: `Pin ${clean} (${spec.shortName})`,
    categoryLabel: `Board-Pin${pinNumTag}`,
    badgeLabel,
    description: roleNote ?? `${features.join(' · ')} auf dem ${spec.name}.`,
    specLine: `${logicV} Logik · ${maxMa}`,
    removable: false,
    isRemoved: false,
    pinDetails,
  };
}

/**
 * Liefert sinnvolle Pin-Eigenschaften für Standard-Bauteile im Lektionen-Modus.
 */
export function getLessonPartPinDetails(partId: string): HoverPinProperty[] | undefined {
  const id = partId.toLowerCase();
  if (id.includes('rgb')) {
    return [
      describeComponentPin('Rot (R)', 'Pin 1'),
      describeComponentPin('GND', 'Pin 2'),
      describeComponentPin('Grün (G)', 'Pin 3'),
      describeComponentPin('Blau (B)', 'Pin 4'),
    ];
  }
  if (id.includes('led') || id.includes('traffic') || id.includes('load-indicator')) {
    return [
      describeComponentPin('Anode (+)', 'Langer Fuß'),
      describeComponentPin('Kathode (−)', 'Flache Seite'),
    ];
  }
  if (id.includes('resistor') || id === 'r1' || id === 'r2' || id.includes('pull')) {
    return [
      describeComponentPin('A', 'Pin 1'),
      describeComponentPin('B', 'Pin 2'),
    ];
  }
  if (id.includes('button')) {
    return [
      describeComponentPin('A', 'Seite 1'),
      describeComponentPin('B', 'Seite 2'),
    ];
  }
  if (id.includes('ldr')) {
    return [
      describeComponentPin('A', 'Pin 1'),
      describeComponentPin('B', 'Pin 2'),
    ];
  }
  if (id.includes('cap') || id.includes('elko')) {
    return [
      describeComponentPin('Anode (+)', 'Pluspol'),
      describeComponentPin('Kathode (−)', 'Weißer Streifen'),
    ];
  }
  if (id.includes('mosfet') || id.includes('power-regulator')) {
    return [
      describeComponentPin('Gate (G)', 'Pin 1'),
      describeComponentPin('Drain (D)', 'Pin 2'),
      describeComponentPin('Source (S)', 'Pin 3'),
    ];
  }
  if (id.includes('bme280') || id.includes('oled')) {
    return [
      describeComponentPin('VCC', 'Pin 1'),
      describeComponentPin('GND', 'Pin 2'),
      describeComponentPin('SCL', 'Pin 3'),
      describeComponentPin('SDA', 'Pin 4'),
    ];
  }
  if (id.includes('hcsr04') || id.includes('ultrasonic')) {
    return [
      describeComponentPin('VCC', 'Pin 1'),
      describeComponentPin('TRIG', 'Pin 2'),
      describeComponentPin('ECHO', 'Pin 3'),
      describeComponentPin('GND', 'Pin 4'),
    ];
  }
  if (id.includes('ld2490') || id.includes('radar')) {
    return [
      describeComponentPin('5V', 'Pin 1'),
      describeComponentPin('GND', 'Pin 2'),
      describeComponentPin('TX', 'Pin 3'),
      describeComponentPin('RX', 'Pin 4'),
      describeComponentPin('OUT', 'Pin 5'),
    ];
  }
  if (id.includes('servo')) {
    return [
      describeComponentPin('PWM', 'Orange'),
      describeComponentPin('5V', 'Rot'),
      describeComponentPin('GND', 'Braun'),
    ];
  }
  if (id.includes('buzzer')) {
    return [
      describeComponentPin('Plus (+)', 'Signal'),
      describeComponentPin('Minus (−)', 'GND'),
    ];
  }
  if (id.includes('relay')) {
    return [
      describeComponentPin('VCC', 'Spule +'),
      describeComponentPin('IN', 'Steuer-Pin'),
      describeComponentPin('GND', 'Masse'),
    ];
  }
  if (id.includes('flyback') || id.includes('diode')) {
    return [
      describeComponentPin('Kathode (Ring)', 'Richtung +V'),
      describeComponentPin('Anode (+)', 'Richtung Drain/GND'),
    ];
  }
  if (id.includes('wled-strip')) {
    return [
      describeComponentPin('5V', 'Rot'),
      describeComponentPin('DIN', 'Grün (Daten)'),
      describeComponentPin('GND', 'Weiß/Schwarz'),
    ];
  }
  if (id.includes('level-shifter')) {
    return [
      describeComponentPin('VCC', '5V Versorgung'),
      describeComponentPin('IN', '3,3V Daten-In'),
      describeComponentPin('OUT', '5,0V Daten-Out'),
      describeComponentPin('GND', 'Masse'),
    ];
  }
  if (id.includes('fan')) {
    return [
      describeComponentPin('+5V', 'Rot'),
      describeComponentPin('GND', 'Schwarz (über MOSFET)'),
    ];
  }
  if (id.includes('power-supply') || id.includes('psu') || id.includes('meanwell')) {
    return [
      describeComponentPin('+5V', 'V+ Ausgang'),
      describeComponentPin('GND', 'V− Masse (Common GND)'),
    ];
  }
  return undefined;
}
