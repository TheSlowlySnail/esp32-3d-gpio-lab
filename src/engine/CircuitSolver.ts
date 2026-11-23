import { getEspBoardById } from './BoardCatalog';
import { computeLdrResistance, ESP32_SPECS, formatResistance, LED_SPECS } from './ComponentRegistry';
import type {
  CircuitParameters,
  CircuitWarning,
  LogicLevel,
  SceneExplanation,
  SimulationResult,
} from './types';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isRemoved(params: CircuitParameters, partId: string): boolean {
  return params.removedParts.includes(partId);
}

/**
 * Reine Simulations-Engine (0 % Three.js-Abhängigkeiten).
 * Berechnet alle 16 Elektronik-, ESP32- & WLED-Topologien inkl. Ausfallphysik
 * bei entfernten Bauteilen und dynamischer Live-Erklärung ("Was passiert & warum?").
 */
export class CircuitSolver {
  private capVoltage = 0;
  private lastSolveTime = 0;
  private prevRelayEnergized = false;
  private kickbackStartTime = -10;

  public resetDynamicState(): void {
    this.capVoltage = 0;
    this.prevRelayEnergized = false;
    this.kickbackStartTime = -10;
  }

  public solve(params: CircuitParameters, elapsedSeconds: number): SimulationResult {
    const dt = clamp(elapsedSeconds - this.lastSolveTime, 0, 0.05);
    this.lastSolveTime = elapsedSeconds;

    switch (params.topology) {
      case 'led-resistor':
        return this.solveLedCircuit(params, elapsedSeconds);
      case 'button-pull':
        return this.solveButtonCircuit(params, elapsedSeconds);
      case 'voltage-divider':
        return this.solveVoltageDivider(params, elapsedSeconds);
      case 'pwm-dimmer':
        return this.solvePwmDimmer(params, elapsedSeconds);
      case 'rgb-led':
        return this.solveRgbLed(params, elapsedSeconds);
      case 'rc-lowpass':
        return this.solveRcLowpass(params, elapsedSeconds, dt);
      case 'mosfet-driver':
        return this.solveMosfetDriver(params, elapsedSeconds);
      case 'i2c-bme280':
        return this.solveI2cBme280(params, elapsedSeconds);
      case 'ultrasonic-hcsr04':
        return this.solveUltrasonic(params, elapsedSeconds);
      case 'ld2490-radar':
        return this.solveLd2490Radar(params, elapsedSeconds);
      case 'relay-flyback':
        return this.solveRelayFlyback(params, elapsedSeconds);
      case 'servo-pwm':
        return this.solveServoPwm(params, elapsedSeconds);
      case 'piezo-buzzer':
        return this.solvePiezoBuzzer(params, elapsedSeconds);
      case 'wled-compact':
      case 'wled-medium':
      case 'wled-long-injection':
        return this.solveWled(params, elapsedSeconds);
      case 'pi-traffic-light':
        return this.solvePiTrafficLight(params, elapsedSeconds);
      case 'pi-fan-pwm':
        return this.solvePiFanPwm(params, elapsedSeconds);
      case 'pi-oled-i2c':
        return this.solvePiOledI2c(params, elapsedSeconds);
    }
  }

  private classifyLogicLevel(voltage: number, isFloating = false): LogicLevel {
    if (isFloating) return 'FLOATING';
    if (voltage >= ESP32_SPECS.V_IH) return 'HIGH';
    if (voltage <= ESP32_SPECS.V_IL) return 'LOW';
    return 'UNDEFINED';
  }

  private baseResult(
    params: CircuitParameters,
    elapsedSeconds: number,
    overrides: Partial<SimulationResult>,
  ): SimulationResult {
    return {
      timestamp: elapsedSeconds,
      topology: params.topology,
      boardId: params.boardId,
      probeLabel: 'GPIO',
      probePin: 'GPIO',
      nodeVoltage: 0,
      currentMa: 0,
      powerMw: 0,
      logicLevel: 'LOW',
      extraTitle: 'Status',
      extraDisplay: 'OK',
      extraPercent: 0,
      ledForwardVoltage: 2.0,
      ledVoltageDrop: 0,
      resistorVoltageDrop: 0,
      ledBrightnessPercent: 0,
      isOvercurrent: false,
      isCriticalOvercurrent: false,
      adcRaw: 0,
      adcPercent: 0,
      effectiveR1Ohms: 0,
      effectiveR2Ohms: 0,
      statusLedOn: false,
      rgbHex: '#000000',
      capacitorChargeRatio: 0,
      radarDetected: false,
      radarSignalStrength: 0,
      relayClosed: false,
      kickbackSpikeActive: false,
      servoAngleDeg: params.servoAngleDeg,
      buzzerActive: false,
      wledEndVoltage: 5.0,
      wledVoltageDropRatio: 0,
      wledDataGlitch: false,
      wledEffectiveBrightnessPct: params.wledBrightnessPct,
      wledBatteryRuntimeHours: 0,
      piTrafficLeds: { red: false, yellow: false, green: false },
      piFanSpeedPct: 0,
      piOledLines: [],
      explanation: {
        statusBadge: 'AKTIV',
        statusTone: 'ok',
        whatHappens: 'Schaltung läuft stabil.',
        whyItHappens: 'Alle Bauteile sind korrekt verbunden.',
      },
      warnings: [],
      ...overrides,
    };
  }

  // 01: LED & Vorwiderstand
  private solveLedCircuit(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `GPIO ${board.pins.outA.gpio}`;
    const warnings: CircuitWarning[] = [];
    const ledSpec = LED_SPECS[params.ledColor];
    const vSupply = params.gpioOutputHigh ? params.supplyVoltage : 0;

    const resistorMissing = isRemoved(params, 'resistor');
    const ledMissing = isRemoved(params, 'led');

    if (resistorMissing || ledMissing) {
      const missingName = resistorMissing && ledMissing
        ? 'Vorwiderstand und LED'
        : resistorMissing
          ? 'Vorwiderstand R1'
          : '5mm-LED';

      warnings.push({
        severity: 'warning',
        code: 'OPEN_CIRCUIT',
        title: `Stromkreis unterbrochen (${missingName} entfernt)`,
        message: 'Durch die fehlende Verbindung im Reihenstromkreis fließt kein Strom (I = 0,0 mA). Klicke auf die Lücke oder den Button, um das Bauteil wieder einzustecken.',
      });

      return this.baseResult(params, t, {
        probeLabel: `${pinName} (Offener Kreis)`,
        probePin: pinName,
        nodeVoltage: vSupply,
        currentMa: 0,
        powerMw: 0,
        logicLevel: this.classifyLogicLevel(vSupply),
        extraTitle: 'LED-Helligkeit',
        extraDisplay: '0 % (Unterbrochen)',
        extraPercent: 0,
        ledForwardVoltage: ledSpec.forwardVoltage,
        effectiveR1Ohms: params.resistorOhms,
        statusLedOn: false,
        warnings,
        explanation: {
          statusBadge: 'STROMKREIS OFFEN',
          statusTone: 'warning',
          whatHappens: `${missingName} wurde vom Steckbrett gezogen — es fließt kein Strom (0,0 mA) und die LED bleibt komplett dunkel.`,
          whyItHappens: `In einer Reihenschaltung (GPIO → Widerstand → LED → GND) müssen alle Glieder geschlossen sein. Zwar liegt am ${pinName} weiterhin ${vSupply.toFixed(1).replace('.', ',')} V an, aber ohne geschlossenen Rückweg nach GND können keine Elektronen fließen.`,
        },
      });
    }

    const resistance = Math.max(1, params.resistorOhms);
    let currentA = 0;
    let ledVoltageDrop = 0;
    let resistorVoltageDrop = 0;

    if (vSupply > ledSpec.forwardVoltage) {
      currentA = (vSupply - ledSpec.forwardVoltage) / resistance;
      ledVoltageDrop = ledSpec.forwardVoltage;
      resistorVoltageDrop = vSupply - ledVoltageDrop;
    } else if (vSupply > 0) {
      ledVoltageDrop = vSupply;
    }

    const currentMa = currentA * 1000;
    const powerMw = vSupply * currentMa;
    const rawRatio = clamp(currentMa / ESP32_SPECS.MAX_SAFE_GPIO_MA, 0, 1);
    const ledBrightnessPercent = currentMa <= 0.05 ? 0 : Math.min(100, Math.pow(rawRatio, 0.72) * 100);
    const isOvercurrent = currentMa > ESP32_SPECS.MAX_SAFE_GPIO_MA;
    const isCriticalOvercurrent = currentMa > ESP32_SPECS.ABSOLUTE_MAX_GPIO_MA;

    let explanation: SceneExplanation;
    if (!params.gpioOutputHigh) {
      explanation = {
        statusBadge: 'AUSGANG LOW',
        statusTone: 'info',
        whatHappens: `${pinName} steht auf LOW (0,0 V) — die ${ledSpec.label.split(' ')[0].toLowerCase()}e LED ist ausgeschaltet.`,
        whyItHappens: 'Ohne Spannungsdifferenz zwischen GPIO und GND existiert kein elektrisches Feld, das Ladungsträger durch die LED-Sperrschicht treibt.',
      };
    } else if (isCriticalOvercurrent || isOvercurrent) {
      explanation = {
        statusBadge: isCriticalOvercurrent ? 'KRITISCHE ÜBERLAST' : 'ÜBERSTROM (> 20 mA)',
        statusTone: 'danger',
        whatHappens: `Es fließen ${currentMa.toFixed(1).replace('.', ',')} mA — die LED glüht überlastet und der ${board.shortName}-Pin wird thermisch überbeansprucht!`,
        whyItHappens: `Da nur ${formatResistance(resistance)} vor der LED liegen, ergibt I = (3,3 V − ${ledSpec.forwardVoltage.toFixed(1).replace('.', ',')} V) / ${Math.round(resistance)} Ω einen zu hohen Strom. Ein Vorwiderstand ab ${Math.ceil((3.3 - ledSpec.forwardVoltage) / 0.02)} Ω hält ihn sicher unter 20 mA.`,
      };
    } else {
      explanation = {
        statusBadge: 'SICHERER BETRIEB',
        statusTone: 'ok',
        whatHappens: `Die LED leuchtet stabil mit ${Math.round(ledBrightnessPercent)} % Helligkeit bei ${currentMa.toFixed(1).replace('.', ',')} mA.`,
        whyItHappens: `An der LED fallen ihre Durchlassspannung V_f = ${ledSpec.forwardVoltage.toFixed(1).replace('.', ',')} V ab. Der ${formatResistance(resistance)}-Vorwiderstand übernimmt die übrigen ${resistorVoltageDrop.toFixed(2).replace('.', ',')} V und begrenzt den Strom exakt nach dem Ohmschen Gesetz.`,
      };
    }

    if (isCriticalOvercurrent) {
      warnings.push({
        severity: 'danger',
        code: 'OVERCURRENT_CRITICAL',
        title: 'Kritischer Überstrom (> 40 mA)!',
        message: `Aktuell fließen ${currentMa.toFixed(1).replace('.', ',')} mA. Empfohlen: ≥ ${Math.ceil((params.supplyVoltage - ledSpec.forwardVoltage) / 0.02)} Ω.`,
      });
    } else if (isOvercurrent) {
      warnings.push({
        severity: 'warning',
        code: 'OVERCURRENT_WARNING',
        title: 'Überstrom-Warnung (> 20 mA)',
        message: `Mit ${currentMa.toFixed(1).replace('.', ',')} mA wird der Nennstrom der LED (20 mA) überschritten.`,
      });
    }

    return this.baseResult(params, t, {
      probeLabel: `${pinName} → LED-Anode`,
      probePin: pinName,
      nodeVoltage: vSupply,
      currentMa,
      powerMw,
      logicLevel: this.classifyLogicLevel(vSupply),
      extraTitle: 'LED-Helligkeit',
      extraDisplay: `${Math.round(ledBrightnessPercent)} %`,
      extraPercent: ledBrightnessPercent,
      ledForwardVoltage: ledSpec.forwardVoltage,
      ledVoltageDrop,
      resistorVoltageDrop,
      ledBrightnessPercent,
      isOvercurrent,
      isCriticalOvercurrent,
      effectiveR1Ohms: resistance,
      statusLedOn: params.gpioOutputHigh && ledBrightnessPercent > 1,
      warnings,
      explanation,
    });
  }

  // 02: Taster & Pull-Down / Pull-Up / Floating
  private solveButtonCircuit(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `GPIO ${board.pins.inputA.gpio}`;
    const warnings: CircuitWarning[] = [];
    const vcc = params.supplyVoltage;
    const pullR = Math.max(100, params.pullResistorOhms);

    const pullRemoved = isRemoved(params, 'pull-resistor');
    const buttonRemoved = isRemoved(params, 'button');
    const effectiveMode = pullRemoved ? 'floating' : params.pullMode;
    const effectivePressed = buttonRemoved ? false : params.buttonPressed;

    let nodeVoltage = 0;
    let currentMa = 0;
    let logicLevel: LogicLevel = 'LOW';
    let statusLedOn = false;
    let explanation: SceneExplanation;

    if (effectiveMode === 'pull-down') {
      if (effectivePressed) {
        nodeVoltage = vcc;
        currentMa = (vcc / pullR) * 1000;
        logicLevel = 'HIGH';
        statusLedOn = true;
        explanation = {
          statusBadge: 'GEDRÜCKT (HIGH)',
          statusTone: 'ok',
          whatHappens: `Der Taster verbindet ${pinName} direkt mit 3,3 V — der ESP liest sauber HIGH und die Status-LED leuchtet.`,
          whyItHappens: `Der geschlossene Taster überstimmt den ${formatResistance(pullR)} Pull-Down-Widerstand. Durch den Widerstand fließt dabei nur ein winziger Querstrom von ${currentMa.toFixed(2).replace('.', ',')} mA nach GND.`,
        };
      } else {
        explanation = {
          statusBadge: 'RUHEZUSTAND LOW',
          statusTone: 'ok',
          whatHappens: buttonRemoved
            ? `Der Taster wurde entfernt — ${pinName} bleibt durch den Pull-Down dennoch stabil auf 0,0 V (LOW).`
            : `Taster losgelassen: ${pinName} liegt ruhig auf 0,0 V (LOW), kein Flackern.`,
          whyItHappens: `Der ${formatResistance(pullR)} Pull-Down-Widerstand verbindet den offenen Eingang sanft mit GND und leitet Störladungen zuverlässig ab.`,
        };
      }
    } else if (effectiveMode === 'pull-up') {
      if (effectivePressed) {
        nodeVoltage = 0;
        currentMa = (vcc / pullR) * 1000;
        logicLevel = 'LOW';
        statusLedOn = false;
        explanation = {
          statusBadge: 'ACTIVE-LOW (GEDRÜCKT)',
          statusTone: 'info',
          whatHappens: `Taster gedrückt: Die Spannung an ${pinName} fällt auf 0,0 V (LOW) — genau umgekehrt zum Pull-Down!`,
          whyItHappens: `Im Active-Low-Modus schließt der Taster den Pin direkt nach GND kurz. Der ${formatResistance(pullR)} Pull-Up verhindert dabei einen Kurzschluss der 3,3-V-Schiene.`,
        };
      } else {
        nodeVoltage = vcc;
        logicLevel = 'HIGH';
        statusLedOn = true;
        explanation = {
          statusBadge: 'RUHEZUSTAND HIGH',
          statusTone: 'ok',
          whatHappens: `Taster offen: ${pinName} liegt stabil auf 3,30 V (HIGH) und die Status-LED leuchtet.`,
          whyItHappens: `Der ${formatResistance(pullR)} Pull-Up zieht den hochohmigen Eingang im Ruhezustand fest an 3,3 V, sodass kein Umgebungsrauschen eindringen kann.`,
        };
      }
    } else {
      if (effectivePressed) {
        nodeVoltage = vcc;
        currentMa = 0.001;
        logicLevel = 'HIGH';
        statusLedOn = true;
        explanation = {
          statusBadge: 'GEDRÜCKT (HIGH)',
          statusTone: 'info',
          whatHappens: `Solange der Taster gedrückt bleibt, zwingt er ${pinName} auf 3,30 V — das Rauschen verschwindet kurzzeitig.`,
          whyItHappens: 'Sobald du den Taster loslässt, fehlt der Bezugswiderstand erneut und der Pin schwebt sofort wieder unkontrolliert.',
        };
      } else {
        const amp = Math.max(0.1, params.noiseAmplitude);
        const hum50Hz = Math.sin(2 * Math.PI * 50 * t) * 1.05 * amp;
        const harmonic150 = Math.sin(2 * Math.PI * 150 * t + 0.8) * 0.28 * amp;
        const slowDrift = Math.sin(2 * Math.PI * 1.7 * t) * 0.55 * amp;
        const microBurst = Math.sin(2 * Math.PI * 13.3 * t) * 0.22 * amp;

        nodeVoltage = clamp(1.65 + hum50Hz + harmonic150 + slowDrift + microBurst, 0, vcc);
        logicLevel = 'FLOATING';
        statusLedOn = nodeVoltage >= ESP32_SPECS.V_IH;

        warnings.push({
          severity: 'warning',
          code: 'FLOATING_INPUT',
          title: pullRemoved
            ? 'Pull-Widerstand entfernt → Eingang schwebt (50 Hz Rauschen)!'
            : 'Offener Eingang (Floating) — 50 Hz Störrauschen!',
          message: `Ohne Pull-Widerstand fängt ${pinName} elektromagnetisches 50-Hz-Rauschen auf und löst falsche Schaltimpulse aus.`,
        });

        explanation = {
          statusBadge: 'FLOATING / STÖRRAUSCHEN',
          statusTone: 'warning',
          whatHappens: pullRemoved
            ? `Du hast den Pull-Widerstand entfernt! Sofort schwingt ${pinName} wild im 50-Hz-Takt und die blaue Status-LED flackert zufällig.`
            : `${pinName} schwebt unkontrolliert zwischen 0 V und 3,3 V — das Oszilloskop zeigt starke 50-Hz-Störwellen.`,
          whyItHappens: 'Ein digitaler CMOS-Eingang hat Megaohm-Eingangswiderstand. Ohne festen Pull-Down oder Pull-Up wirkt das offene Kabel wie eine Antenne für Netzbrummen und statische Felder.',
        };
      }
    }

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (Digital Input)`,
      probePin: pinName,
      nodeVoltage,
      currentMa,
      powerMw: vcc * currentMa,
      logicLevel,
      extraTitle: 'GPIO-Status-LED',
      extraDisplay: statusLedOn ? 'EIN (1)' : 'AUS (0)',
      extraPercent: statusLedOn ? 100 : 0,
      effectiveR1Ohms: effectiveMode === 'floating' ? 0 : pullR,
      statusLedOn,
      warnings,
      explanation,
    });
  }

  // 03: Spannungsteiler & ADC
  private solveVoltageDivider(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `GPIO ${board.pins.adc.gpio}`;
    const warnings: CircuitWarning[] = [];
    const vcc = params.supplyVoltage;

    const r1Missing = isRemoved(params, 'r1');
    const r2Missing = isRemoved(params, 'r2');

    const r1 = Math.max(10, params.r1Ohms);
    const r2 =
      params.dividerMode === 'ldr'
        ? computeLdrResistance(params.lightLevelPercent)
        : Math.max(10, params.r2Ohms);

    let idealVout = 0;
    let currentMa = 0;
    let isFloating = false;
    let explanation: SceneExplanation;

    if (r1Missing && r2Missing) {
      idealVout = clamp(1.65 + Math.sin(t * 50) * 0.9, 0, vcc);
      isFloating = true;
      explanation = {
        statusBadge: 'ADC OFFEN (FLOATING)',
        statusTone: 'warning',
        whatHappens: 'Beide Teiler-Widerstände wurden entfernt — der ADC-Pin hängt in der Luft und misst Zufallswerte.',
        whyItHappens: 'Ohne R1 und R2 fehlt jegliche Verbindung zu 3,3 V oder GND. Der hochohmige ADC misst reines Umgebungsrauschen.',
      };
    } else if (r1Missing) {
      idealVout = 0;
      currentMa = 0;
      warnings.push({
        severity: 'warning',
        code: 'R1_REMOVED',
        title: 'Oberer Widerstand R1 entfernt → Ausgang fällt auf 0,00 V!',
        message: 'Ohne R1 fehlt die Verbindung zu +3,3 V. R2 zieht den ADC-Pin komplett auf GND (ADC = 0).',
      });
      explanation = {
        statusBadge: 'R1 FEHLT → 0,00 V',
        statusTone: 'warning',
        whatHappens: `Nach Entfernen von R1 bricht die Messspannung an ${pinName} auf 0,00 V (ADC = 0) zusammen.`,
        whyItHappens: 'Da der obere Pfad zu +3,3 V unterbrochen ist, wirkt der verbleibende untere Widerstand R2 (bzw. LDR) nur noch als Pull-Down nach GND.',
      };
    } else if (r2Missing) {
      idealVout = vcc;
      currentMa = 0;
      warnings.push({
        severity: 'warning',
        code: 'R2_REMOVED',
        title: 'Unteres Bauteil (R2 / LDR) entfernt → Ausgang springt auf 3,30 V!',
        message: 'Ohne unteren Ableitpfad nach GND fließt kein Strom durch R1 — am ADC liegen volle 3,30 V (ADC = 4095) an.',
      });
      explanation = {
        statusBadge: 'R2 FEHLT → 3,30 V',
        statusTone: 'warning',
        whatHappens: `Ohne R2/LDR springt die Spannung am Mittelabgriff sofort auf volle 3,30 V (ADC = 4095) hoch!`,
        whyItHappens: 'Da kein Strom nach GND abfließen kann (I = 0), fällt an R1 nach U = R · I genau 0 V ab — die gesamte Betriebsspannung liegt direkt am ADC-Pin.',
      };
    } else {
      const rTotal = r1 + r2;
      currentMa = (vcc / rTotal) * 1000;
      idealVout = vcc * (r2 / rTotal);
      const ratioPct = Math.round((r2 / rTotal) * 100);
      explanation = {
        statusBadge: params.dividerMode === 'ldr' ? 'LICHTSENSOR AKTIV' : 'TEILER AKTIV',
        statusTone: 'ok',
        whatHappens: `Am Mittelabgriff (${pinName}) liegen ${idealVout.toFixed(2).replace('.', ',')} V an — der 12-Bit-ADC wandelt das in ca. ${Math.round((idealVout / vcc) * 4095)} / 4095 um.`,
        whyItHappens:
          params.dividerMode === 'ldr'
            ? `Bei ${Math.round(params.lightLevelPercent)} % Licht hat der LDR ~${formatResistance(r2)}. Je heller es wird, desto niederohmiger wird der LDR — dadurch sinkt V_out.`
            : `R2 (${formatResistance(r2)}) macht ${ratioPct} % des Gesamtwiderstands (${formatResistance(rTotal)}) aus, daher fallen exakt ${ratioPct} % von 3,3 V am Ausgang ab.`,
      };
    }

    const jitter = isFloating ? 0 : Math.sin(t * 37.3) * 0.004 + Math.sin(t * 113.7) * 0.002;
    const nodeVoltage = clamp(idealVout + jitter, 0, vcc);
    const adcRaw = clamp(Math.round((nodeVoltage / vcc) * ESP32_SPECS.ADC_MAX), 0, ESP32_SPECS.ADC_MAX);
    const adcPercent = (adcRaw / ESP32_SPECS.ADC_MAX) * 100;
    const logicLevel = this.classifyLogicLevel(nodeVoltage, isFloating);

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (12-Bit ADC)`,
      probePin: pinName,
      nodeVoltage,
      currentMa,
      powerMw: vcc * currentMa,
      logicLevel,
      extraTitle: '12-Bit ADC',
      extraDisplay: `${adcRaw} / 4095`,
      extraPercent: adcPercent,
      ledBrightnessPercent: adcPercent,
      adcRaw,
      adcPercent,
      effectiveR1Ohms: r1,
      effectiveR2Ohms: r2,
      statusLedOn: nodeVoltage >= ESP32_SPECS.V_IH,
      warnings,
      explanation,
    });
  }

  // 04: PWM-Dimmer
  private solvePwmDimmer(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `GPIO ${board.pins.outA.gpio}`;
    const vcc = params.supplyVoltage;
    const duty = clamp(params.pwmDutyPercent, 0, 100) / 100;
    const visualFreq = 2.0 + (params.pwmFrequencyHz / 5000) * 10.0;
    const phase = (t * visualFreq) % 1;
    const pulseHigh = duty >= 0.995 ? true : duty <= 0.005 ? false : phase < duty;
    const instantVoltage = pulseHigh ? vcc : 0;

    const resistorMissing = isRemoved(params, 'resistor');
    const peakMa = resistorMissing ? 0 : ((vcc - LED_SPECS.blue.forwardVoltage) / 220) * 1000;
    const avgMa = peakMa * duty;

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (LEDC PWM)`,
      probePin: pinName,
      nodeVoltage: instantVoltage,
      currentMa: avgMa,
      powerMw: vcc * avgMa,
      logicLevel: pulseHigh ? 'HIGH' : 'LOW',
      extraTitle: 'Duty / Ø U',
      extraDisplay: `${Math.round(duty * 100)} % (${(vcc * duty).toFixed(2).replace('.', ',')} V)`,
      extraPercent: duty * 100,
      ledBrightnessPercent: resistorMissing ? 0 : duty * 100,
      effectiveR1Ohms: 220,
      statusLedOn: !resistorMissing && duty > 0.02,
      warnings: resistorMissing
        ? [
            {
              severity: 'warning',
              code: 'PWM_OPEN',
              title: '220-Ω-Vorwiderstand entfernt',
              message: 'Der ESP32 erzeugt zwar weiterhin das PWM-Signal am Pin, aber der Stromkreis zur LED ist unterbrochen.',
            },
          ]
        : [],
      explanation: resistorMissing
        ? {
            statusBadge: 'LED-PFAD OFFEN',
            statusTone: 'warning',
            whatHappens: `Im Oszilloskop läuft das ${Math.round(duty * 100)}-%-PWM-Signal weiter, doch die LED bleibt aus (0 mA).`,
            whyItHappens: 'Durch das Entfernen des 220-Ω-Widerstands wurde die Reihenverbindung zwischen GPIO-Ausgang und LED-Anode getrennt.',
          }
        : {
            statusBadge: `PWM ${Math.round(duty * 100)} %`,
            statusTone: 'ok',
            whatHappens: `Die blaue LED dimmt auf ${Math.round(duty * 100)} % — das Oszilloskop zeigt saubere 3,3-V-Rechteckimpulse.`,
            whyItHappens: `Bei ${Math.round(params.pwmFrequencyHz)} Hz schaltet der LEDC-Timer so schnell zwischen 0 V und 3,3 V, dass das menschliche Auge nur die gemittelte Leistung (Ø ${(vcc * duty).toFixed(2).replace('.', ',')} V) wahrnimmt.`,
          },
    });
  }

  // 05: RGB-LED
  private solveRgbLed(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `G${board.pins.outA.gpio}/G${board.pins.outB.gpio}/G${board.pins.outC.gpio}`;
    const vcc = params.supplyVoltage;

    const rMissing = isRemoved(params, 'r-red');
    const gMissing = isRemoved(params, 'r-green');
    const bMissing = isRemoved(params, 'r-blue');

    const effR = rMissing ? 0 : params.rgbRed;
    const effG = gMissing ? 0 : params.rgbGreen;
    const effB = bMissing ? 0 : params.rgbBlue;

    const rDuty = clamp(effR, 0, 255) / 255;
    const gDuty = clamp(effG, 0, 255) / 255;
    const bDuty = clamp(effB, 0, 255) / 255;

    const totalMa =
      ((vcc - 2.0) / 220) * 1000 * rDuty +
      ((vcc - 2.2) / 220) * 1000 * gDuty +
      ((vcc - 3.0) / 100) * 1000 * bDuty;

    const maxDuty = Math.max(rDuty, gDuty, bDuty);
    const phase = (t * 6.5) % 1;
    const waveV = maxDuty >= 0.99 ? vcc : maxDuty <= 0.01 ? 0 : phase < maxDuty ? vcc : 0;
    const hex = rgbToHex(effR, effG, effB);

    const missingChannels = [
      rMissing ? 'Rot' : null,
      gMissing ? 'Grün' : null,
      bMissing ? 'Blau' : null,
    ].filter(Boolean);

    return this.baseResult(params, t, {
      probeLabel: `RGB PWM (${pinName})`,
      probePin: pinName,
      nodeVoltage: waveV,
      currentMa: totalMa,
      powerMw: vcc * totalMa,
      logicLevel: waveV > 2.48 ? 'HIGH' : 'LOW',
      extraTitle: 'Mischfarbe',
      extraDisplay: hex.toUpperCase(),
      extraPercent: ((rDuty + gDuty + bDuty) / 3) * 100,
      ledBrightnessPercent: maxDuty * 100,
      rgbHex: hex,
      statusLedOn: maxDuty > 0.05,
      warnings:
        missingChannels.length > 0
          ? [
              {
                severity: 'warning',
                code: 'RGB_CHANNEL_MISSING',
                title: `Farbkanal unterbrochen: ${missingChannels.join(', ')}`,
                message: 'Der entsprechende Vorwiderstand fehlt — dieser Farbanteil fällt in der Mischfarbe komplett weg.',
              },
            ]
          : [],
      explanation:
        missingChannels.length > 0
          ? {
              statusBadge: 'KANAL FEHLT',
              statusTone: 'warning',
              whatHappens: `Die RGB-LED zeigt jetzt ${hex.toUpperCase()}, weil der Vorwiderstand für ${missingChannels.join(' & ')} entfernt wurde.`,
              whyItHappens: 'Da jeder der drei LED-Chips in der RGB-LED einen eigenen Vorwiderstand besitzt, schaltet das Ziehen eines Widerstands gezielt nur diese Grundfarbe ab.',
            }
          : {
              statusBadge: 'RGB-MISCHUNG',
              statusTone: 'ok',
              whatHappens: `Alle drei PWM-Kanäle mischen sich additiv zu ${hex.toUpperCase()} bei ${totalMa.toFixed(1).replace('.', ',')} mA Gesamtstrom.`,
              whyItHappens: 'Getrennte Vorwiderstände (220 Ω für R/G, 100 Ω für Blau mit höherer Vf = 3,0 V) sorgen dafür, dass sich die drei Farbchips nicht gegenseitig den Strom abgraben.',
            },
    });
  }

  // 06: RC-Tiefpass
  private solveRcLowpass(params: CircuitParameters, t: number, dt: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `GPIO ${board.pins.adc.gpio}`;
    const vcc = params.supplyVoltage;

    const capMissing = isRemoved(params, 'capacitor');
    const resMissing = isRemoved(params, 'resistor');

    const r = Math.max(100, params.rcResistorOhms);
    const cFarads = Math.max(1, params.rcCapacitorUf) * 1e-6;
    const tauSec = r * cFarads;

    let inputHigh = params.rcInputHigh;
    if (params.rcAutoPulse) {
      const period = Math.max(1.2, Math.min(6.0, tauSec * 4.5));
      inputHigh = (t % period) < period / 2;
    }

    const vTarget = inputHigh ? vcc : 0;
    let currentMa = 0;
    let warnings: CircuitWarning[] = [];
    let explanation: SceneExplanation;

    if (resMissing) {
      // Without charging resistor, capacitor only slowly self-discharges
      this.capVoltage = Math.max(0, this.capVoltage * Math.exp(-dt * 0.4));
      warnings.push({
        severity: 'warning',
        code: 'RC_NO_R',
        title: 'Ladewiderstand R entfernt',
        message: 'Der Kondensator ist vom Treiber-Pin getrennt und kann nicht mehr aufgeladen werden.',
      });
      explanation = {
        statusBadge: 'LADEPFAD UNTERBROCHEN',
        statusTone: 'warning',
        whatHappens: 'Der Kondensator wird nicht mehr aufgeladen — seine Restspannung fällt langsam gegen 0 V ab.',
        whyItHappens: 'Ohne den Serienwiderstand R erreicht der Ladeimpuls des ESP32 den Kondensator nicht mehr.',
      };
    } else if (capMissing) {
      // Without capacitor, signal jumps instantaneously (pure square wave!)
      this.capVoltage = vTarget;
      currentMa = 0;
      warnings.push({
        severity: 'warning',
        code: 'RC_NO_CAP',
        title: 'Kondensator C entfernt → Keine Glättung!',
        message: 'Ohne Kondensator gibt es keine Ladungsspeicherung — das Oszilloskop zeigt wieder harte, steile Rechtecksprünge.',
      });
      explanation = {
        statusBadge: 'KEIN TIEFPASS (C FEHLT)',
        statusTone: 'warning',
        whatHappens: 'Die weiche Ladekurve verschwindet sofort — die Spannung springt schlagartig zwischen 0 V und 3,3 V.',
        whyItHappens: 'Erst der Kondensator speichert Energie im elektrischen Feld und bremst schnelle Spannungsänderungen gemäß τ = R · C ab.',
      };
    } else {
      const safeTau = Math.max(0.03, tauSec);
      const alpha = 1 - Math.exp(-dt / safeTau);
      this.capVoltage += (vTarget - this.capVoltage) * alpha;
      this.capVoltage = clamp(this.capVoltage, 0, vcc);
      currentMa = (Math.abs(vTarget - this.capVoltage) / r) * 1000;
      explanation = {
        statusBadge: `τ = ${tauSec >= 1 ? `${tauSec.toFixed(2).replace('.', ',')} s` : `${(tauSec * 1000).toFixed(0)} ms`}`,
        statusTone: 'ok',
        whatHappens: inputHigh
          ? `Der Kondensator lädt sich entlang einer e-Funktion auf (${Math.round((this.capVoltage / vcc) * 100)} % voll).`
          : `Der Kondensator entlädt sich sanft über R zurück nach GND (${Math.round((this.capVoltage / vcc) * 100)} %).`,
        whyItHappens: `R (${formatResistance(r)}) begrenzt den Ladestrom in C (${Math.round(params.rcCapacitorUf)} µF). Je größer die Ladung im Kondensator, desto kleiner die Restspannung über R — daher flacht die Kurve exponentiell ab.`,
      };
    }

    const chargeRatio = this.capVoltage / vcc;

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (Kondensator U_C)`,
      probePin: pinName,
      nodeVoltage: this.capVoltage,
      currentMa,
      powerMw: Math.abs(vTarget - this.capVoltage) * currentMa,
      logicLevel: this.classifyLogicLevel(this.capVoltage),
      extraTitle: 'Kondensator-Ladung',
      extraDisplay: `${Math.round(chargeRatio * 100)} %`,
      extraPercent: chargeRatio * 100,
      ledBrightnessPercent: chargeRatio * 100,
      capacitorChargeRatio: capMissing ? 0 : chargeRatio,
      effectiveR1Ohms: r,
      statusLedOn: inputHigh,
      warnings,
      explanation,
    });
  }

  // 07: MOSFET Lasttreiber
  private solveMosfetDriver(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `GPIO ${board.pins.outA.gpio}`;
    const pulldownMissing = isRemoved(params, 'gate-pulldown');
    const mosfetMissing = isRemoved(params, 'mosfet');

    const vLoad = params.mosfetLoadVoltage;
    const rLoad = Math.max(5, params.mosfetLoadOhms);
    const warnings: CircuitWarning[] = [];

    if (mosfetMissing) {
      warnings.push({
        severity: 'warning',
        code: 'MOSFET_REMOVED',
        title: 'MOSFET entfernt — Laststromkreis unterbrochen',
        message: 'Die 12V/24V-Last hat keinen Pfad mehr nach GND und bleibt dauerhaft aus.',
      });
      return this.baseResult(params, t, {
        probeLabel: `${pinName} (Gate)`,
        probePin: pinName,
        nodeVoltage: params.mosfetGateHigh ? 3.3 : 0,
        currentMa: 0,
        powerMw: 0,
        logicLevel: params.mosfetGateHigh ? 'HIGH' : 'LOW',
        extraTitle: `Last (${vLoad} V)`,
        extraDisplay: '0 mA (MOSFET fehlt)',
        extraPercent: 0,
        ledBrightnessPercent: 0,
        warnings,
        explanation: {
          statusBadge: 'MOSFET ENTFERNT',
          statusTone: 'warning',
          whatHappens: 'Die Hochstrom-Last bleibt komplett dunkel, obwohl das Gate-Signal geschaltet wird.',
          whyItHappens: 'Als Low-Side-Schalter verbindet der MOSFET die Last mit GND. Ohne ihn ist der Lastkreis offen.',
        },
      });
    }

    if (pulldownMissing && !params.mosfetGateHigh) {
      // Floating Gate oscillation!
      const gateNoise = clamp(1.5 + Math.sin(t * 28) * 1.1 + Math.sin(t * 7) * 0.5, 0, 3.3);
      const halfOn = gateNoise > 1.65;
      const erraticMa = halfOn ? (vLoad / (rLoad + 4)) * 1000 : 0;
      warnings.push({
        severity: 'danger',
        code: 'FLOATING_GATE',
        title: '10 kΩ Gate-Pulldown entfernt — Floating-Gate-Gefahr!',
        message: 'Die hochohmige MOSFET-Gate-Kapazität fängt Störungen ein: Der MOSFET schaltet ungewollt halb durch und überhitzt im Linearbetrieb!',
      });
      return this.baseResult(params, t, {
        probeLabel: `${pinName} (Floating Gate!)`,
        probePin: pinName,
        nodeVoltage: gateNoise,
        currentMa: erraticMa,
        powerMw: vLoad * erraticMa,
        logicLevel: 'FLOATING',
        extraTitle: `Last (${vLoad} V)`,
        extraDisplay: halfOn ? 'UNSTABIL / FLACKERT!' : 'Floating',
        extraPercent: halfOn ? 65 : 10,
        ledBrightnessPercent: halfOn ? 65 : 0,
        statusLedOn: halfOn,
        warnings,
        explanation: {
          statusBadge: 'FLOATING GATE!',
          statusTone: 'danger',
          whatHappens: 'Ohne 10-kΩ-Pulldown schwebt die Gate-Spannung — die Last flackert unkontrolliert, obwohl der Ausgang AUS sein soll!',
          whyItHappens: 'Ein MOSFET-Gate ist wie ein winziger Kondensator isoliert. Ohne Entlade-Widerstand nach GND bleibt Restladung stehen und hält den MOSFET gefährlich halb leitend.',
        },
      });
    }

    const vGate = params.mosfetGateHigh ? params.supplyVoltage : 0;
    const loadCurrentMa = params.mosfetGateHigh ? (vLoad / (rLoad + 0.035)) * 1000 : 0;
    const loadPowerW = (vLoad * loadCurrentMa) / 1000;

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (MOSFET Gate)`,
      probePin: pinName,
      nodeVoltage: vGate,
      currentMa: loadCurrentMa,
      powerMw: loadPowerW * 1000,
      logicLevel: params.mosfetGateHigh ? 'HIGH' : 'LOW',
      extraTitle: `Last (${vLoad} V)`,
      extraDisplay: `${loadCurrentMa.toFixed(0)} mA (${loadPowerW.toFixed(2).replace('.', ',')} W)`,
      extraPercent: params.mosfetGateHigh ? clamp((loadCurrentMa / 1000) * 100, 18, 100) : 0,
      ledBrightnessPercent: params.mosfetGateHigh ? 100 : 0,
      effectiveR1Ohms: 10000,
      statusLedOn: params.mosfetGateHigh,
      warnings,
      explanation: params.mosfetGateHigh
        ? {
            statusBadge: 'LAST AKTIV (LEITEND)',
            statusTone: 'ok',
            whatHappens: `Der MOSFET schaltet ${loadCurrentMa.toFixed(0)} mA (${loadPowerW.toFixed(2).replace('.', ',')} W bei ${vLoad} V) durch — der ESP-Pin liefert selbst nur ~0,33 mA!`,
            whyItHappens: '3,3 V am Gate überschreiten die Schwellspannung V_GS(th) des Logic-Level-MOSFETs, sodass Drain-Source auf nur 35 mΩ durchschaltet.',
          }
        : {
            statusBadge: 'LAST GESPERRT',
            statusTone: 'info',
            whatHappens: 'Gate liegt über den 10-kΩ-Pulldown sauber auf 0 V — der MOSFET sperrt komplett (0 mA).',
            whyItHappens: 'Ohne positive Gate-Source-Spannung bildet sich kein leitender Kanal zwischen Drain und Source.',
          },
    });
  }

  // 08: I2C BME280
  private solveI2cBme280(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `SDA G${board.pins.sda.gpio}`;
    const vcc = params.supplyVoltage;
    const warnings: CircuitWarning[] = [];

    const pullupsActive = params.i2cPullupEnabled && !isRemoved(params, 'i2c-pullups');
    const sensorMissing = isRemoved(params, 'bme280');

    let nodeVoltage = vcc;
    let logicLevel: LogicLevel = 'HIGH';
    let explanation: SceneExplanation;

    if (!pullupsActive) {
      nodeVoltage = clamp(0.45 + Math.sin(t * 25) * 0.25, 0, vcc);
      logicLevel = 'FLOATING';
      warnings.push({
        severity: 'danger',
        code: 'I2C_NO_PULLUP',
        title: 'I²C-Bus blockiert — 4,7 kΩ Pull-Ups fehlen!',
        message: 'I²C nutzt Open-Drain-Treiber: Ohne Pull-Up-Widerstände nach 3,3 V kommen SDA/SCL nie auf HIGH.',
      });
      explanation = {
        statusBadge: 'I²C BUS-FEHLER',
        statusTone: 'danger',
        whatHappens: 'Die SDA-Leitung sackt unter 0,8 V ab — der ESP32 meldet sofort einen I²C-Timeout und empfängt keine Sensordaten.',
        whyItHappens: 'I²C-Chips ziehen Leitungen nur aktiv nach GND (Open-Drain). Erst die 4,7-kΩ-Pull-Ups ziehen sie für eine logische „1“ wieder auf 3,3 V hoch.',
      };
    } else if (sensorMissing) {
      nodeVoltage = vcc;
      logicLevel = 'HIGH';
      warnings.push({
        severity: 'warning',
        code: 'I2C_NACK',
        title: 'BME280 entfernt → I²C NACK (Adresse 0x76 antwortet nicht)',
        message: 'Die Pull-Ups halten den Bus auf 3,3 V, aber kein Slave bestätigt die Adresse 0x76.',
      });
      explanation = {
        statusBadge: 'KEIN SLAVE (NACK)',
        statusTone: 'warning',
        whatHappens: 'Der I²C-Bus steht dauerhaft auf 3,3 V Ruhepegel — der BME280-Sensor antwortet nicht auf Adresse 0x76.',
        whyItHappens: 'Ohne angeschlossenen Sensor zieht niemand während des 9. Taktimpulses (ACK) die SDA-Leitung auf LOW.',
      };
    } else {
      const cycle = t % 0.8;
      if (cycle < 0.18) {
        const bitSlot = Math.floor((cycle / 0.18) * 18);
        const pattern = [0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1];
        nodeVoltage = pattern[bitSlot % pattern.length] ? vcc : 0.08;
      } else {
        nodeVoltage = vcc;
      }
      logicLevel = this.classifyLogicLevel(nodeVoltage);
      explanation = {
        statusBadge: 'I²C 0x76 ONLINE',
        statusTone: 'ok',
        whatHappens: `Der BME280 überträgt zyklisch ${params.bmeTempC.toFixed(1).replace('.', ',')} °C und ${Math.round(params.bmeHumidityPct)} % rH in digitalen Daten-Bursts.`,
        whyItHappens: 'Im Ruhezustand halten die 4,7-kΩ-Pull-Ups SDA & SCL auf 3,3 V. Für jedes 0-Bit zieht der Open-Drain-Treiber die Leitung kurz auf ~0 V herunter.',
      };
    }

    const currentMa = pullupsActive && !sensorMissing ? (nodeVoltage < 1 ? 0.7 : 0.35) : 0.05;

    return this.baseResult(params, t, {
      probeLabel: `${pinName} / SCL G${board.pins.scl.gpio} (I²C 0x76)`,
      probePin: pinName,
      nodeVoltage,
      currentMa,
      powerMw: vcc * currentMa,
      logicLevel,
      extraTitle: 'BME280 Daten',
      extraDisplay: sensorMissing
        ? 'NACK (fehlt)'
        : !pullupsActive
          ? 'Bus blockiert'
          : `${params.bmeTempC.toFixed(1).replace('.', ',')} °C · ${Math.round(params.bmeHumidityPct)} %`,
      extraPercent: sensorMissing || !pullupsActive ? 0 : clamp(((params.bmeTempC + 10) / 60) * 100, 0, 100),
      effectiveR1Ohms: 4700,
      effectiveR2Ohms: 4700,
      statusLedOn: pullupsActive && !sensorMissing && nodeVoltage < 1.5,
      warnings,
      explanation,
    });
  }

  // 09: HC-SR04 Ultraschall
  private solveUltrasonic(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `ECHO G${board.pins.inputA.gpio}`;
    const dividerRemoved = isRemoved(params, 'echo-divider');
    const sensorRemoved = isRemoved(params, 'hcsr04');

    const distCm = clamp(params.ultrasonicDistanceCm, 2, 400);
    const echoMs = (distCm * 58.2) / 1000;
    const period = 0.45;
    const pulseFraction = clamp(distCm / 400, 0.03, 0.72);
    const pulseActive = !sensorRemoved && (t % period) < period * pulseFraction;

    const warnings: CircuitWarning[] = [];
    let nodeVoltage = pulseActive ? 3.3 : 0;
    let explanation: SceneExplanation;

    if (sensorRemoved) {
      warnings.push({
        severity: 'warning',
        code: 'HCSR04_MISSING',
        title: 'HC-SR04 Sensor entfernt',
        message: 'Kein Ultraschall-Echo empfangen (pulseIn Timeout = 0 cm).',
      });
      explanation = {
        statusBadge: 'SENSOR FEHLT',
        statusTone: 'warning',
        whatHappens: 'Auf der ECHO-Leitung kommen keine Impulse mehr an — der ESP32 läuft in den Timeout.',
        whyItHappens: 'Ohne das Ultraschall-Modul wird der Trigger-Impuls nicht ausgesendet und kein Echo generiert.',
      };
    } else if (dividerRemoved) {
      // 5V hits the 3.3V ESP32 pin directly!!
      nodeVoltage = pulseActive ? 3.6 : 0;
      warnings.push({
        severity: 'danger',
        code: 'OVERVOLTAGE_5V',
        title: 'ÜBERSPANNUNG (5,0 V direkt am 3,3 V ESP-Pin)!',
        message: 'Du hast den 2-kΩ-Spannungsteiler entfernt! Der 5-V-ECHO-Ausgang liegt jetzt ungeschützt am 3,3-V-GPIO — langfristiger Pin-Defekt!',
      });
      explanation = {
        statusBadge: '5 V ÜBERSPANNUNG!',
        statusTone: 'danger',
        whatHappens: 'Ohne den 2-kΩ-Widerstand des Spannungsteilers schlagen die vollen 5,0 V des HC-SR04 bis an den 3,3-V-GPIO durch!',
        whyItHappens: 'ESP32-Pins sind NICHT 5-V-tolerant (max. 3,6 V). Die internen ESD-Schutzdioden werden überlastet — stecke den 2-kΩ-Widerstand sofort wieder ein.',
      };
    } else {
      explanation = {
        statusBadge: `${Math.round(distCm)} cm ERKANNT`,
        statusTone: 'ok',
        whatHappens: `Der HC-SR04 liefert alle 450 ms einen ${echoMs.toFixed(2).replace('.', ',')} ms langen Echo-Puls (entspricht ${Math.round(distCm)} cm Abstand).`,
        whyItHappens: 'Der 1 kΩ / 2 kΩ Spannungsteiler reduziert den 5-V-ECHO-Pegel sauber auf 3,33 V. Aus der Laufzeit berechnet der ESP per d = t / 58,2 µs exakt die Distanz.',
      };
    }

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (${dividerRemoved ? 'UNGESCHÜTZT 5V!' : '5V→3,3V Teiler'})`,
      probePin: pinName,
      nodeVoltage,
      currentMa: sensorRemoved ? 0 : pulseActive ? 15.0 : 2.1,
      powerMw: sensorRemoved ? 0 : (pulseActive ? 15.0 : 2.1) * 5.0,
      logicLevel: pulseActive ? 'HIGH' : 'LOW',
      extraTitle: 'Abstand / Echo',
      extraDisplay: sensorRemoved ? 'Kein Echo' : `${Math.round(distCm)} cm (${echoMs.toFixed(2).replace('.', ',')} ms)`,
      extraPercent: sensorRemoved ? 0 : clamp((1 - distCm / 400) * 100, 4, 100),
      ledBrightnessPercent: sensorRemoved ? 0 : clamp((1 - distCm / 400) * 100, 0, 100),
      isOvercurrent: dividerRemoved && pulseActive,
      isCriticalOvercurrent: dividerRemoved && pulseActive,
      effectiveR1Ohms: 1000,
      effectiveR2Ohms: 2000,
      statusLedOn: !sensorRemoved && distCm < 50,
      warnings,
      explanation,
    });
  }

  // 10: LD2490 24 GHz mmWave Präsenz-Radar
  private solveLd2490Radar(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `OUT G${board.pins.inputA.gpio}`;
    const vcc = params.supplyVoltage;

    const radarMissing = isRemoved(params, 'ld2490');
    const outWireMissing = isRemoved(params, 'radar-out-wire');
    const warnings: CircuitWarning[] = [];

    if (radarMissing) {
      const floatingV = clamp(1.5 + Math.sin(t * 50) * 0.8, 0, vcc);
      warnings.push({
        severity: 'warning',
        code: 'LD2490_MISSING',
        title: 'HLK-LD2490 Modul entfernt',
        message: 'Keine 24-GHz-Präsenzdaten per UART oder OUT-Pin. Der offene OUT-Eingang fängt Störrauschen auf.',
      });
      return this.baseResult(params, t, {
        probeLabel: `${pinName} (LD2490 fehlt)`,
        probePin: pinName,
        nodeVoltage: floatingV,
        currentMa: 0,
        powerMw: 0,
        logicLevel: 'FLOATING',
        extraTitle: 'Radar-Energie',
        extraDisplay: 'Modul fehlt',
        extraPercent: 0,
        radarDetected: false,
        radarSignalStrength: 0,
        warnings,
        explanation: {
          statusBadge: 'RADAR ENTFERNT',
          statusTone: 'warning',
          whatHappens: 'Das HLK-LD2490 wurde abgezogen — es werden keine 24-GHz-Wellen mehr ausgesendet und der offene GPIO schwebt.',
          whyItHappens: 'Ohne das aktive Modul empfängt der ESP weder UART-Frames noch ein definiertes HIGH/LOW-Signal am OUT-Pin.',
        },
      });
    }

    const distM = clamp(params.ld2490TargetDistanceM, 0.2, 6.0);
    const thresholdM = clamp(params.ld2490ThresholdM, 0.5, 6.0);
    const detected = params.ld2490TargetPresent && distM <= thresholdM;

    const baseSignal = params.ld2490TargetPresent
      ? clamp((1 - distM / 6.2) * (params.ld2490TargetMoving ? 100 : 72), 8, 100)
      : 4;
    const signalStrength = clamp(baseSignal + (params.ld2490TargetPresent ? Math.sin(t * 2.1) * 3.5 : 0), 0, 100);

    let nodeVoltage = detected ? vcc : 0.02;
    let logicLevel: LogicLevel = detected ? 'HIGH' : 'LOW';
    let explanation: SceneExplanation;

    if (outWireMissing) {
      nodeVoltage = clamp(1.6 + Math.sin(t * 50) * 0.9, 0, vcc);
      logicLevel = 'FLOATING';
      warnings.push({
        severity: 'warning',
        code: 'LD2490_OUT_OPEN',
        title: 'OUT-Signalleitung entfernt!',
        message: 'Der LD2490 erkennt das Ziel intern zwar weiterhin (UART aktiv), aber der digitale OUT-Pin des ESP schwebt (Floating).',
      });
      explanation = {
        statusBadge: 'OUT-LEITUNG OFFEN',
        statusTone: 'warning',
        whatHappens: 'Das Radar erkennt die Person zwar intern weiter (grüne Modul-LED leuchtet), aber am ESP-Eingang kommt nur noch 50-Hz-Rauschen an.',
        whyItHappens: 'Die gekreuzten UART-Leitungen (TX/RX) liefern noch Distanz-Frames, doch der Hardware-Schaltausgang OUT wurde getrennt.',
      };
    } else if (detected) {
      if (params.ld2490TargetMoving) {
        nodeVoltage = clamp(vcc - (Math.sin(t * 95) > 0.85 ? 0.18 : 0), 0, vcc);
      }
      explanation = {
        statusBadge: params.ld2490TargetMoving ? 'BEWEGUNG ERKANNT' : 'ATEM-PRÄSENZ AKTIV',
        statusTone: 'ok',
        whatHappens: params.ld2490TargetMoving
          ? `LD2490 meldet Bewegung in ${distM.toFixed(1).replace('.', ',')} m (Energie ${Math.round(signalStrength)} %) → OUT = HIGH (3,3 V).`
          : `Obwohl das Ziel völlig still sitzt (${distM.toFixed(1).replace('.', ',')} m), hält der LD2490 OUT stabil auf HIGH!`,
        whyItHappens: 'Die 24-GHz-Millimeterwellen (λ ≈ 12,5 mm) registrieren über den Doppler-Effekt selbst minimale Brustkorb-Atembewegungen — anders als träge PIR-Sensoren.',
      };
    } else {
      explanation = {
        statusBadge: 'KEINE PRÄSENZ',
        statusTone: 'info',
        whatHappens: params.ld2490TargetPresent
          ? `Ziel bei ${distM.toFixed(1).replace('.', ',')} m liegt außerhalb des Gate-Limits (${thresholdM.toFixed(1).replace('.', ',')} m) — OUT bleibt LOW.`
          : 'Raum ist leer — die 24-GHz-Reflexionsenergie liegt unter der Schwelle, OUT = LOW (0 V).',
        whyItHappens: 'Über konfigurierbare Entfernungs-Gates blendet der LD2490 gezielt Personen hinter Wänden oder in Nachbarräumen aus.',
      };
    }

    const currentMa = detected ? 82.0 : 68.0;

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (LD2490 OUT + UART)`,
      probePin: pinName,
      nodeVoltage,
      currentMa,
      powerMw: currentMa * 5.0,
      logicLevel,
      extraTitle: 'Radar-Energie',
      extraDisplay: detected ? `${distM.toFixed(1).replace('.', ',')} m · ${Math.round(signalStrength)} %` : 'Keine Präsenz',
      extraPercent: signalStrength,
      ledBrightnessPercent: !outWireMissing && detected ? 100 : 0,
      radarDetected: detected,
      radarSignalStrength: signalStrength,
      statusLedOn: !outWireMissing && detected,
      warnings,
      explanation,
    });
  }

  // 11: Relais & Freilaufdiode
  private solveRelayFlyback(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const warnings: CircuitWarning[] = [];
    const diodeActive = params.relayFlybackDiode && !isRemoved(params, 'flyback-diode');

    if (this.prevRelayEnergized && !params.relayEnergized && !diodeActive) {
      this.kickbackStartTime = t;
    }
    this.prevRelayEnergized = params.relayEnergized;

    const spikeElapsed = t - this.kickbackStartTime;
    const kickbackSpikeActive = !diodeActive && spikeElapsed >= 0 && spikeElapsed < 0.55;

    let nodeVoltage = params.relayEnergized ? params.supplyVoltage : 0;
    if (kickbackSpikeActive) {
      const decay = Math.exp(-spikeElapsed * 8.0);
      nodeVoltage = clamp(3.58 * decay * (0.7 + 0.3 * Math.cos(spikeElapsed * 85)), 0, 3.6);
    }

    if (!diodeActive) {
      warnings.push({
        severity: 'danger',
        code: 'NO_FLYBACK_DIODE',
        title: kickbackSpikeActive ? 'INDUKTIVE SPANNUNGSSPITZE!' : 'Freilaufdiode 1N4007 entfernt!',
        message: 'Beim Abschalten der Spule entsteht ohne 1N4007 eine hohe Gegenspannung (U = −L·dI/dt), die den Transistor zerstören kann.',
      });
    }

    const coilMa = params.relayEnergized ? 71.4 : 0;

    return this.baseResult(params, t, {
      probeLabel: `Spule / G${board.pins.outA.gpio}`,
      probePin: `GPIO ${board.pins.outA.gpio}`,
      nodeVoltage,
      currentMa: coilMa,
      powerMw: coilMa * 5.0,
      logicLevel: params.relayEnergized ? 'HIGH' : 'LOW',
      extraTitle: 'Relais-Kontakt',
      extraDisplay: params.relayEnergized ? 'ANZUG (NO zu)' : 'RUHE (NC zu)',
      extraPercent: params.relayEnergized ? 100 : 0,
      ledBrightnessPercent: params.relayEnergized ? 100 : 0,
      relayClosed: params.relayEnergized,
      kickbackSpikeActive,
      effectiveR1Ohms: 1000,
      statusLedOn: params.relayEnergized,
      warnings,
      explanation: kickbackSpikeActive
        ? {
            statusBadge: 'KICKBACK-SPIKE!',
            statusTone: 'danger',
            whatHappens: 'ROTER FUNKEN-ALARM! Beim Abschalten schlägt ein heftiger induktiver Spannungsimpuls im Oszilloskop aus!',
            whyItHappens: 'Das zusammenbrechende Magnetfeld der Relaisspule will den Strom aufrechterhalten und erzeugt ohne 1N4007-Freilaufdiode eine zerstörerische Spannungsspitze.',
          }
        : !diodeActive
          ? {
              statusBadge: 'UNGESCHÜTZT (OHNE 1N4007)',
              statusTone: 'warning',
              whatHappens: 'Die 1N4007-Freilaufdiode wurde entfernt. Schalte das Relais jetzt AUS, um den Induktions-Spike live auszulösen!',
              whyItHappens: 'Im eingeschalteten Zustand speichert die Spule magnetische Energie — gefährlich wird es genau im Moment des Abschaltens.',
            }
          : {
              statusBadge: params.relayEnergized ? 'RELAIS ANGEZOGEN' : 'RELAIS SICHER AUS',
              statusTone: 'ok',
              whatHappens: params.relayEnergized
                ? 'Durch die 5-V-Spule fließen 71,4 mA — der Elektromagnet schließt den Arbeitskontakt (NO).'
                : 'Relais sauber abgefallen — die 1N4007-Freilaufdiode hat die magnetische Restenergie lautlos abgebaut.',
              whyItHappens: 'Die antiparallel geschaltete 1N4007 sperrt im Normalbetrieb, wird beim Abschalten aber leitend und begrenzt die Gegenspannung auf harmlose 0,7 V.',
            },
    });
  }

  // 12: SG90 Servo
  private solveServoPwm(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `GPIO ${board.pins.outA.gpio}`;
    const signalRemoved = isRemoved(params, 'servo-signal');
    const angle = clamp(params.servoAngleDeg, 0, 180);
    const pulseMs = 0.5 + (angle / 180) * 2.0;
    const dutyDisplay = 0.08 + (angle / 180) * 0.42;
    const pulseHigh = !signalRemoved && (t * 4.5) % 1 < dutyDisplay;

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (50 Hz Servo PWM)`,
      probePin: pinName,
      nodeVoltage: pulseHigh ? 3.3 : 0,
      currentMa: signalRemoved ? 12 : 42,
      powerMw: (signalRemoved ? 12 : 42) * 5.0,
      logicLevel: pulseHigh ? 'HIGH' : 'LOW',
      extraTitle: 'Winkel / Puls',
      extraDisplay: signalRemoved ? 'Kein Signal' : `${Math.round(angle)}° (${pulseMs.toFixed(2).replace('.', ',')} ms)`,
      extraPercent: (angle / 180) * 100,
      servoAngleDeg: signalRemoved ? 90 : angle,
      statusLedOn: pulseHigh,
      warnings: signalRemoved
        ? [
            {
              severity: 'warning',
              code: 'SERVO_NO_SIGNAL',
              title: 'Orange PWM-Steuerleitung entfernt',
              message: 'Der Servo hat zwar 5 V Spannung, erhält aber keine 50-Hz-Positionspulse mehr und bleibt stehen.',
            },
          ]
        : [],
      explanation: signalRemoved
        ? {
            statusBadge: 'STEUERLEITUNG OFFEN',
            statusTone: 'warning',
            whatHappens: 'Der Servo reagiert nicht mehr auf den Winkel-Regler — im Oszilloskop liegt 0 V an.',
            whyItHappens: 'Ohne das 50-Hz-PWM-Signal am orangen Kabel kennt der interne Servoregler keine neue Sollposition.',
          }
        : {
            statusBadge: `SERVO ${Math.round(angle)}°`,
            statusTone: 'ok',
            whatHappens: `Der 3D-Servo-Arm fährt präzise auf ${Math.round(angle)}° — jeder 50-Hz-Puls ist exakt ${pulseMs.toFixed(2).replace('.', ',')} ms breit.`,
            whyItHappens: 'Ein internes Potentiometer misst die reale Armposition und der Regelkreis dreht den Motor, bis Ist- und Soll-Pulsbreite übereinstimmen.',
          },
    });
  }

  // 13: Piezo-Buzzer
  private solvePiezoBuzzer(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `GPIO ${board.pins.outA.gpio}`;
    const resRemoved = isRemoved(params, 'resistor');
    const freq = clamp(params.buzzerFrequencyHz, 200, 4000);
    const active = params.buzzerEnabled && !resRemoved;
    const visualFreq = 3 + ((freq - 200) / 3800) * 26;
    const high = params.buzzerEnabled ? Math.sin(2 * Math.PI * visualFreq * t) >= 0 : false;

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (Piezo Ton-PWM)`,
      probePin: pinName,
      nodeVoltage: high ? 3.3 : 0,
      currentMa: active ? 8.5 : 0,
      powerMw: active ? 8.5 * 3.3 : 0,
      logicLevel: high ? 'HIGH' : 'LOW',
      extraTitle: 'Tonfrequenz',
      extraDisplay: resRemoved ? 'Stumm (R fehlt)' : params.buzzerEnabled ? `${Math.round(freq)} Hz` : 'Stumm',
      extraPercent: active ? clamp(((freq - 200) / 3800) * 100, 8, 100) : 0,
      buzzerActive: active,
      effectiveR1Ohms: 100,
      statusLedOn: active,
      warnings: resRemoved
        ? [
            {
              severity: 'warning',
              code: 'BUZZER_OPEN',
              title: '100-Ω-Schutzwiderstand entfernt',
              message: 'Die Verbindung zum Piezo ist unterbrochen — es ertönt kein Ton.',
            },
          ]
        : [],
      explanation: resRemoved
        ? {
            statusBadge: 'PIEZO GETRENNT',
            statusTone: 'warning',
            whatHappens: 'Der Piezo bleibt stumm, obwohl das Rechtecksignal am GPIO anliegt.',
            whyItHappens: 'Der 100-Ω-Serienwiderstand schützt den GPIO vor kapazitiven Umladeströmen — entfernt man ihn, ist die Zuleitung unterbrochen.',
          }
        : params.buzzerEnabled
          ? {
              statusBadge: `${Math.round(freq)} Hz TON`,
              statusTone: 'ok',
              whatHappens: `Die Piezo-Membran schwingt ${Math.round(freq)}-mal pro Sekunde (Periodendauer ${(1000 / freq).toFixed(2).replace('.', ',')} ms).`,
              whyItHappens: 'Durch den inversen piezoelektrischen Effekt verformt sich der Kristall bei jedem 3,3-V-Impuls und strahlt Schallwellen ab.',
            }
          : {
              statusBadge: 'STUMM',
              statusTone: 'info',
              whatHappens: 'Der Ausgang liegt ruhig auf 0 V — der Piezo erzeugt keinen Schall.',
              whyItHappens: 'Ein passiver Piezo benötigt eine kontinuierliche Wechsel- bzw. Rechteckfrequenz, um zu schwingen.',
            },
    });
  }

  // 14–16: WLED WS2812B LED-Streifen in verschiedenen Längen!
  private solveWled(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `DATA G${board.pins.outA.gpio}`;
    const vcc = params.supplyVoltage;

    const ledCount = clamp(Math.round(params.wledLedCount), 8, 300);
    const brightness = clamp(params.wledBrightnessPct, 0, 100) / 100;

    const dataResistorRemoved = isRemoved(params, 'data-resistor');
    const bufferCapRemoved = isRemoved(params, 'buffer-cap');
    const levelShifterRemoved = isRemoved(params, 'level-shifter');
    const injectionRemoved = isRemoved(params, 'power-injection');
    const powerRemoved = isRemoved(params, 'meanwell-power');

    if (powerRemoved) {
      return this.baseResult(params, t, {
        probeLabel: `${pinName} (5V Versorgung fehlt)`,
        probePin: pinName,
        nodeVoltage: 0,
        currentMa: 0,
        powerMw: 0,
        logicLevel: 'LOW',
        extraTitle: 'Ende-Spannung (5 V)',
        extraDisplay: '0,00 V (Kein Strom)',
        extraPercent: 0,
        wledEndVoltage: 0,
        wledVoltageDropRatio: 0,
        wledDataGlitch: false,
        wledEffectiveBrightnessPct: 0,
        wledBatteryRuntimeHours: 0,
        statusLedOn: false,
        warnings: [
          {
            severity: 'danger',
            code: 'WLED_NO_POWER',
            title: 'Mean Well 5V-Versorgung / Akku getrennt!',
            message: 'Ohne das Mean Well Netzteil / Akku-Pack erhalten WLED-Streifen und 5V-Schiene keine Leistung (0,00 V).',
          },
        ],
        explanation: {
          statusBadge: 'KEINE 5V-VERSORGUNG',
          statusTone: 'danger',
          whatHappens: 'Der komplette WLED-Streifen ist aus (0,0 mA), weil die Mean Well 5V-Quelle abgeklemmt wurde.',
          whyItHappens: 'Adressierbare LED-Streifen ziehen schnell mehrere Ampere — sie benötigen eine eigene stabile 5-V-Quelle (Mean Well Netzteil oder Mean Well Akku-USV) mit gemeinsamer Masse (GND) zum ESP32.',
        },
      });
    }

    const hasInjection =
      params.topology === 'wled-long-injection' && params.wledPowerInjection && !injectionRemoved;
    const hasLevelShifter =
      params.topology !== 'wled-compact' && !levelShifterRemoved;

    // Mean Well Battery Pack vs PSU source voltage (Li-Ion/LiFePO4 regulated 5V DC-DC with slight droop at low SoC)
    const isBattery = params.wledPowerSource === 'meanwell-battery';
    const socFactor = clamp(params.wledBatterySocPct, 5, 100) / 100;
    const sourceVoltage = isBattery ? (socFactor < 0.2 ? 4.75 : 5.0) : 5.02;

    // Average per-LED current at 100% brightness depending on WLED effect
    const maPerLedByEffect: Record<CircuitParameters['wledEffect'], number> = {
      'solid-white': 58,
      rainbow: 36,
      fire: 28,
      breathe: 24,
      chase: 16,
    };
    const rawCurrentMa = ledCount * maPerLedByEffect[params.wledEffect] * brightness;
    const limitMa = Math.max(300, params.wledCurrentLimitMa);
    const limitScale = rawCurrentMa > limitMa ? limitMa / rawCurrentMa : 1;
    const actualCurrentMa = rawCurrentMa * limitScale;
    const effectiveBrightnessPct = Math.round(brightness * limitScale * 100);
    const powerW = (sourceVoltage * actualCurrentMa) / 1000;

    // Estimated battery runtime in hours (accounting for ~88% DC-DC efficiency + 120 mA ESP32 draw)
    const totalDrawMa = actualCurrentMa + 120;
    const usableMah = params.wledBatteryCapacityMah * socFactor * 0.88;
    const runtimeHours = totalDrawMa > 10 ? usableMah / totalDrawMa : 99;

    // Realistic copper foil voltage drop along 5V WS2812B strip!
    // ~0.0042 Ohm/LED (~0.75 Ohm @ 180 LEDs, ~1.25 Ohm @ 300 LEDs).
    // Dual-end Power Injection slashes peak drop drastically (~0.12x factor), keeping voltage > 4.4V!
    const stripResistance = ledCount * 0.0042;
    const effectivePathFactor = hasInjection ? 0.12 : 1.0;
    const voltageDropV = (actualCurrentMa / 1000) * (stripResistance * 0.5) * effectivePathFactor;
    const endVoltage = clamp(sourceVoltage - voltageDropV, 2.0, 5.1);
    // Below ~4.25 V blue channel starts starving -> visible yellow/red shift!
    const voltageDropRatio = clamp((4.25 - endVoltage) / 1.75, 0, 1);

    const dataGlitch = dataResistorRemoved || (params.topology !== 'wled-compact' && levelShifterRemoved);

    // 800 kHz NRZ WS2812B frame burst visualized cleanly on oscilloscope
    const framePeriod = 0.25;
    const inBurst = (t % framePeriod) < 0.09;
    let scopeVoltage = 0;
    if (inBurst && brightness > 0) {
      const bit = Math.sin(t * 280) > 0 ? 1 : 0;
      const ringing = dataResistorRemoved ? Math.sin(t * 900) * 0.42 : 0;
      const weakLevel = !hasLevelShifter && params.topology !== 'wled-compact' ? 2.15 : vcc;
      scopeVoltage = clamp((bit ? weakLevel : 0.1) + ringing, 0, 3.6);
    } else if (bufferCapRemoved && actualCurrentMa > 400) {
      // Supply ripple visible when 1000uF cap is missing
      scopeVoltage = clamp(0.18 + Math.sin(t * 120) * 0.16, 0, 3.6);
    }

    const warnings: CircuitWarning[] = [];

    if (dataResistorRemoved) {
      warnings.push({
        severity: 'warning',
        code: 'WLED_NO_DATA_R',
        title: '330 Ω Datenwiderstand entfernt → Signalreflexionen & Glitches!',
        message: 'Ohne Serienwiderstand entstehen Überschwinger (Ringing) auf der 800-kHz-Datenleitung und die erste WS2812B-LED ist ungeschützt.',
      });
    }
    if (params.topology !== 'wled-compact' && levelShifterRemoved) {
      warnings.push({
        severity: 'danger',
        code: 'WLED_NO_SHIFTER',
        title: '74AHCT125 Pegelwandler (3,3 V → 5 V) entfernt!',
        message: 'WS2812B erwartet bei 5 V Versorgung mind. 3,5 V HIGH-Pegel (0,7·VDD). Mit 3,3 V ohne Level-Shifter flackert der lange Streifen!',
      });
    }
    if (bufferCapRemoved) {
      warnings.push({
        severity: 'warning',
        code: 'WLED_NO_CAP',
        title: '1000 µF Stützkondensator entfernt!',
        message: 'Ohne Puffer-Elko brechen schnelle WLED-Helligkeitssprünge die 5-V-Schiene ein (ESP32 Brownout-Reset-Risiko).',
      });
    }
    if (endVoltage < 4.0) {
      warnings.push({
        severity: endVoltage < 3.3 ? 'danger' : 'warning',
        code: 'WLED_VOLTAGE_DROP',
        title: `Spannungsabfall am Streifenende (${endVoltage.toFixed(2).replace('.', ',')} V statt 5,0 V)!`,
        message: 'Die hinteren LEDs verfärben sich sichtbar rötlich/gelblich, weil Blau (3,0 V) unterversorgt ist. Aktiviere Power Injection am Streifenende!',
      });
    } else if (limitScale < 0.98) {
      warnings.push({
        severity: 'info',
        code: 'WLED_LIMITER',
        title: `WLED Strombegrenzer aktiv (${Math.round(limitMa)} mA Limit)`,
        message: `WLED drosselt die Helligkeit automatisch auf ${effectiveBrightnessPct} %, um Netzteil und Kabel vor Überlast (${(rawCurrentMa / 1000).toFixed(1).replace('.', ',')} A) zu schützen.`,
      });
    }

    const lengthMeters = (ledCount / 60).toFixed(2).replace('.', ',');
    let explanation: SceneExplanation;

    if (params.topology !== 'wled-compact' && levelShifterRemoved) {
      explanation = {
        statusBadge: 'PEGELWANDLER FEHLT',
        statusTone: 'danger',
        whatHappens: 'Der LED-Streifen zeigt zufällige Farb-Glitches und Blitze statt eines ruhigen WLED-Effekts!',
        whyItHappens: 'Der ESP gibt nur 3,3 V aus, aber WS2812B bei 5 V verlangt nach Datenblatt ≥ 3,5 V (0,7 × 5 V) für ein sicheres HIGH-Bit. Der 74AHCT125 hebt das Signal sauber auf 5 V an.',
      };
    } else if (dataResistorRemoved) {
      explanation = {
        statusBadge: 'DATEN-GLITCHES (R FEHLT)',
        statusTone: 'warning',
        whatHappens: 'Das 800-kHz-Datensignal schwingt im Oszilloskop über (Ringing) und einzelne LEDs blitzen falsch auf.',
        whyItHappens: 'Der 330–470 Ω Widerstand direkt vor DIN dämpft Leitungsreflexionen und schützt den Daten-Eingang der ersten LED vor Stromspitzen.',
      };
    } else if (endVoltage < 4.0) {
      explanation = {
        statusBadge: `VOLTAGE DROP (${endVoltage.toFixed(1).replace('.', ',')} V)`,
        statusTone: 'warning',
        whatHappens: `Bei ${ledCount} LEDs (~${lengthMeters} m) fällt die Spannung am Streifenende auf ${endVoltage.toFixed(2).replace('.', ',')} V ab — die hinteren 3D-LEDs leuchten sichtbar gelblich-rot!`,
        whyItHappens: 'Die dünnen Kupferbahnen des flexiblen Streifens haben einen merklichen Widerstand. Da blaue LED-Chips ~3,0 V brauchen, rote aber schon bei 2,0 V leuchten, stirbt Blau zuerst weg. Power Injection am Ende löst dies sofort!',
      };
    } else if (bufferCapRemoved) {
      explanation = {
        statusBadge: 'OHNE 1000 µF PUFFER',
        statusTone: 'warning',
        whatHappens: `Der Streifen (${ledCount} LEDs, ${(actualCurrentMa / 1000).toFixed(2).replace('.', ',')} A) erzeugt sichtbare Stör-Ripples auf der Versorgung.`,
        whyItHappens: 'Der 1000-µF-Kondensator parallel zu 5 V / GND fängt plötzliche Stromspitzen der PWM-Treiber ab und verhindert Spannungseinbrüche am ESP32.',
      };
    } else {
      const runtimeText =
        runtimeHours >= 1
          ? `${Math.floor(runtimeHours)}h ${Math.round((runtimeHours % 1) * 60)}m`
          : `${Math.max(1, Math.round(runtimeHours * 60))} min`;
      const powerSourceText = isBattery
        ? `Mean Well Akku-Pack (${Math.round(params.wledBatteryCapacityMah / 1000)} Ah, ${Math.round(params.wledBatterySocPct)} % → ca. ${runtimeText} Laufzeit)`
        : 'Mean Well 5V Netzteil (LRS-Serie)';
      const mountNote = params.withoutBreadboard
        ? ' Direkt aufgebaut ohne Breadboard über WAGO-221-Klemmen.'
        : '';
      explanation = {
        statusBadge: hasInjection ? 'WLED + POWER INJECTION ✓' : `WLED ${ledCount} LEDs AKTIV`,
        statusTone: 'ok',
        whatHappens: `${ledCount} WS2812B-LEDs (~${lengthMeters} m) laufen über ${powerSourceText} bei ${(actualCurrentMa / 1000).toFixed(2).replace('.', ',')} A (${powerW.toFixed(1).replace('.', ',')} W). End-Spannung: ${endVoltage.toFixed(2).replace('.', ',')} V.${mountNote}`,
        whyItHappens: hasInjection
          ? 'Durch die zweite 5-V-/GND-Einspeisung direkt vom Mean-Well-Ausgang ans Streifenende (Power Injection) halbiert sich der Stromweg — alle LEDs bleiben farbtreu.'
          : 'Der Mean-Well-Ausgang speist den 5-V-Laststrom separat am Streifen ein, während der ESP über gemeinsame Masse (GND) das 800-kHz-Datensignal taktet.',
      };
    }

    const runtimeFmt =
      runtimeHours >= 1
        ? `${Math.floor(runtimeHours)}h ${Math.round((runtimeHours % 1) * 60)}m`
        : `${Math.max(1, Math.round(runtimeHours * 60))}m`;

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (WLED 800 kHz DIN)`,
      probePin: pinName,
      nodeVoltage: scopeVoltage,
      currentMa: actualCurrentMa,
      powerMw: powerW * 1000,
      logicLevel: inBurst && scopeVoltage >= ESP32_SPECS.V_IH ? 'HIGH' : 'LOW',
      extraTitle: isBattery ? 'Ende-U / Akku-Laufzeit' : 'Ende-Spannung (5 V)',
      extraDisplay: isBattery
        ? `${endVoltage.toFixed(2).replace('.', ',')} V · ~${runtimeFmt}`
        : `${endVoltage.toFixed(2).replace('.', ',')} V (${ledCount} LEDs)`,
      extraPercent: clamp(((endVoltage - 2.0) / 3.0) * 100, 5, 100),
      isOvercurrent: actualCurrentMa > 4500 && !hasInjection,
      isCriticalOvercurrent: endVoltage < 3.2,
      wledEndVoltage: endVoltage,
      wledVoltageDropRatio: voltageDropRatio,
      wledDataGlitch: dataGlitch,
      wledEffectiveBrightnessPct: effectiveBrightnessPct,
      wledBatteryRuntimeHours: runtimeHours,
      statusLedOn: brightness > 0.02,
      warnings,
      explanation,
    });
  }

  // 17: Raspberry Pi Ampel-Steuerung (3x GPIO Output)
  private solvePiTrafficLight(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const p = board.pins;
    const pinName = `G${p.outA.gpio}/G${p.outB.gpio}/G${p.outC.gpio}`;

    let phase = params.piTrafficPhase;
    if (params.piTrafficAuto) {
      const cycle = t % 8.0;
      if (cycle < 3.0) phase = 'red';
      else if (cycle < 4.2) phase = 'red-yellow';
      else if (cycle < 6.8) phase = 'green';
      else phase = 'yellow';
    }

    const rRem = isRemoved(params, 'r-red');
    const yRem = isRemoved(params, 'r-yellow');
    const gRem = isRemoved(params, 'r-green');

    const wantRed = phase === 'red' || phase === 'red-yellow';
    const wantYellow = phase === 'red-yellow' || phase === 'yellow';
    const wantGreen = phase === 'green';

    const leds = {
      red: wantRed && !rRem,
      yellow: wantYellow && !yRem,
      green: wantGreen && !gRem,
    };

    const iR = leds.red ? ((3.3 - 2.0) / 220) * 1000 : 0;
    const iY = leds.yellow ? ((3.3 - 2.1) / 220) * 1000 : 0;
    const iG = leds.green ? ((3.3 - 2.2) / 220) * 1000 : 0;
    const totalMa = iR + iY + iG;

    const activeCount = (leds.red ? 1 : 0) + (leds.yellow ? 1 : 0) + (leds.green ? 1 : 0);
    const nodeV = activeCount > 0 ? 3.3 : 0;
    const phaseLabel =
      phase === 'red'
        ? 'ROT (Halt)'
        : phase === 'red-yellow'
          ? 'ROT + GELB (Bereit)'
          : phase === 'green'
            ? 'GRÜN (Fahrt)'
            : 'GELB (Achtung)';

    const missing = [rRem ? 'Rot' : null, yRem ? 'Gelb' : null, gRem ? 'Grün' : null].filter(Boolean);
    const warnings: CircuitWarning[] =
      missing.length > 0
        ? [
            {
              severity: 'warning',
              code: 'PI_TRAFFIC_OPEN',
              title: `Ampel-Vorwiderstand entfernt (${missing.join(', ')})`,
              message: 'Die betroffene Ampel-Phase bleibt dunkel, obwohl der Raspberry Pi den GPIO auf HIGH schaltet.',
            },
          ]
        : [];

    return this.baseResult(params, t, {
      probeLabel: `${board.shortName} Ampel (${pinName})`,
      probePin: pinName,
      nodeVoltage: nodeV,
      currentMa: totalMa,
      powerMw: 3.3 * totalMa,
      logicLevel: activeCount > 0 ? 'HIGH' : 'LOW',
      extraTitle: 'Ampel-Phase',
      extraDisplay: phaseLabel,
      extraPercent: phase === 'green' ? 100 : phase === 'red' ? 33 : 66,
      piTrafficLeds: leds,
      statusLedOn: activeCount > 0,
      warnings,
      explanation:
        missing.length > 0
          ? {
              statusBadge: 'AMPEL-AUSFALL',
              statusTone: 'warning',
              whatHappens: `Phase „${phaseLabel}“ aktiv — doch der Kanal ${missing.join(' & ')} fällt wegen fehlendem 220-Ω-Vorwiderstand aus.`,
              whyItHappens: 'Jede der drei Ampel-LEDs besitzt einen eigenen 220-Ω-Strombegrenzer an einem separaten Pi-GPIO (max. 16 mA pro Pin beim Raspberry Pi!).',
            }
          : {
              statusBadge: phaseLabel,
              statusTone: phase === 'green' ? 'ok' : phase === 'red' ? 'danger' : 'warning',
              whatHappens: `Der ${board.shortName} schaltet die Ampel-Phase „${phaseLabel}“ (${totalMa.toFixed(1).replace('.', ',')} mA Gesamtstrom).`,
              whyItHappens: 'Die 40-Pin-GPIO-Leiste arbeitet mit 3,3 V Logik. Drei getrennte 220-Ω-Widerstände halten jeden Kanal bei schonenden ~5–6 mA — weit unter dem 16-mA-Pin-Limit des Raspberry Pi.',
            },
    });
  }

  // 18: Raspberry Pi PWM-Lüftersteuerung (5 V Lüfter + MOSFET)
  private solvePiFanPwm(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `PWM G${board.pins.outA.gpio}`;
    const tempC = clamp(params.piCpuTempC, 35, 85);

    const transistorRemoved = isRemoved(params, 'fan-mosfet');
    const fanRemoved = isRemoved(params, 'pi-fan');

    // Temperature curve: < 45 °C = 0 %, 45..75 °C = 25..100 % linear
    let targetSpeed = params.piFanManualPct;
    if (params.piFanAutoMode) {
      if (tempC < 45) targetSpeed = 0;
      else if (tempC >= 75) targetSpeed = 100;
      else targetSpeed = 25 + ((tempC - 45) / 30) * 75;
    }

    const actualSpeed = transistorRemoved || fanRemoved ? 0 : clamp(targetSpeed, 0, 100);
    const duty = actualSpeed / 100;
    const phase = (t * 6.0) % 1;
    const pulseHigh = duty >= 0.99 ? true : duty <= 0.01 ? false : phase < duty;
    const fanMa = actualSpeed > 0 ? 45 + duty * 165 : 0; // 5V 40mm fan up to ~210 mA

    const warnings: CircuitWarning[] = [];
    if (transistorRemoved) {
      warnings.push({
        severity: 'warning',
        code: 'PI_FAN_NO_DRIVER',
        title: 'N-Kanal MOSFET / Treiber entfernt — Lüfter steht still!',
        message: 'Ein 5-V-Lüfter (~200 mA) darf niemals direkt an einen 3,3-V-Pi-GPIO angeschlossen werden. Ohne Treiber bleibt er aus.',
      });
    } else if (tempC >= 75 && actualSpeed < 40) {
      warnings.push({
        severity: 'danger',
        code: 'PI_OVERHEAT',
        title: `CPU-Überhitzung (${Math.round(tempC)} °C) — Thermal Throttling!`,
        message: 'Bei über 75 °C drosselt der Raspberry Pi seinen Takt. Erhöhe die Lüfter-Drehzahl oder aktiviere die Automatik.',
      });
    }

    return this.baseResult(params, t, {
      probeLabel: `${pinName} (Lüfter PWM)`,
      probePin: pinName,
      nodeVoltage: pulseHigh ? 3.3 : 0,
      currentMa: fanMa,
      powerMw: 5.0 * fanMa,
      logicLevel: pulseHigh ? 'HIGH' : 'LOW',
      extraTitle: 'Lüfter / CPU-Temp',
      extraDisplay: `${Math.round(actualSpeed)} % · ${Math.round(tempC)} °C`,
      extraPercent: actualSpeed,
      piFanSpeedPct: actualSpeed,
      statusLedOn: actualSpeed > 0,
      warnings,
      explanation: transistorRemoved
        ? {
            statusBadge: 'TREIBER FEHLT',
            statusTone: 'warning',
            whatHappens: `Der 5-V-Lüfter dreht sich nicht (0 %), obwohl die CPU ${Math.round(tempC)} °C warm ist.`,
            whyItHappens: 'Der MOSFET trennt die 5-V-Lüfterleistung vom 3,3-V-Steuerpin. Ohne ihn ist der 5-V-Lastkreis unterbrochen.',
          }
        : {
            statusBadge: actualSpeed > 0 ? `LÜFTER ${Math.round(actualSpeed)} %` : 'PASSIV / LEISE',
            statusTone: tempC >= 75 ? 'danger' : actualSpeed > 0 ? 'ok' : 'info',
            whatHappens:
              actualSpeed > 0
                ? `Bei ${Math.round(tempC)} °C CPU-Temperatur regelt der ${board.shortName} den 5-V-Lüfter per PWM auf ${Math.round(actualSpeed)} % (${fanMa.toFixed(0)} mA).`
                : `Bei kühlen ${Math.round(tempC)} °C bleibt der Lüfter komplett aus (0 dB Silent-Modus).`,
            whyItHappens: 'Über Hardware-PWM am MOSFET-Gate wird die 5-V-Versorgung des Lüfters gepulst, sodass die Drehzahl stufenlos der SoC-Temperatur folgt.',
          },
    });
  }

  // 19: Raspberry Pi I2C OLED Display (SSD1306 128x64)
  private solvePiOledI2c(params: CircuitParameters, t: number): SimulationResult {
    const board = getEspBoardById(params.boardId);
    const pinName = `SDA G${board.pins.sda.gpio}`;
    const oledRemoved = isRemoved(params, 'oled-display');
    const sdaRemoved = isRemoved(params, 'i2c-sda');

    const cycle = t % 0.6;
    let nodeV = 3.3;
    let logic: LogicLevel = 'HIGH';

    if (sdaRemoved) {
      nodeV = clamp(0.4 + Math.sin(t * 40) * 0.25, 0, 3.3);
      logic = 'FLOATING';
    } else if (!oledRemoved && cycle < 0.22) {
      const slot = Math.floor((cycle / 0.22) * 16);
      nodeV = [0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0][slot % 16] ? 3.3 : 0.08;
      logic = this.classifyLogicLevel(nodeV);
    }

    const tempSim = (44.2 + Math.sin(t * 0.4) * 1.4).toFixed(1);
    const lines =
      oledRemoved || sdaRemoved
        ? []
        : params.piOledPage === 'system'
          ? [
              `${board.shortName.toUpperCase()}`,
              `CPU: ${tempSim} C  LOAD 18%`,
              `RAM: 1.4 / 8.0 GB`,
              `I2C 0x3C  OK`,
            ]
          : params.piOledPage === 'network'
            ? [
                'WLAN0 CONNECTED',
                'IP: 192.168.178.42',
                'RSSI: -54 dBm',
                'SSH: ACTIVE :22',
              ]
            : [
                'GPIO MONITOR 3.3V',
                `SDA: G${board.pins.sda.gpio}  SCL: G${board.pins.scl.gpio}`,
                'BUS: 400 kHz FAST',
                `CONTRAST: ${Math.round(params.piOledContrastPct)}%`,
              ];

    const currentMa = oledRemoved ? 0 : 8 + (params.piOledContrastPct / 100) * 14;
    const warnings: CircuitWarning[] = [];
    if (sdaRemoved) {
      warnings.push({
        severity: 'danger',
        code: 'OLED_SDA_OPEN',
        title: 'I²C SDA-Datenleitung entfernt!',
        message: 'Das SSD1306-OLED erhält keine Pixel-Frames mehr (Remote I/O Error 121 auf Adresse 0x3C).',
      });
    } else if (oledRemoved) {
      warnings.push({
        severity: 'warning',
        code: 'OLED_REMOVED',
        title: 'SSD1306 OLED-Display entfernt',
        message: 'i2cdetect findet kein Gerät an Adresse 0x3C.',
      });
    }

    return this.baseResult(params, t, {
      probeLabel: `${pinName} / SCL G${board.pins.scl.gpio} (OLED 0x3C)`,
      probePin: pinName,
      nodeVoltage: nodeV,
      currentMa,
      powerMw: 3.3 * currentMa,
      logicLevel: logic,
      extraTitle: 'OLED 128×64 (0x3C)',
      extraDisplay: oledRemoved || sdaRemoved ? 'Offline' : `Aktiv (${Math.round(params.piOledContrastPct)} %)`,
      extraPercent: oledRemoved || sdaRemoved ? 0 : params.piOledContrastPct,
      piOledLines: lines,
      statusLedOn: !oledRemoved && !sdaRemoved,
      warnings,
      explanation:
        sdaRemoved || oledRemoved
          ? {
              statusBadge: 'I²C 0x3C OFFLINE',
              statusTone: 'danger',
              whatHappens: 'Der kleine OLED-Bildschirm bleibt schwarz — der Raspberry Pi meldet einen I²C-Kommunikationsfehler.',
              whyItHappens: 'Ohne intakte SDA-Datenleitung (und das OLED-Modul an Adresse 0x3C) kann Python per `luma.oled` keinen Framebuffer übertragen.',
            }
          : {
              statusBadge: 'OLED 0x3C ONLINE',
              statusTone: 'ok',
              whatHappens: `Das 0,96"-SSD1306-OLED zeigt live „${params.piOledPage.toUpperCase()}“-Daten mit ${Math.round(params.piOledContrastPct)} % Kontrast bei nur ${currentMa.toFixed(1).replace('.', ',')} mA.`,
              whyItHappens: 'Jedes Pixel des OLEDs leuchtet selbstständig (keine Hintergrundbeleuchtung nötig). Der Raspberry Pi überträgt die Bilddaten über nur 2 I²C-Leitungen (SDA/SCL). Tipp: Dunkle den Raum ab, um den Kontrast zu sehen!',
            },
    });
  }
}
