/**
 * Physik- & SVG-Engine für die interaktive Multimeter-Übungsplatine:
 * - 9 frei anklickbare goldene Testpunkte (TP1..TP9) für rote & schwarze Messspitze
 * - Klickbare Strom-Messbrücke (Jumper J1) für echte Reihen-Strommessung (LED geht an, sobald DMM brückt!)
 * - 4 realistische Fehler-Detektiv-Szenarien (Sicherung F1 durch, R1 unterbrochen, 3,3V-Regler tot, Kurzschluss)
 */

export type BoardFaultId =
  | 'none'
  | 'blown-fuse-f1'
  | 'open-resistor-r1'
  | 'dead-ldo-3v3'
  | 'short-3v3-gnd';

export interface BoardTestPad {
  id: string;
  label: string;
  name: string;
  x: number;
  y: number;
  hint: string;
}

export interface BoardFaultScenario {
  id: BoardFaultId;
  title: string;
  symptom: string;
  diagnosticHint: string;
}

export const BOARD_FAULT_SCENARIOS: BoardFaultScenario[] = [
  {
    id: 'none',
    title: '✅ Alles intakt (Freies Messen)',
    symptom: 'Alle Spannungen (+5 V, +3,3 V, 1,65 V), LED-Zweig (5,9 mA) & Sicherung F1 sind in Ordnung.',
    diagnosticHint: 'Miss dich frei durch alle 9 Testpunkte und öffne Jumper J1 für echte Reihen-Strommessung!',
  },
  {
    id: 'blown-fuse-f1',
    title: 'Sicherung F1 durchgebrannt',
    symptom: 'Die Eingangs-Sicherung F1 zwischen TP8 und TP9 ist unterbrochen!',
    diagnosticHint: 'Schaltung AUS → Durchgang (🔊) oder Ω zwischen TP8 und TP9 messen → „OL“ statt 0,2 Ω!',
  },
  {
    id: 'open-resistor-r1',
    title: 'Vorwiderstand R1 (220 Ω) unterbrochen',
    symptom: 'Die rote LED leuchtet nicht, obwohl +3,3 V am Board anliegen!',
    diagnosticHint: 'Schaltung AUS → Ω zwischen TP4 (J1-B) und TP5 (LED+) messen → „OL“ statt 220 Ω!',
  },
  {
    id: 'dead-ldo-3v3',
    title: '3,3-V-Spannungsregler (AMS1117) defekt',
    symptom: '+5 V am USB-Eingang (TP1) sind da, aber am 3,3-V-Ausgang (TP2) kommen 0,00 V an!',
    diagnosticHint: 'Schaltung EIN → V⎓ an TP1 ↔ TP3 (5,00 V OK), dann an TP2 ↔ TP3 (0,00 V defekt!).',
  },
  {
    id: 'short-3v3-gnd',
    title: 'Kurzschluss zwischen +3,3 V und GND',
    symptom: 'Das Board bricht zusammen: +3,3 V liegen direkt auf 0 V, zwischen TP2 und TP3 piept es!',
    diagnosticHint: 'Schaltung AUS → Durchgang (🔊) zwischen TP2 (+3,3V) und TP3 (GND) → 0,3 Ω PIEP!',
  },
];

export const BOARD_TEST_PADS: BoardTestPad[] = [
  { id: 'TP1', label: 'TP1', name: '+5V USB-Eingang', x: 86, y: 78, hint: '5,00 V Versorgung vor dem Regler' },
  { id: 'TP2', label: 'TP2', name: '+3,3V Regler-Out', x: 256, y: 78, hint: 'Geregelte +3,30 V Hauptschiene' },
  { id: 'TP3', label: 'TP3', name: 'GND (Masse 0V)', x: 86, y: 296, hint: 'Gemeinsamer 0-V-Bezugspunkt' },
  { id: 'TP4', label: 'J1-A', name: 'Jumper J1 Eingang', x: 358, y: 148, hint: 'Vor Strom-Messbrücke J1 (3,3 V)' },
  { id: 'TP5', label: 'J1-B', name: 'Jumper J1 → R1', x: 422, y: 148, hint: 'Nach J1, vor 220-Ω-Widerstand R1' },
  { id: 'TP6', label: 'LED+', name: 'LED-Anode (+)', x: 540, y: 148, hint: 'Zwischen R1 (220 Ω) und roter LED' },
  { id: 'TP7', label: 'GND2', name: 'LED-Kathode (GND)', x: 540, y: 296, hint: 'Massepunkt hinter der LED' },
  { id: 'TP8', label: 'ADC', name: 'Teiler-Mitte (1,65V)', x: 256, y: 214, hint: 'Mitte zwischen R2 (10 kΩ) & R3 (10 kΩ)' },
  { id: 'TP9', label: 'F1-B', name: 'Sicherung F1 Ausgang', x: 170, y: 78, hint: 'Hinter Sicherung F1 (vor Regler)' },
];

export interface InteractiveBoardMeasurement {
  displayMain: string;
  displayUnit: string;
  subBadge: string;
  tone: 'ok' | 'info' | 'warning' | 'danger' | 'off';
  beep: boolean;
  ledLitByCircuit: boolean;
  ledGlowByDiodeTest: boolean;
  sparkOnBoard: boolean;
  explanationTitle: string;
  explanationBody: string;
  blownFuse?: 'mA' | '10A';
}

export interface InteractiveBoardInput {
  dial: 'OFF' | 'VDC' | 'VAC' | 'OHM' | 'CONT' | 'MA' | 'A10';
  redJack: 'V_OHM_MA' | 'A10';
  redPadId: string;
  blackPadId: string;
  circuitPowered: boolean;
  jumperJ1Closed: boolean;
  fault: BoardFaultId;
  meterFuseBlown: 'mA' | '10A' | null;
}

/**
 * Berechnet die realistischen Knotenspannungen (gegen GND = 0 V) je nach Fault & Jumper J1.
 */
function computeNodeVoltages(
  circuitPowered: boolean,
  jumperJ1Closed: boolean,
  fault: BoardFaultId,
  meterBridgingJ1: boolean,
): Record<string, number> {
  if (!circuitPowered) {
    return { TP1: 0, TP9: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0, TP7: 0, TP8: 0 };
  }

  const v5In = 5.0;
  const vAfterFuse = fault === 'blown-fuse-f1' ? 0 : v5In;
  const v33 =
    vAfterFuse < 3.5 || fault === 'dead-ldo-3v3' || fault === 'short-3v3-gnd' ? 0 : 3.3;

  const vAdc = v33 * 0.5; // 10k / 10k Spannungsteiler
  const j1Connected = jumperJ1Closed || meterBridgingJ1;
  const vJ1B = j1Connected ? v33 : 0;
  const ledBranchActive = j1Connected && fault !== 'open-resistor-r1' && v33 > 2.2;
  const vLedAnode = ledBranchActive ? 2.0 : 0;

  return {
    TP1: v5In,
    TP9: vAfterFuse,
    TP2: v33,
    TP3: 0,
    TP4: v33,
    TP5: vJ1B,
    TP6: vLedAnode,
    TP7: 0,
    TP8: vAdc,
  };
}

/**
 * Berechnet den realistischen Widerstand (in Ω) zwischen zwei beliebigen Testpunkten bei ausgeschalteter Schaltung.
 */
function computePairResistanceOhms(
  a: string,
  b: string,
  jumperJ1Closed: boolean,
  fault: BoardFaultId,
): number {
  if (a === b) return 0.1;
  const pair = [a, b].sort().join('-');

  const gndSet = new Set(['TP3', 'TP7']);
  if (gndSet.has(a) && gndSet.has(b)) return 0.1;

  // Kurzschluss-Szenario: TP2 (+3,3V) & TP4 (J1-A) sind direkt mit GND kurzgeschlossen!
  const rail33Set = new Set(jumperJ1Closed ? ['TP2', 'TP4', 'TP5'] : ['TP2', 'TP4']);
  if (rail33Set.has(a) && rail33Set.has(b)) return 0.2;

  if (fault === 'short-3v3-gnd') {
    if ((rail33Set.has(a) && gndSet.has(b)) || (rail33Set.has(b) && gndSet.has(a))) {
      return 0.3;
    }
  }

  // Sicherung F1 zwischen TP1 (+5V) und TP9 (F1-B)
  if (pair === 'TP1-TP9') {
    return fault === 'blown-fuse-f1' ? Infinity : 0.2;
  }

  // Jumper J1 zwischen TP4 und TP5
  if (pair === 'TP4-TP5') {
    return jumperJ1Closed ? 0.1 : Infinity;
  }

  // Vorwiderstand R1 (220 Ω) zwischen TP5 und TP6
  if (pair === 'TP5-TP6' || (jumperJ1Closed && (pair === 'TP4-TP6' || pair === 'TP2-TP6'))) {
    return fault === 'open-resistor-r1' ? Infinity : 220.4;
  }

  // Spannungsteiler R2 (TP2↔TP8) und R3 (TP8↔GND)
  if ((rail33Set.has(a) && b === 'TP8') || (rail33Set.has(b) && a === 'TP8')) {
    return 10000;
  }
  if ((gndSet.has(a) && b === 'TP8') || (gndSet.has(b) && a === 'TP8')) {
    return 10000;
  }

  // 3,3V Schiene gegen GND im Normalzustand: über R2 + R3 (20 kΩ) messbar
  if ((rail33Set.has(a) && gndSet.has(b)) || (rail33Set.has(b) && gndSet.has(a))) {
    return 19950;
  }

  // +5V gegen GND
  if ((a === 'TP1' && gndSet.has(b)) || (b === 'TP1' && gndSet.has(a))) {
    return 47000;
  }

  return Infinity;
}

export function evaluateInteractiveBoard(input: InteractiveBoardInput): InteractiveBoardMeasurement {
  const { dial, redJack, redPadId, blackPadId, circuitPowered, jumperJ1Closed, fault, meterFuseBlown } =
    input;

  const isBridgingJ1 =
    !jumperJ1Closed &&
    ((redPadId === 'TP4' && blackPadId === 'TP5') || (redPadId === 'TP5' && blackPadId === 'TP4'));

  const validCurrentBridge =
    isBridgingJ1 &&
    !meterFuseBlown &&
    ((dial === 'MA' && redJack === 'V_OHM_MA') || (dial === 'A10' && redJack === 'A10'));

  const voltages = computeNodeVoltages(circuitPowered, jumperJ1Closed, fault, validCurrentBridge);
  const ledLitByCircuit =
    circuitPowered &&
    (jumperJ1Closed || validCurrentBridge) &&
    fault !== 'blown-fuse-f1' &&
    fault !== 'dead-ldo-3v3' &&
    fault !== 'short-3v3-gnd' &&
    fault !== 'open-resistor-r1';

  const vRed = voltages[redPadId] ?? 0;
  const vBlack = voltages[blackPadId] ?? 0;
  const vDiff = vRed - vBlack;
  const padRed = BOARD_TEST_PADS.find((p) => p.id === redPadId);
  const padBlack = BOARD_TEST_PADS.find((p) => p.id === blackPadId);
  const pairLabel = `${padRed?.label ?? redPadId} ↔ ${padBlack?.label ?? blackPadId}`;

  if (dial === 'OFF') {
    return {
      displayMain: '---',
      displayUnit: '',
      subBadge: 'POWER OFF',
      tone: 'off',
      beep: false,
      ledLitByCircuit,
      ledGlowByDiodeTest: false,
      sparkOnBoard: false,
      explanationTitle: 'Multimeter ausgeschaltet',
      explanationBody: 'Drehe links am Multimeter auf V⎓, Ω, 🔊 ►| oder mA und klicke beliebige Testpunkte auf der Platine an!',
    };
  }

  // 1. Kurzschluss-Prüfung: Strom-Modus oder 10A-Buchse parallel über eine aktive Spannungsdifferenz (außer echte Messbrücke J1!)
  if (
    !isBridgingJ1 &&
    circuitPowered &&
    Math.abs(vDiff) > 0.6 &&
    (redJack === 'A10' || dial === 'MA' || dial === 'A10')
  ) {
    const which: 'mA' | '10A' = redJack === 'A10' ? '10A' : 'mA';
    return {
      displayMain: 'FUSE',
      displayUnit: 'ERR',
      subBadge: 'KURZSCHLUSS!',
      tone: 'danger',
      beep: false,
      ledLitByCircuit: false,
      ledGlowByDiodeTest: false,
      sparkOnBoard: true,
      blownFuse: which,
      explanationTitle: `⚡ Kurzschluss an ${pairLabel}! ${which}-Sicherung ausgelöst!`,
      explanationBody:
        'Du hast das Multimeter im Strom-Modus (oder mit rotem Kabel in der 10A-Buchse) PARALLEL an eine Spannungsdifferenz gehalten! Strom darf auf dieser Platine nur über die geöffnete Messbrücke J1 (J1-A ↔ J1-B) in Reihe gemessen werden.',
    };
  }

  if ((dial === 'MA' || dial === 'A10') && meterFuseBlown) {
    return {
      displayMain: '0.00',
      displayUnit: dial === 'A10' ? 'A' : 'mA',
      subBadge: 'SICHERUNG DEFEKT',
      tone: 'danger',
      beep: false,
      ledLitByCircuit,
      ledGlowByDiodeTest: false,
      sparkOnBoard: false,
      explanationTitle: `${meterFuseBlown}-Sicherung ist durch — Strommessung blockiert`,
      explanationBody: 'Klicke auf „🔧 Sicherung ersetzen“, um wieder Strom messen zu können.',
    };
  }

  // 2. Gleichspannung V DC
  if (dial === 'VDC') {
    if (redJack === 'A10') {
      return {
        displayMain: 'LEAD',
        displayUnit: 'ERR',
        subBadge: 'FALSCHE BUCHSE',
        tone: 'warning',
        beep: false,
        ledLitByCircuit,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: 'Rotes Kabel für Spannungsmessung in „V Ω mA“ umstecken!',
        explanationBody: 'Stecke links unten am Multimeter das rote Kabel aus „10A“ zurück in „V Ω mA“.',
      };
    }
    const sign = vDiff < -0.005 ? '−' : '';
    const absV = Math.abs(vDiff);

    let detail = `Potenzialdifferenz zwischen ${padRed?.name ?? redPadId} (${vRed.toFixed(2)} V) und ${padBlack?.name ?? blackPadId} (${vBlack.toFixed(2)} V).`;
    if (circuitPowered && Math.abs(absV - 1.3) < 0.08 && [redPadId, blackPadId].includes('TP5') && [redPadId, blackPadId].includes('TP6')) {
      detail = 'Stark! Du misst genau die 1,30 V Spannungsabfall über den 220-Ω-Vorwiderstand R1 (3,30 V − 2,00 V = 1,30 V → I = 5,9 mA)!';
    } else if (circuitPowered && Math.abs(absV - 2.0) < 0.08 && [redPadId, blackPadId].includes('TP6')) {
      detail = 'Exakt! An der leuchtenden roten LED fallen ziemlich genau ihre 2,00 V Durchlassspannung (Vf) ab.';
    } else if (circuitPowered && Math.abs(absV - 1.65) < 0.08 && [redPadId, blackPadId].includes('TP8')) {
      detail = 'Treffer! Der 10kΩ / 10kΩ Spannungsteiler halbiert die 3,30 V exakt auf 1,65 V am ADC-Messpunkt!';
    } else if (!circuitPowered) {
      detail = 'Die Platine ist ausgeschaltet (0,00 V). Schalte oben auf „⚡ Platine: EIN“, um Live-Spannungen zu messen.';
    }

    return {
      displayMain: `${sign}${absV.toFixed(2)}`,
      displayUnit: 'V DC',
      subBadge: `DC • ${pairLabel}`,
      tone: !circuitPowered ? 'info' : vDiff < -0.01 ? 'info' : 'ok',
      beep: false,
      ledLitByCircuit,
      ledGlowByDiodeTest: false,
      sparkOnBoard: false,
      explanationTitle: `Spannung an ${pairLabel}: ${sign}${absV.toFixed(2)} V DC`,
      explanationBody: detail,
    };
  }

  // 3. Wechselspannung V AC
  if (dial === 'VAC') {
    return {
      displayMain: '0.00',
      displayUnit: 'V AC',
      subBadge: 'AC RMS',
      tone: 'info',
      beep: false,
      ledLitByCircuit,
      ledGlowByDiodeTest: false,
      sparkOnBoard: false,
      explanationTitle: '0,00 V AC — auf dieser Platine liegt Gleichspannung (DC) an',
      explanationBody: 'Drehe den Wahlschalter auf V⎓ (DC Volt), um 5 V, 3,3 V oder 1,65 V zu messen.',
    };
  }

  // 4. Widerstand Ω
  if (dial === 'OHM') {
    if (redJack === 'A10') {
      return {
        displayMain: 'LEAD',
        displayUnit: 'ERR',
        subBadge: 'FALSCHE BUCHSE',
        tone: 'warning',
        beep: false,
        ledLitByCircuit,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: 'Rotes Kabel für Ω-Messung in „V Ω mA“ stecken!',
        explanationBody: 'Wechsle die rote Buchse unten am Multimeter auf „V Ω mA“.',
      };
    }
    if (circuitPowered) {
      return {
        displayMain: 'ERR',
        displayUnit: 'VOLT!',
        subBadge: 'PLATINE IST EIN!',
        tone: 'warning',
        beep: false,
        ledLitByCircuit,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: '⚠️ Platine erst stromlos schalten, bevor du Ω misst!',
        explanationBody: 'Klicke oben auf „⚡ Platine: EIN“ → AUS! Nur im ausgeschalteten Zustand stimmen Widerstandsmessungen.',
      };
    }

    const r = computePairResistanceOhms(redPadId, blackPadId, jumperJ1Closed, fault);
    if (!Number.isFinite(r)) {
      return {
        displayMain: 'OL',
        displayUnit: 'MΩ',
        subBadge: `OPEN LOOP • ${pairLabel}`,
        tone: 'info',
        beep: false,
        ledLitByCircuit: false,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: `OL (kein Durchgang / unendlich Ω) zwischen ${pairLabel}`,
        explanationBody:
          'Zwischen diesen beiden Testpunkten ist der Pfad offen (z. B. offener Jumper J1, LED-Sperrrichtung oder eine defekte Sicherung/Unterbrechung!).',
      };
    }
    const isK = r >= 1000;
    const str = isK ? (r / 1000).toFixed(2) : r.toFixed(1);
    return {
      displayMain: str,
      displayUnit: isK ? 'kΩ' : 'Ω',
      subBadge: `AUTO Ω • ${pairLabel}`,
      tone: 'ok',
      beep: false,
      ledLitByCircuit: false,
      ledGlowByDiodeTest: false,
      sparkOnBoard: false,
      explanationTitle: `Widerstand zwischen ${pairLabel}: ${str} ${isK ? 'kΩ' : 'Ω'}`,
      explanationBody:
        r < 1
          ? 'Nahezu 0 Ω — direkte leitende Kupferverbindung (oder Kurzschluss!).'
          : 'Sauber stromlos gemessen! Probiere auch andere Testpunkte wie J1-B ↔ LED+ (220 Ω) oder TP2 ↔ ADC (10 kΩ).',
    };
  }

  // 5. Durchgang & Dioden-Test (CONT / ►|)
  if (dial === 'CONT') {
    if (redJack === 'A10') {
      return {
        displayMain: 'LEAD',
        displayUnit: 'ERR',
        subBadge: 'FALSCHE BUCHSE',
        tone: 'warning',
        beep: false,
        ledLitByCircuit,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: 'Rotes Kabel in „V Ω mA“ stecken!',
        explanationBody: 'Für Durchgang & Dioden-Test muss das rote Kabel in „V Ω mA“ stecken.',
      };
    }
    if (circuitPowered) {
      return {
        displayMain: 'ERR',
        displayUnit: 'VOLT!',
        subBadge: 'PLATINE IST EIN!',
        tone: 'warning',
        beep: false,
        ledLitByCircuit,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: '⚠️ Durchgang & LED-Test nur bei ausgeschalteter Platine!',
        explanationBody: 'Schalte die Platine zuerst auf AUS, damit keine Fremdspannung den Test stört.',
      };
    }

    // Spezialfall: Dioden-Test direkt über der roten LED (TP6 LED+ ↔ TP7/TP3 GND)
    const isGndBlack = blackPadId === 'TP7' || blackPadId === 'TP3';
    const isGndRed = redPadId === 'TP7' || redPadId === 'TP3';
    if (redPadId === 'TP6' && isGndBlack) {
      return {
        displayMain: '1.98',
        displayUnit: 'V ►|',
        subBadge: 'LED TEST OK',
        tone: 'ok',
        beep: false,
        ledLitByCircuit: false,
        ledGlowByDiodeTest: true,
        sparkOnBoard: false,
        explanationTitle: '💡 LED glimmt! Durchlassspannung Vf = 1,98 V',
        explanationBody:
          'Rote Spitze an LED-Anode (LED+), schwarze Spitze an Kathode (GND) → der Dioden-Prüfstrom lässt die LED schwach aufglimmen!',
      };
    }
    if (isGndRed && blackPadId === 'TP6') {
      return {
        displayMain: 'OL',
        displayUnit: '►|',
        subBadge: 'SPERRRICHTUNG',
        tone: 'info',
        beep: false,
        ledLitByCircuit: false,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: 'OL — LED sperrt (Spitzen verpolt)',
        explanationBody:
          'Setze die rote Spitze auf LED+ und die schwarze Spitze auf GND2, um die LED in Durchlassrichtung zu testen!',
      };
    }

    const r = computePairResistanceOhms(redPadId, blackPadId, jumperJ1Closed, fault);
    if (r <= 50) {
      return {
        displayMain: r.toFixed(1),
        displayUnit: 'Ω',
        subBadge: 'DURCHGANG OK',
        tone: 'ok',
        beep: true,
        ledLitByCircuit: false,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: `🔊 PIEP! Direkter Durchgang an ${pairLabel} (${r.toFixed(1)} Ω)`,
        explanationBody:
          fault === 'short-3v3-gnd' &&
          ((redPadId === 'TP2' && (blackPadId === 'TP3' || blackPadId === 'TP7')) ||
            (blackPadId === 'TP2' && (redPadId === 'TP3' || redPadId === 'TP7')))
            ? '🚨 Aha! +3,3 V und GND piepen direkt durch — du hast den Kurzschluss gefunden!'
            : 'Die Verbindung zwischen beiden Pads ist niederohmig geschlossen (< 50 Ω).',
      };
    }
    return {
      displayMain: 'OL',
      displayUnit: 'Ω',
      subBadge: 'KEIN DURCHGANG',
      tone: 'info',
      beep: false,
      ledLitByCircuit: false,
      ledGlowByDiodeTest: false,
      sparkOnBoard: false,
      explanationTitle: `Kein Piepton (OL / > 50 Ω) an ${pairLabel}`,
      explanationBody:
        fault === 'blown-fuse-f1' && [redPadId, blackPadId].sort().join('-') === 'TP1-TP9'
          ? '🔎 Treffer! Zwischen TP1 und F1-B ist kein Durchgang — Sicherung F1 ist durchgebrannt!'
          : 'Keine direkte Kurzschluss-/Drahtverbindung zwischen diesen zwei Punkten.',
    };
  }

  // 6. Strommessung (mA / 10A) über geöffnete Messbrücke J1!
  if (dial === 'MA' || dial === 'A10') {
    if (dial === 'A10' && redJack !== 'A10') {
      return {
        displayMain: 'LEAD',
        displayUnit: '10A!',
        subBadge: 'UMSTECKEN',
        tone: 'warning',
        beep: false,
        ledLitByCircuit,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: 'Für 10A-Bereich rotes Kabel in Buchse „10A MAX“ stecken!',
        explanationBody: 'Oder drehe für kleine Ströme (~6 mA) auf „mA“ und lass das rote Kabel in „V Ω mA“.',
      };
    }
    if (dial === 'MA' && redJack === 'A10') {
      return {
        displayMain: 'LEAD',
        displayUnit: 'mA!',
        subBadge: 'UMSTECKEN',
        tone: 'warning',
        beep: false,
        ledLitByCircuit,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: 'Für mA-Bereich rotes Kabel in Buchse „V Ω mA“ stecken!',
        explanationBody: 'Klicke unten rechts auf „V Ω mA“.',
      };
    }
    if (!circuitPowered) {
      return {
        displayMain: '0.00',
        displayUnit: dial === 'A10' ? 'A' : 'mA',
        subBadge: 'PLATINE AUS',
        tone: 'info',
        beep: false,
        ledLitByCircuit: false,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle: '0,00 — Platine ist ausgeschaltet',
        explanationBody: 'Schalte die Platine auf EIN, öffne Jumper J1 und setze die Spitzen auf J1-A und J1-B!',
      };
    }
    if (isBridgingJ1) {
      const ma =
        fault === 'blown-fuse-f1' ||
        fault === 'dead-ldo-3v3' ||
        fault === 'short-3v3-gnd' ||
        fault === 'open-resistor-r1'
          ? 0
          : 5.9;
      const sign = redPadId === 'TP5' && ma > 0 ? '−' : '';
      return {
        displayMain: dial === 'A10' ? `${sign}${(ma / 1000).toFixed(3)}` : `${sign}${ma.toFixed(1)}`,
        displayUnit: dial === 'A10' ? 'A DC' : 'mA',
        subBadge: 'REIHE ÜBER J1',
        tone: ma > 0 ? 'ok' : 'warning',
        beep: false,
        ledLitByCircuit: ma > 0,
        ledGlowByDiodeTest: false,
        sparkOnBoard: false,
        explanationTitle:
          ma > 0
            ? `✅ Echte Reihen-Strommessung: ${sign}${ma.toFixed(1)} mA (LED leuchtet über dein Multimeter!)`
            : '0,0 mA — durch den aktiven Defekt auf der Platine fließt kein Strom!',
        explanationBody:
          ma > 0
            ? 'Genial! Weil Jumper J1 offen ist, fließt der komplette LED-Strom (3,3 V − 2,0 V) / 220 Ω = 5,9 mA direkt durch dein Multimeter!'
            : 'Auf dieser Platine steckt gerade ein Defekt — schalte auf V⎓ oder Ω (Platine AUS), um die Ursache zu finden!',
      };
    }

    return {
      displayMain: '0.00',
      displayUnit: dial === 'A10' ? 'A' : 'mA',
      subBadge: 'JUMPER J1 ÖFFNEN',
      tone: 'info',
      beep: false,
      ledLitByCircuit,
      ledGlowByDiodeTest: false,
      sparkOnBoard: false,
      explanationTitle: 'Für echte Strommessung: Jumper J1 öffnen & Spitzen an J1-A / J1-B!',
      explanationBody:
        jumperJ1Closed
          ? 'Klicke auf der Platine auf den grünen Jumper „J1“, um den LED-Stromkreis aufzutrennen, und setze dann Rot auf J1-A und Schwarz auf J1-B!'
          : 'Jumper J1 ist offen! Setze jetzt die rote Spitze auf J1-A und die schwarze Spitze auf J1-B, um den Kreis über das Multimeter zu schließen.',
    };
  }

  return {
    displayMain: '0.00',
    displayUnit: '',
    subBadge: 'READY',
    tone: 'info',
    beep: false,
    ledLitByCircuit,
    ledGlowByDiodeTest: false,
    sparkOnBoard: false,
    explanationTitle: 'Bereit',
    explanationBody: 'Klicke auf einen goldenen Testpunkt auf der Platine.',
  };
}

/**
 * Rendert die interaktive FR-4 Elektronik-Platine als gestochen scharfes, klickbares SVG
 * mit Bauteilen, klickbarem Jumper J1, glimmender/leuchtender LED und gezeichneten Messspitzen!
 */
export function renderInteractiveBoardSvg(opts: {
  redPadId: string;
  blackPadId: string;
  activeProbe: 'red' | 'black';
  circuitPowered: boolean;
  jumperJ1Closed: boolean;
  ledLitByCircuit: boolean;
  ledGlowByDiodeTest: boolean;
  sparkOnBoard: boolean;
}): string {
  const redPad = BOARD_TEST_PADS.find((p) => p.id === opts.redPadId) ?? BOARD_TEST_PADS[1];
  const blackPad = BOARD_TEST_PADS.find((p) => p.id === opts.blackPadId) ?? BOARD_TEST_PADS[2];

  const ledFill = opts.ledLitByCircuit
    ? '#ef4444'
    : opts.ledGlowByDiodeTest
      ? '#f87171'
      : '#450a0a';
  const ledGlowOpacity = opts.ledLitByCircuit ? 0.72 : opts.ledGlowByDiodeTest ? 0.35 : 0;

  return `
    <svg viewBox="0 0 640 356" class="w-full h-auto rounded-xl border border-emerald-500/35 bg-[#0d3b26] select-none shadow-inner" data-mm-board-svg>
      <defs>
        <pattern id="pcbGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
        </pattern>
        <radialGradient id="ledHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff4d4d" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="#ef4444" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- FR-4 Platinen-Hintergrund + Rand + Eck-Schraublöcher -->
      <rect x="0" y="0" width="640" height="356" fill="#0e442c"/>
      <rect x="0" y="0" width="640" height="356" fill="url(#pcbGrid)"/>
      <rect x="10" y="10" width="620" height="336" rx="14" fill="none" stroke="rgba(167,243,208,0.35)" stroke-width="2.5"/>
      ${[
        [26, 26],
        [614, 26],
        [26, 330],
        [614, 330],
      ]
        .map(
          ([cx, cy]) => `
        <circle cx="${cx}" cy="${cy}" r="8" fill="#eab308"/>
        <circle cx="${cx}" cy="${cy}" r="4" fill="#091913"/>
      `,
        )
        .join('')}

      <!-- Titel-Silkscreen -->
      <text x="48" y="34" fill="#a7f3d0" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">
        LEARN-ESP INTERAKTIVE MESS-PLATINE v2.0 • LINKSKLICK = ${opts.activeProbe === 'red' ? '🔴 ROT' : '⚫ SCHWARZ'} • RECHTSKLICK = ⚫ SCHWARZ
      </text>

      <!-- KUPFER-LEITERBAHNEN -->
      <!-- +5V -> F1 -> AMS1117 -> +3,3V -> J1-A -->
      <path d="M 86 78 L 170 78 L 256 78 L 358 78 L 358 148" fill="none" stroke="#22c55e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>
      <!-- J1-B -> R1 -> LED+ -> LED -> GND2 -->
      <path d="M 422 148 L 540 148 L 540 296" fill="none" stroke="#22c55e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>
      <!-- Spannungsteiler R2 & R3: TP2 -> TP8 -> TP3 -->
      <path d="M 256 78 L 256 296" fill="none" stroke="#22c55e" stroke-width="4.5" opacity="0.6"/>
      <!-- Durchgehende GND-Schiene unten: TP3 <-> TP7 -->
      <path d="M 86 296 L 540 296" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
      <text x="315" y="324" text-anchor="middle" fill="#7dd3fc" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">
        ── GEMEINSAME MASSE-SCHIENE (GND = 0,00 V) ──
      </text>

      <!-- BAUTEIL 1: USB 5V Eingang -->
      <rect x="30" y="58" width="38" height="40" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <text x="49" y="82" text-anchor="middle" fill="#0f172a" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="800">USB</text>
      <text x="49" y="112" text-anchor="middle" fill="#fde047" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">5V IN</text>

      <!-- BAUTEIL 2: Glas-Sicherung F1 zwischen TP1 und TP9 -->
      <rect x="108" y="66" width="42" height="24" rx="5" fill="#1e293b" stroke="#eab308" stroke-width="2"/>
      <line x1="116" y1="78" x2="142" y2="78" stroke="#f8fafc" stroke-width="2"/>
      <text x="129" y="58" text-anchor="middle" fill="#fde047" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">F1 (500mA)</text>

      <!-- BAUTEIL 3: 3,3V Regler AMS1117 zwischen TP9 und TP2 -->
      <rect x="192" y="60" width="44" height="36" rx="4" fill="#111827" stroke="#94a3b8" stroke-width="2"/>
      <text x="214" y="81" text-anchor="middle" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700">3.3V</text>
      <text x="214" y="54" text-anchor="middle" fill="#a7f3d0" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">AMS1117</text>

      <!-- BAUTEIL 4: Spannungsteiler R2 (10 kΩ) & R3 (10 kΩ) -->
      <rect x="242" y="116" width="28" height="62" rx="6" fill="#dfb885" stroke="#78350f" stroke-width="1.5"/>
      <rect x="242" y="128" width="28" height="6" fill="#78350f"/>
      <rect x="242" y="139" width="28" height="6" fill="#0f172a"/>
      <rect x="242" y="150" width="28" height="6" fill="#f97316"/>
      <text x="226" y="150" text-anchor="end" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">R2 10kΩ</text>

      <rect x="242" y="232" width="28" height="48" rx="6" fill="#dfb885" stroke="#78350f" stroke-width="1.5"/>
      <rect x="242" y="241" width="28" height="5" fill="#78350f"/>
      <rect x="242" y="250" width="28" height="5" fill="#0f172a"/>
      <rect x="242" y="259" width="28" height="5" fill="#f97316"/>
      <text x="226" y="260" text-anchor="end" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">R3 10kΩ</text>

      <!-- BAUTEIL 5: KLICKBARER JUMPER J1 (Stromkreis auftrennen für Reihen-Strommessung!) -->
      <g data-mm-action="toggle-jumper" class="cursor-pointer">
        <rect x="346" y="110" width="88" height="24" rx="6" fill="${opts.jumperJ1Closed ? '#14532d' : '#7c2d12'}" stroke="${opts.jumperJ1Closed ? '#4ade80' : '#fb923c'}" stroke-width="1.8"/>
        <text x="390" y="126" text-anchor="middle" fill="#ffffff" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="800">
          ${opts.jumperJ1Closed ? 'J1: ZU (Klick)' : 'J1: OFFEN ⚡'}
        </text>
        ${
          opts.jumperJ1Closed
            ? `<rect x="364" y="140" width="52" height="16" rx="4" fill="#22c55e" stroke="#bbf7d0" stroke-width="2"/>`
            : `<line x1="364" y1="148" x2="416" y2="148" stroke="#fb923c" stroke-width="2.5" stroke-dasharray="5 5"/>`
        }
      </g>

      <!-- BAUTEIL 6: Vorwiderstand R1 (220 Ω) zwischen J1-B (TP5) und LED+ (TP6) -->
      <rect x="448" y="134" width="66" height="28" rx="7" fill="#dfb885" stroke="#78350f" stroke-width="1.5"/>
      <rect x="460" y="134" width="7" height="28" fill="#dc2626"/>
      <rect x="472" y="134" width="7" height="28" fill="#dc2626"/>
      <rect x="484" y="134" width="7" height="28" fill="#78350f"/>
      <rect x="498" y="134" width="6" height="28" fill="#eab308"/>
      <text x="481" y="124" text-anchor="middle" fill="#fde047" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">R1 (220 Ω)</text>

      <!-- BAUTEIL 7: Rote 5-mm-LED zwischen TP6 (LED+) und TP7 (GND2) -->
      ${
        ledGlowOpacity > 0
          ? `<circle cx="540" cy="222" r="42" fill="url(#ledHalo)" opacity="${ledGlowOpacity}"/>`
          : ''
      }
      <circle cx="540" cy="222" r="21" fill="${ledFill}" stroke="#fca5a5" stroke-width="2.5"/>
      <circle cx="534" cy="216" r="5" fill="rgba(255,255,255,0.45)"/>
      <text x="572" y="218" fill="#fca5a5" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">LED1</text>
      <text x="572" y="232" fill="#a7f3d0" font-family="JetBrains Mono, monospace" font-size="9.5">
        ${opts.ledLitByCircuit ? 'AN (5,9 mA)' : opts.ledGlowByDiodeTest ? 'GLIMMT!' : 'AUS'}
      </text>

      <!-- KURZSCHLUSS-FUNKEN-EFFEKT -->
      ${
        opts.sparkOnBoard
          ? `<g>
               <circle cx="${redPad.x}" cy="${redPad.y}" r="26" fill="rgba(239,68,68,0.45)"/>
               <text x="${redPad.x}" y="${redPad.y - 22}" text-anchor="middle" fill="#fde047" font-size="18" font-weight="900">⚡ KURZSCHLUSS!</text>
             </g>`
          : ''
      }

      <!-- 9 ANKLICKBARE GOLDENE TEST-PADS -->
      ${BOARD_TEST_PADS.map((p) => {
        const isRed = p.id === opts.redPadId;
        const isBlack = p.id === opts.blackPadId;
        const ringColor = isRed ? '#ef4444' : isBlack ? '#cbd5e1' : 'transparent';
        const labelY = p.y > 250 ? p.y - 18 : p.y + 24;
        return `
          <g data-mm-pad="${p.id}" class="cursor-pointer">
            <circle cx="${p.x}" cy="${p.y}" r="17" fill="transparent"/>
            ${
              isRed || isBlack
                ? `<circle cx="${p.x}" cy="${p.y}" r="14.5" fill="none" stroke="${ringColor}" stroke-width="3" opacity="0.95"/>`
                : ''
            }
            <circle cx="${p.x}" cy="${p.y}" r="10" fill="#eab308" stroke="#fef08a" stroke-width="1.5"/>
            <circle cx="${p.x}" cy="${p.y}" r="4.2" fill="#091913"/>
            <text x="${p.x}" y="${labelY}" text-anchor="middle" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="800">${p.label}</text>
            <title>${p.label}: ${p.name} — ${p.hint}</title>
          </g>
        `;
      }).join('')}

      <!-- GESCHWUNGENE MESSKABEL & MESS-SPITZEN (SCHWARZ & ROT) -->
      <path d="M 625 352 Q ${(blackPad.x + 625) / 2} ${blackPad.y + 70} ${blackPad.x + 14} ${blackPad.y + 18}" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="${blackPad.x + 14}" y1="${blackPad.y + 18}" x2="${blackPad.x + 2}" y2="${blackPad.y + 2}" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${blackPad.x + 14}" cy="${blackPad.y + 18}" r="5" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5"/>

      <path d="M 18 352 Q ${(redPad.x + 18) / 2} ${redPad.y + 70} ${redPad.x - 14} ${redPad.y - 18}" fill="none" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="${redPad.x - 14}" y1="${redPad.y - 18}" x2="${redPad.x - 2}" y2="${redPad.y - 2}" stroke="#fef2f2" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${redPad.x - 14}" cy="${redPad.y - 18}" r="5" fill="#dc2626" stroke="#fecaca" stroke-width="1.5"/>
    </svg>
  `;
}
