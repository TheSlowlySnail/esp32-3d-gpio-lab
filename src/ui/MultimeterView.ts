import {
  BOARD_FAULT_SCENARIOS,
  BOARD_TEST_PADS,
  evaluateInteractiveBoard,
  renderInteractiveBoardSvg,
  type BoardFaultId,
} from './MultimeterBoard';

/**
 * Interaktive Rubrik "📟 Multimeter":
 * - Modus 1 (Standard): Interaktive FR-4 Mess-Platine mit 9 frei anklickbaren goldenen Testpunkten
 *   für rote & schwarze Messspitze, klickbarem Jumper J1 (echte Reihen-Strommessung!) & Fehler-Detektiv!
 * - Modus 2: 7 geführte Mess-Stationen + 5 Praxis-Checklisten-Aufgaben
 * - Links immer das virtuelle Digital-Multimeter mit LCD, Drehschalter, 3 Buchsen & Sicherungs-Simulation
 */

type MultimeterTabMode = 'board' | 'stations';
type MeterDialMode = 'OFF' | 'VDC' | 'VAC' | 'OHM' | 'CONT' | 'MA' | 'A10';
type RedJackId = 'V_OHM_MA' | 'A10';
type StationId = 'esp-3v3' | 'resistor-220' | 'cable-good' | 'cable-broken' | 'led-diode' | 'current-led' | 'current-wled';

interface TestStation {
  id: StationId;
  title: string;
  shortLabel: string;
  icon: string;
  category: string;
  recommendedMode: MeterDialMode;
  recommendedJack: RedJackId;
  requiresPowerOff?: boolean;
  isSeriesCircuit?: boolean;
  /** Spannung an den Messpunkten bei eingeschalteter Schaltung */
  voltageDcV: number;
  voltageAcV: number;
  /** Widerstand bei ausgeschalteter Schaltung (Infinity = offen) */
  resistanceOhms: number;
  /** Durchlassspannung im Diodenmodus (Infinity = offen) */
  diodeForwardV?: number;
  /** Fließender Strom im aufgetrennten Reihen-Messpunkt (mA) */
  seriesCurrentMa?: number;
  probePosLabel: string;
  probeNegLabel: string;
  diagramHint: string;
  howToHint: string;
}

const TEST_STATIONS: TestStation[] = [
  {
    id: 'esp-3v3',
    title: 'ESP32 Stromversorgung (3V3 ↔ GND)',
    shortLabel: '🔋 ESP32 3,3 V',
    icon: '🔋',
    category: 'Spannung (Parallel)',
    recommendedMode: 'VDC',
    recommendedJack: 'V_OHM_MA',
    voltageDcV: 3.31,
    voltageAcV: 0,
    resistanceOhms: 4200,
    probePosLabel: 'ESP32 Pin 3V3 (+)',
    probeNegLabel: 'ESP32 Pin GND (−)',
    diagramHint: 'Messspitzen PARALLEL an 3V3 und GND halten — der Stromkreis bleibt geschlossen!',
    howToHint: 'Wahlschalter auf V⎓ (DC), rotes Kabel in Buchse „V Ω mA“, Schaltung EIN.',
  },
  {
    id: 'resistor-220',
    title: 'Vorwiderstand 220 Ω (Rot-Rot-Braun)',
    shortLabel: '🚧 220 Ω Widerstand',
    icon: '🚧',
    category: 'Widerstand (Stromlos!)',
    recommendedMode: 'OHM',
    recommendedJack: 'V_OHM_MA',
    requiresPowerOff: true,
    voltageDcV: 3.3,
    voltageAcV: 0,
    resistanceOhms: 220.4,
    probePosLabel: 'Widerstand Beinchen A',
    probeNegLabel: 'Widerstand Beinchen B',
    diagramHint: 'Widerstand IMMER stromlos (oder ausgebaut) messen — Fremdspannung verfälscht Ω!',
    howToHint: 'Schaltung zuerst auf AUS stellen, dann Wahlschalter auf Ω (Ohm) drehen.',
  },
  {
    id: 'cable-good',
    title: 'Intaktes Jumperkabel / Leiterbahn',
    shortLabel: '🔊 Kabel OK (Piep)',
    icon: '🔊',
    category: 'Durchgangsprüfung',
    recommendedMode: 'CONT',
    recommendedJack: 'V_OHM_MA',
    requiresPowerOff: true,
    voltageDcV: 0,
    voltageAcV: 0,
    resistanceOhms: 0.3,
    probePosLabel: 'Kabelende links',
    probeNegLabel: 'Kabelende rechts',
    diagramHint: 'Unter ~50 Ω ertönt der Piepton („BEEP!“) → Verbindung ist leitend (oder Kurzschluss!).',
    howToHint: 'Schaltung AUS, Wahlschalter auf 🔊 / ►| (Durchgang & Diode).',
  },
  {
    id: 'cable-broken',
    title: 'Defektes Kabel (Kabelbruch)',
    shortLabel: '❌ Kabelbruch (OL)',
    icon: '✂️',
    category: 'Fehlersuche',
    recommendedMode: 'CONT',
    recommendedJack: 'V_OHM_MA',
    requiresPowerOff: true,
    voltageDcV: 0,
    voltageAcV: 0,
    resistanceOhms: Infinity,
    probePosLabel: 'Stecker A',
    probeNegLabel: 'Stecker B (unterbrochen)',
    diagramHint: '„OL“ (Open Loop) bedeutet: unendlicher Widerstand, kein elektrischer Kontakt!',
    howToHint: 'Im 🔊- oder Ω-Modus zeigt ein Kabelbruch „OL“ und piept nicht.',
  },
  {
    id: 'led-diode',
    title: 'Rote 5mm-LED testen (Durchlassspannung)',
    shortLabel: '💡 LED-Test (►|)',
    icon: '💡',
    category: 'Dioden-Test',
    recommendedMode: 'CONT',
    recommendedJack: 'V_OHM_MA',
    requiresPowerOff: true,
    voltageDcV: 0,
    voltageAcV: 0,
    resistanceOhms: Infinity,
    diodeForwardV: 1.98,
    probePosLabel: 'Anode (+ langer Fuß)',
    probeNegLabel: 'Kathode (− flache Seite)',
    diagramHint: 'Rot an Anode (+), Schwarz an Kathode (−) → zeigt Vf ≈ 1,98 V und lässt die LED schwach glimmen! Andersherum: OL.',
    howToHint: 'Schaltung AUS, Wahlschalter auf 🔊 / ►|. Teste auch „Spitzen tauschen“!',
  },
  {
    id: 'current-led',
    title: 'LED-Strom in Reihe messen (14,8 mA)',
    shortLabel: '⚡ Strom mA (Reihe)',
    icon: '⚡',
    category: 'Strom (In Reihe!)',
    recommendedMode: 'MA',
    recommendedJack: 'V_OHM_MA',
    isSeriesCircuit: true,
    voltageDcV: 3.3,
    voltageAcV: 0,
    resistanceOhms: 220,
    seriesCurrentMa: 14.8,
    probePosLabel: 'Vom ESP32 GPIO (+)',
    probeNegLabel: 'Zum 220-Ω-Widerstand → LED',
    diagramHint: 'Stromkreis AUFTRENNEN und Multimeter dazwischenhängen (in Reihe) — der ganze Strom fließt durch das Messgerät!',
    howToHint: 'Schaltung EIN, Wahlschalter auf mA, rotes Kabel in Buchse „V Ω mA“.',
  },
  {
    id: 'current-wled',
    title: 'WLED-Streifen Hochstrom (2,45 A)',
    shortLabel: '🔥 Hochstrom 10A',
    icon: '🌈',
    category: 'Hochstrom (10A-Buchse!)',
    recommendedMode: 'A10',
    recommendedJack: 'A10',
    isSeriesCircuit: true,
    voltageDcV: 5.0,
    voltageAcV: 0,
    resistanceOhms: 2.04,
    seriesCurrentMa: 2450,
    probePosLabel: 'Vom 5V-Netzteil (+)',
    probeNegLabel: 'Zum WS2812B-Streifen (+5V)',
    diagramHint: 'Über 400 mA MUSS das rote Kabel in die „10A“-Buchse! In der mA-Buchse brennt sofort die 400-mA-Sicherung durch!',
    howToHint: 'Rotes Kabel unten in „10A“ umstecken, Wahlschalter auf 10A, Schaltung EIN!',
  },
];

interface MeasurementReading {
  displayMain: string;
  displayUnit: string;
  subBadge: string;
  tone: 'ok' | 'info' | 'warning' | 'danger' | 'off';
  beep: boolean;
  ledGlow: boolean;
  explanationTitle: string;
  explanationBody: string;
  blownFuse?: 'mA' | '10A';
}

interface MissionDef {
  id: string;
  label: string;
  check: (state: {
    stationId: StationId;
    dial: MeterDialMode;
    redJack: RedJackId;
    circuitPowered: boolean;
    probesSwapped: boolean;
    fuseBlown: 'mA' | '10A' | null;
  }) => boolean;
}

const MISSIONS: MissionDef[] = [
  {
    id: 'm-vdc',
    label: 'ESP32-Spannung (3,31 V) korrekt im V⎓-Modus messen',
    check: (s) =>
      s.stationId === 'esp-3v3' &&
      s.dial === 'VDC' &&
      s.redJack === 'V_OHM_MA' &&
      s.circuitPowered &&
      !s.probesSwapped &&
      !s.fuseBlown,
  },
  {
    id: 'm-ohm',
    label: '220-Ω-Widerstand sicher messen (Schaltung AUS + Ω-Modus)',
    check: (s) =>
      s.stationId === 'resistor-220' &&
      s.dial === 'OHM' &&
      s.redJack === 'V_OHM_MA' &&
      !s.circuitPowered &&
      !s.fuseBlown,
  },
  {
    id: 'm-cont',
    label: 'Durchgangsprüfung mit Piepton am intakten Kabel auslösen',
    check: (s) =>
      s.stationId === 'cable-good' &&
      s.dial === 'CONT' &&
      s.redJack === 'V_OHM_MA' &&
      !s.circuitPowered &&
      !s.fuseBlown,
  },
  {
    id: 'm-led',
    label: 'Rote LED im Dioden-Modus (►|) zum Glimmen bringen (1,98 V)',
    check: (s) =>
      s.stationId === 'led-diode' &&
      s.dial === 'CONT' &&
      s.redJack === 'V_OHM_MA' &&
      !s.circuitPowered &&
      !s.probesSwapped &&
      !s.fuseBlown,
  },
  {
    id: 'm-10a',
    label: 'WLED-Strom (2,45 A) sicher über die rote 10A-Buchse messen',
    check: (s) =>
      s.stationId === 'current-wled' &&
      s.dial === 'A10' &&
      s.redJack === 'A10' &&
      s.circuitPowered &&
      !s.fuseBlown,
  },
];

export class MultimeterView {
  private readonly root: HTMLElement;
  private tabMode: MultimeterTabMode = 'board';
  private dial: MeterDialMode = 'VDC';
  private redJack: RedJackId = 'V_OHM_MA';
  private stationId: StationId = 'esp-3v3';
  private circuitPowered = true;
  private probesSwapped = false;
  private soundEnabled = true;
  private fuseBlown: 'mA' | '10A' | null = null;
  private readonly completedMissions = new Set<string>();
  private audioCtx: AudioContext | null = null;

  // Interaktive Mess-Platine State
  private redPadId = 'TP2'; // +3,3V
  private blackPadId = 'TP3'; // GND
  private activeProbe: 'red' | 'black' = 'red';
  private jumperJ1Closed = true;
  private boardFault: BoardFaultId = 'none';
  private detectiveActive = false;
  private detectiveFeedback: { tone: 'ok' | 'danger'; text: string } | null = null;
  private detectiveSolvedCount = 0;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  public render(): void {
    const station = TEST_STATIONS.find((s) => s.id === this.stationId) ?? TEST_STATIONS[0];
    const boardEval = evaluateInteractiveBoard({
      dial: this.dial,
      redJack: this.redJack,
      redPadId: this.redPadId,
      blackPadId: this.blackPadId,
      circuitPowered: this.circuitPowered,
      jumperJ1Closed: this.jumperJ1Closed,
      fault: this.boardFault,
      meterFuseBlown: this.fuseBlown,
    });
    const stationReading = this.computeReading(station);
    const reading: MeasurementReading =
      this.tabMode === 'board'
        ? {
            displayMain: boardEval.displayMain,
            displayUnit: boardEval.displayUnit,
            subBadge: boardEval.subBadge,
            tone: boardEval.tone,
            beep: boardEval.beep,
            ledGlow: boardEval.ledGlowByDiodeTest,
            explanationTitle: boardEval.explanationTitle,
            explanationBody: boardEval.explanationBody,
            blownFuse: boardEval.blownFuse,
          }
        : stationReading;

    if (reading.blownFuse && !this.fuseBlown) {
      this.fuseBlown = reading.blownFuse;
    }

    // Check completed missions (im Stationen-Modus)
    if (this.tabMode === 'stations') {
      for (const m of MISSIONS) {
        if (
          m.check({
            stationId: this.stationId,
            dial: this.dial,
            redJack: this.redJack,
            circuitPowered: this.circuitPowered,
            probesSwapped: this.probesSwapped,
            fuseBlown: this.fuseBlown,
          })
        ) {
          this.completedMissions.add(m.id);
        }
      }
    }

    const doneCount = this.completedMissions.size;
    const redPad = BOARD_TEST_PADS.find((p) => p.id === this.redPadId) ?? BOARD_TEST_PADS[1];
    const blackPad = BOARD_TEST_PADS.find((p) => p.id === this.blackPadId) ?? BOARD_TEST_PADS[2];

    const dialOptions: Array<{ id: MeterDialMode; label: string; sub: string; angleDeg: number }> = [
      { id: 'OFF', label: 'OFF', sub: 'Aus', angleDeg: -120 },
      { id: 'VDC', label: 'V⎓', sub: 'DC Volt', angleDeg: -80 },
      { id: 'VAC', label: 'V~', sub: 'AC Volt', angleDeg: -40 },
      { id: 'OHM', label: 'Ω', sub: 'Ohm', angleDeg: 0 },
      { id: 'CONT', label: '🔊 ►|', sub: 'Piep/Diode', angleDeg: 40 },
      { id: 'MA', label: 'mA', sub: '≤ 400 mA', angleDeg: 80 },
      { id: 'A10', label: '10A', sub: 'Hochstrom', angleDeg: 120 },
    ];
    const currentAngle = dialOptions.find((d) => d.id === this.dial)?.angleDeg ?? 0;

    const toneBannerCls =
      reading.tone === 'danger'
        ? 'bg-red-500/15 border-red-500/50 text-red-300'
        : reading.tone === 'warning'
          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
          : reading.tone === 'ok'
            ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
            : 'bg-cyan-500/12 border-cyan-500/40 text-cyan-200';

    this.root.innerHTML = `
      <div class="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-5">
        <!-- Header mit Modus-Umschalter -->
        <div class="eng-card rounded-2xl border p-5 flex flex-col gap-3.5">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xl">📟</span>
                <h2 class="text-base sm:text-lg font-bold eng-text-main">Interaktives Multimeter-Labor</h2>
                <span class="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/45 text-amber-300">
                  ${this.tabMode === 'board' ? `${this.detectiveSolvedCount} Fehler gefunden` : `${doneCount} / ${MISSIONS.length} Aufgaben gelöst`}
                </span>
              </div>
              <p class="mt-1 text-xs sm:text-[13px] eng-text-muted max-w-3xl">
                Setze die rote &amp; schwarze Messspitze frei auf alle 9 Testpunkte der Platine, öffne Jumper J1 für echte Reihen-Strommessung
                oder spüre versteckte Schaltungsfehler im Fehler-Detektiv auf!
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <button type="button" data-mm-action="toggle-sound" class="eng-btn-neutral px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer">
                ${this.soundEnabled ? '🔊 Piepton: EIN' : '🔇 Piepton: AUS'}
              </button>
              ${
                this.tabMode === 'stations'
                  ? `<button type="button" data-mm-action="auto-setup" class="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer bg-emerald-500/15 border-emerald-500/45 text-emerald-400 hover:bg-emerald-500/25">
                       ✨ Richtig einstellen
                     </button>`
                  : `<button type="button" data-mm-action="start-detective" class="px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-300 hover:bg-fuchsia-500/30">
                       🐛 Zufallsfehler einbauen!
                     </button>`
              }
            </div>
          </div>

          <!-- Modus-Umschalter: Interaktive Mess-Platine vs. 7 Geführte Stationen -->
          <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-500/20">
            <button
              type="button"
              data-mm-tab="board"
              class="px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                this.tabMode === 'board'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.22)]'
                  : 'eng-btn-neutral'
              }"
            >
              🎯 Interaktive Mess-Platine (Spitzen frei setzen &amp; Fehler finden)
            </button>
            <button
              type="button"
              data-mm-tab="stations"
              class="px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                this.tabMode === 'stations'
                  ? 'bg-cyan-500/20 border-cyan-400 eng-text-accent shadow-[0_0_10px_rgba(56,189,248,0.22)]'
                  : 'eng-btn-neutral'
              }"
            >
              📋 7 Geführte Mess-Stationen (${doneCount}/${MISSIONS.length})
            </button>
          </div>
        </div>

        <!-- Haupt-Trainer: Links das virtuelle Multimeter, rechts Messstation + Feedback + Aufgaben -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <!-- LINKER BLOCK: Authentisches gelb-schwarzes Digital-Multimeter -->
          <div class="lg:col-span-5 flex flex-col gap-3">
            <div class="rounded-3xl p-4 sm:p-5 border-4 border-amber-500/80 bg-gradient-to-b from-amber-400/95 via-amber-500/95 to-amber-600/95 shadow-2xl text-slate-950">
              <!-- Geräte-Kopf -->
              <div class="flex items-center justify-between px-1 pb-2.5">
                <div>
                  <div class="text-[10px] font-mono font-black tracking-widest uppercase text-slate-900/75">TRUE RMS • AUTO-RANGE</div>
                  <div class="text-sm font-black tracking-tight text-slate-950">LEARN-ESP DMM-400</div>
                </div>
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-amber-300">CAT III 600V</span>
              </div>

              <!-- LCD-Display -->
              <div class="rounded-xl bg-[#9fb59a] border-4 border-slate-900 p-3.5 shadow-inner relative overflow-hidden">
                <div class="flex items-center justify-between text-[10px] font-mono font-bold text-slate-900/75">
                  <span>${reading.subBadge}</span>
                  <span>${reading.beep ? '🔊 BEEP!' : this.redJack === 'A10' ? 'BUCHSE: 10A' : 'BUCHSE: V Ω mA'}</span>
                </div>
                <div data-mm-lcd class="mt-1 flex items-baseline justify-end gap-2 font-mono font-black text-slate-950 tracking-tight">
                  <span class="text-4xl sm:text-[42px] leading-none tabular-nums">${reading.displayMain}</span>
                  <span class="text-lg font-bold min-w-[2.6rem] text-left">${reading.displayUnit}</span>
                </div>
                ${
                  this.fuseBlown
                    ? `<div class="mt-2 rounded bg-red-700 text-white px-2 py-1 text-[10.5px] font-mono font-bold flex items-center justify-between">
                         <span>⚡ ${this.fuseBlown}-SICHERUNG DURCH!</span>
                         <button type="button" data-mm-action="replace-fuse" class="underline cursor-pointer">Ersetzen</button>
                       </div>`
                    : ''
                }
              </div>

              <!-- Drehschalter + Messbereichs-Tasten -->
              <div class="mt-4 rounded-2xl bg-slate-900 p-3.5 text-slate-100">
                <div class="text-[10px] font-mono uppercase tracking-wider text-slate-400 text-center mb-2.5">
                  Messbereich-Wahlschalter (anklicken)
                </div>

                <!-- Visueller Drehknopf -->
                <div class="flex items-center justify-center mb-3">
                  <div class="relative w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 shadow-inner flex items-center justify-center">
                    <div
                      class="w-16 h-16 rounded-full bg-gradient-to-b from-slate-600 to-slate-800 border-2 border-slate-500 flex items-start justify-center pt-1.5 transition-transform duration-200 shadow-lg"
                      style="transform: rotate(${currentAngle}deg)"
                    >
                      <span class="w-1.5 h-5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></span>
                    </div>
                  </div>
                </div>

                <!-- 7 Bereichs-Buttons -->
                <div class="grid grid-cols-4 gap-1.5">
                  ${dialOptions
                    .map((opt) => {
                      const active = this.dial === opt.id;
                      const cls = active
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-[0_0_10px_rgba(251,191,36,0.45)]'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400/60';
                      return `
                        <button type="button" data-mm-dial="${opt.id}" class="px-1.5 py-1.5 rounded-lg border text-center cursor-pointer transition ${cls}">
                          <div class="text-xs font-mono leading-tight">${opt.label}</div>
                          <div class="text-[9px] opacity-80 leading-tight mt-0.5">${opt.sub}</div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>

              <!-- 3 Echte Messbuchsen unten (10A | COM | V Ω mA) -->
              <div class="mt-4 rounded-2xl bg-slate-900/95 p-3.5 text-slate-100">
                <div class="text-[10px] font-mono uppercase tracking-wider text-slate-400 text-center mb-2.5">
                  Messkabel-Buchsen (rotes Kabel zum Umstecken anklicken!)
                </div>
                <div class="grid grid-cols-3 gap-2 text-center">
                  <!-- 10A Buchse -->
                  <button
                    type="button"
                    data-mm-jack="A10"
                    class="rounded-xl p-2 border transition cursor-pointer flex flex-col items-center gap-1 ${
                      this.redJack === 'A10'
                        ? 'bg-red-500/25 border-red-400 ring-2 ring-red-400/70'
                        : 'bg-slate-800/80 border-slate-700 hover:border-red-400/60'
                    }"
                  >
                    <span class="text-[10px] font-mono font-bold text-red-400">10A MAX</span>
                    <span class="w-9 h-9 rounded-full border-4 border-red-500 flex items-center justify-center ${
                      this.redJack === 'A10' ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-slate-950'
                    }">
                      <span class="w-3 h-3 rounded-full ${this.redJack === 'A10' ? 'bg-white' : 'bg-slate-800'}"></span>
                    </span>
                    <span class="text-[9px] font-mono ${this.redJack === 'A10' ? 'text-red-300 font-bold' : 'text-slate-400'}">
                      ${this.redJack === 'A10' ? '🔴 ROT STECKT' : 'FUSED 10A'}
                    </span>
                  </button>

                  <!-- COM Buchse (immer Schwarz) -->
                  <div class="rounded-xl p-2 border border-slate-600 bg-slate-800/90 flex flex-col items-center gap-1">
                    <span class="text-[10px] font-mono font-bold text-slate-200">COM (−)</span>
                    <span class="w-9 h-9 rounded-full border-4 border-slate-400 bg-slate-950 flex items-center justify-center shadow-inner">
                      <span class="w-3.5 h-3.5 rounded-full bg-slate-500"></span>
                    </span>
                    <span class="text-[9px] font-mono text-slate-300 font-bold">⚫ SCHWARZ</span>
                  </div>

                  <!-- V Ω mA Buchse -->
                  <button
                    type="button"
                    data-mm-jack="V_OHM_MA"
                    class="rounded-xl p-2 border transition cursor-pointer flex flex-col items-center gap-1 ${
                      this.redJack === 'V_OHM_MA'
                        ? 'bg-red-500/25 border-red-400 ring-2 ring-red-400/70'
                        : 'bg-slate-800/80 border-slate-700 hover:border-red-400/60'
                    }"
                  >
                    <span class="text-[10px] font-mono font-bold text-red-400">V Ω mA</span>
                    <span class="w-9 h-9 rounded-full border-4 border-red-500 flex items-center justify-center ${
                      this.redJack === 'V_OHM_MA' ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-slate-950'
                    }">
                      <span class="w-3 h-3 rounded-full ${this.redJack === 'V_OHM_MA' ? 'bg-white' : 'bg-slate-800'}"></span>
                    </span>
                    <span class="text-[9px] font-mono ${this.redJack === 'V_OHM_MA' ? 'text-red-300 font-bold' : 'text-slate-400'}">
                      ${this.redJack === 'V_OHM_MA' ? '🔴 ROT STECKT' : 'STANDARD'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- RECHTER BLOCK: Entweder Interaktive Mess-Platine ODER 7 Geführte Mess-Stationen -->
          <div class="lg:col-span-7 flex flex-col gap-4">
            ${
              this.tabMode === 'board'
                ? `
            <!-- MODUS 1: INTERAKTIVE FR-4 MESS-PLATINE -->
            <div class="eng-card rounded-2xl border p-4 flex flex-col gap-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-mm-probe="red"
                    class="px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                      this.activeProbe === 'red'
                        ? 'bg-red-500/25 border-red-400 text-red-300'
                        : 'eng-btn-neutral'
                    }"
                  >
                    🔴 Rote Spitze bewegen
                  </button>
                  <button
                    type="button"
                    data-mm-probe="black"
                    class="px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                      this.activeProbe === 'black'
                        ? 'bg-slate-400/25 border-slate-300 text-slate-100'
                        : 'eng-btn-neutral'
                    }"
                  >
                    ⚫ Schwarze Spitze bewegen
                  </button>
                  <button
                    type="button"
                    data-mm-action="swap-board-probes"
                    class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                  >
                    🔀 Tauschen
                  </button>
                </div>

                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-mm-action="toggle-power"
                    class="px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                      this.circuitPowered
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                        : 'bg-slate-700/40 border-slate-500/50 eng-text-muted'
                    }"
                  >
                    ${this.circuitPowered ? '⚡ Platine: EIN' : '⭘ Platine: AUS'}
                  </button>
                  <button
                    type="button"
                    data-mm-action="toggle-jumper"
                    class="px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                      this.jumperJ1Closed
                        ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
                        : 'bg-orange-500/20 border-orange-400 text-orange-300'
                    }"
                    title="Jumper J1 öffnen, um mit dem Multimeter in Reihe Strom zu messen!"
                  >
                    ${this.jumperJ1Closed ? '🔗 J1: ZU' : '⛓️ J1: OFFEN'}
                  </button>
                </div>
              </div>

              <!-- Interaktive FR-4 Platine (SVG mit 9 anklickbaren Pads + Jumper J1 + LED) -->
              ${renderInteractiveBoardSvg({
                redPadId: this.redPadId,
                blackPadId: this.blackPadId,
                activeProbe: this.activeProbe,
                circuitPowered: this.circuitPowered,
                jumperJ1Closed: this.jumperJ1Closed,
                ledLitByCircuit: boardEval.ledLitByCircuit,
                ledGlowByDiodeTest: boardEval.ledGlowByDiodeTest,
                sparkOnBoard: boardEval.sparkOnBoard,
              })}

              <!-- Aktuelle Spitzen-Positionen -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg bg-red-500/12 border border-red-500/35 px-3 py-1.5 flex items-center justify-between gap-2">
                  <span class="font-mono font-bold text-red-400">🔴 Rot: ${redPad.label}</span>
                  <span class="eng-text-body truncate">${redPad.name}</span>
                </div>
                <div class="rounded-lg bg-slate-500/15 border border-slate-400/35 px-3 py-1.5 flex items-center justify-between gap-2">
                  <span class="font-mono font-bold text-slate-300">⚫ Schwarz: ${blackPad.label}</span>
                  <span class="eng-text-body truncate">${blackPad.name}</span>
                </div>
              </div>

              <!-- Live-Auswertung -->
              <div data-mm-feedback class="rounded-xl border p-3.5 ${toneBannerCls}">
                <div class="text-xs font-bold flex items-center justify-between gap-2">
                  <span>${reading.explanationTitle}</span>
                  ${
                    this.fuseBlown
                      ? `<button type="button" data-mm-action="replace-fuse" class="px-2 py-0.5 rounded bg-red-500 text-white text-[11px] font-bold cursor-pointer">🔧 Sicherung ersetzen</button>`
                      : ''
                  }
                </div>
                <p class="mt-1 text-xs leading-relaxed opacity-95">${reading.explanationBody}</p>
              </div>
            </div>

            <!-- Fehler-Detektiv ODER Entdecker-Tipps -->
            <div class="eng-card rounded-2xl border p-4 flex flex-col gap-3">
              ${
                this.detectiveActive
                  ? `
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-bold text-fuchsia-300 flex items-center gap-2">
                    <span>🕵️ Fehler-Detektiv aktiv!</span>
                    <span class="text-[10.5px] font-mono eng-text-muted">Miss die Platine durch und finde den Defekt:</span>
                  </div>
                  <button type="button" data-mm-action="clear-fault" class="eng-btn-neutral px-2 py-1 rounded-lg border text-[11px] cursor-pointer">
                    Platine reparieren
                  </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  ${BOARD_FAULT_SCENARIOS.filter((f) => f.id !== 'none')
                    .map(
                      (f) => `
                    <button
                      type="button"
                      data-mm-guess="${f.id}"
                      class="eng-btn-neutral px-3 py-2 rounded-xl border text-left text-xs font-semibold cursor-pointer hover:border-fuchsia-400 transition"
                    >
                      🔎 ${f.title}
                    </button>
                  `,
                    )
                    .join('')}
                </div>
                ${
                  this.detectiveFeedback
                    ? `<div data-mm-detective-result class="rounded-xl border px-3 py-2 text-xs font-semibold ${
                        this.detectiveFeedback.tone === 'ok'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                          : 'bg-red-500/15 border-red-400 text-red-300'
                      }">${this.detectiveFeedback.text}</div>`
                    : ''
                }
              `
                  : `
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    🧪 Probiere diese 4 Mess-Tricks direkt auf der Platine aus!
                  </span>
                  <button type="button" data-mm-action="start-detective" class="text-[11px] font-bold text-fuchsia-300 underline cursor-pointer">
                    🐛 Fehler-Detektiv starten →
                  </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                  <button type="button" data-mm-preset="r1-drop" class="eng-card-soft rounded-xl border p-2.5 text-left hover:border-cyan-400 cursor-pointer transition">
                    <div class="font-bold eng-text-main">1. Spannungsabfall an R1 (1,30 V)</div>
                    <div class="eng-text-muted mt-0.5">Rot auf J1-B, Schwarz auf LED+ im V⎓-Modus</div>
                  </button>
                  <button type="button" data-mm-preset="adc-div" class="eng-card-soft rounded-xl border p-2.5 text-left hover:border-cyan-400 cursor-pointer transition">
                    <div class="font-bold eng-text-main">2. Spannungsteiler prüfen (1,65 V)</div>
                    <div class="eng-text-muted mt-0.5">Rot auf ADC, Schwarz auf TP3 (GND)</div>
                  </button>
                  <button type="button" data-mm-preset="series-ma" class="eng-card-soft rounded-xl border p-2.5 text-left hover:border-amber-400 cursor-pointer transition">
                    <div class="font-bold text-amber-300">3. Echte Reihen-Strommessung (5,9 mA)</div>
                    <div class="eng-text-muted mt-0.5">Jumper J1 öffnen → mA an J1-A ↔ J1-B!</div>
                  </button>
                  <button type="button" data-mm-preset="diode-led" class="eng-card-soft rounded-xl border p-2.5 text-left hover:border-rose-400 cursor-pointer transition">
                    <div class="font-bold text-rose-300">4. LED1 zum Glimmen bringen (1,98 V)</div>
                    <div class="eng-text-muted mt-0.5">Platine AUS → 🔊 ►| an LED+ ↔ GND2!</div>
                  </button>
                </div>
              `
              }
            </div>
                `
                : `
            <!-- MODUS 2: 7 GEFÜHRTE MESS-STATIONEN -->
            <div class="eng-card rounded-2xl border p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-mono uppercase tracking-wider eng-text-accent font-bold">
                  1. Mess-Objekt / Schaltung auswählen
                </span>
                <span class="text-[10.5px] font-mono eng-text-muted">${station.category}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                ${TEST_STATIONS.map((s) => {
                  const active = s.id === this.stationId;
                  const cls = active
                    ? 'bg-cyan-500/20 border-cyan-400 eng-text-accent font-bold'
                    : 'eng-btn-neutral font-medium';
                  return `
                    <button type="button" data-mm-station="${s.id}" class="px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${cls}">
                      ${s.shortLabel}
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- Visuelle Mess-Skizze (Parallel vs. Reihe + aktive Spitzen!) -->
              <div class="rounded-xl bg-slate-950/60 border border-slate-500/25 p-4 flex flex-col gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div class="text-sm font-bold eng-text-main flex items-center gap-2">
                      <span>${station.icon}</span>
                      <span>${station.title}</span>
                    </div>
                    <div class="text-[11.5px] eng-text-muted mt-0.5">${station.diagramHint}</div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      data-mm-action="toggle-power"
                      class="px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                        this.circuitPowered
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                          : 'bg-slate-700/40 border-slate-500/50 eng-text-muted'
                      }"
                    >
                      ${this.circuitPowered ? '⚡ Schaltung: EIN' : '⭘ Schaltung: AUS'}
                    </button>
                    <button
                      type="button"
                      data-mm-action="swap-probes"
                      class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                      title="Rote und schwarze Messspitze vertauschen"
                    >
                      🔀 Spitzen tauschen
                    </button>
                  </div>
                </div>

                <!-- Klare Messspitzen-Zuordnung -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div class="rounded-lg bg-red-500/12 border border-red-500/35 px-3 py-2 flex items-center justify-between gap-2">
                    <span class="font-mono font-bold text-red-400">🔴 Rote Spitze (+)</span>
                    <span class="font-mono eng-text-main text-right">${this.probesSwapped ? station.probeNegLabel : station.probePosLabel}</span>
                  </div>
                  <div class="rounded-lg bg-slate-500/15 border border-slate-400/35 px-3 py-2 flex items-center justify-between gap-2">
                    <span class="font-mono font-bold text-slate-300">⚫ Schwarze Spitze (COM)</span>
                    <span class="font-mono eng-text-main text-right">${this.probesSwapped ? station.probePosLabel : station.probeNegLabel}</span>
                  </div>
                </div>

                <!-- Visuelles Mini-Schaltbild (Parallel vs. Reihe) -->
                <div class="rounded-lg bg-slate-900/70 border border-slate-700/60 px-3 py-2.5 flex items-center justify-between gap-3 text-[11px] font-mono">
                  <span class="${station.isSeriesCircuit ? 'text-amber-300' : 'eng-text-accent'} font-bold">
                    ${
                      station.isSeriesCircuit
                        ? '⛓️ REIHENMESSUNG: Quelle (+) ──▶ 🔴 DMM ──▶ ⚫ COM ──▶ Last ──▶ GND'
                        : '🪜 PARALLELMESSUNG: Messspitzen direkt links & rechts ans Bauteil anlegen!'
                    }
                  </span>
                  ${
                    reading.ledGlow
                      ? `<span class="px-2 py-0.5 rounded-full bg-red-500/30 border border-red-400 text-red-200 font-bold animate-pulse">💡 LED glimmt!</span>`
                      : ''
                  }
                </div>
              </div>

              <!-- Live-Auswertung & Erklärungs-Banner -->
              <div data-mm-feedback class="rounded-xl border p-3.5 ${toneBannerCls}">
                <div class="text-xs font-bold flex items-center justify-between gap-2">
                  <span>${reading.explanationTitle}</span>
                  ${
                    this.fuseBlown
                      ? `<button type="button" data-mm-action="replace-fuse" class="px-2 py-0.5 rounded bg-red-500 text-white text-[11px] font-bold cursor-pointer">🔧 Sicherung ersetzen</button>`
                      : ''
                  }
                </div>
                <p class="mt-1 text-xs leading-relaxed opacity-95">${reading.explanationBody}</p>
                <div class="mt-2 text-[11px] font-mono opacity-80">💡 Tipp für diese Station: ${station.howToHint}</div>
              </div>
            </div>

            <!-- 5 Interaktive Mess-Aufgaben -->
            <div class="eng-card rounded-2xl border p-4 flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  🎯 Praxis-Checkliste: Probiere alle 5 Messungen selbst aus!
                </span>
                <span class="text-xs font-mono font-bold ${doneCount === MISSIONS.length ? 'text-emerald-400' : 'eng-text-muted'}">
                  ${doneCount} / ${MISSIONS.length}
                </span>
              </div>
              <div class="grid grid-cols-1 gap-1.5">
                ${MISSIONS.map((m) => {
                  const done = this.completedMissions.has(m.id);
                  return `
                    <div class="rounded-lg border px-3 py-1.5 text-xs flex items-center gap-2 ${
                      done
                        ? 'bg-emerald-500/12 border-emerald-500/40 text-emerald-300'
                        : 'eng-card-soft eng-text-body'
                    }">
                      <span class="font-mono font-bold">${done ? '✅' : '○'}</span>
                      <span>${m.label}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
                `
            }
          </div>
        </div>

        <!-- UNTERER BLOCK: Wie funktioniert ein Multimeter innen? + 4 Goldene Sicherheitsregeln -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="eng-card rounded-2xl border p-4 flex flex-col gap-3">
            <h3 class="text-xs font-mono uppercase tracking-wider eng-text-accent font-bold">
              🔬 Wie funktioniert ein Multimeter eigentlich innen drin?
            </h3>
            <div class="flex flex-col gap-2.5 text-xs">
              <div class="eng-card-soft rounded-xl border p-3">
                <div class="font-bold text-cyan-400">1. Spannung messen (V⎓ / V~) → 10 MΩ Innenwiderstand</div>
                <p class="mt-1 eng-text-body leading-relaxed">
                  Im Spannungs-Modus schaltet das Multimeter einen riesigen <strong>10-Megaohm-Widerstand</strong> zwischen die Spitzen.
                  Dadurch fließt fast kein Strom durchs Messgerät — es „lauscht“ nur an der Spannung, ohne deine Schaltung zu belasten.
                  Deshalb misst man Spannung immer <strong>parallel</strong> zum Bauteil!
                </p>
              </div>
              <div class="eng-card-soft rounded-xl border p-3">
                <div class="font-bold text-amber-400">2. Strom messen (mA / 10A) → Winziger Shunt-Widerstand</div>
                <p class="mt-1 eng-text-body leading-relaxed">
                  Strom kann ein Chip nicht direkt messen — er trickst mit dem Ohmschen Gesetz! Im Gerät sitzt ein winziger Präzisions-Widerstand
                  (<strong>Shunt</strong>, z. B. 0,01 Ω). Der gesamte Strom fließt hindurch, erzeugt eine winzige Spannung (U = I · R), und der Chip rechnet sie in Ampere um.
                  Weil 0,01 Ω fast ein <strong>Kurzschluss</strong> ist, darfst du im mA/10A-Modus niemals parallel an einen Akku gehen!
                </p>
              </div>
              <div class="eng-card-soft rounded-xl border p-3">
                <div class="font-bold text-emerald-400">3. Widerstand (Ω) &amp; Durchgang (🔊) → Interne Test-Batterie</div>
                <p class="mt-1 eng-text-body leading-relaxed">
                  Hier schickt das Multimeter selbst einen winzigen, exakt bekannten <strong>Test-Strom</strong> aus seiner eigenen Batterie durch den Widerstand
                  und misst die entstehende Spannung (R = U / I). Im <strong>Durchgangs-Modus</strong> piept ein kleiner Buzzer, sobald der Widerstand unter ~50 Ω fällt!
                </p>
              </div>
            </div>
          </div>

          <div class="eng-card rounded-2xl border p-4 flex flex-col gap-3">
            <h3 class="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
              🛡️ Die 5 Goldenen Multimeter-Regeln (Nie wieder eine Sicherung sprengen!)
            </h3>
            <div class="flex flex-col gap-2 text-xs">
              <div class="eng-card-soft rounded-xl border p-2.5 flex gap-2.5">
                <span class="font-mono font-bold text-cyan-400">01</span>
                <div>
                  <strong class="eng-text-main">Schwarz bleibt IMMER in COM:</strong>
                  <span class="eng-text-body"> Das schwarze Kabel steckt bei jeder Messung in COM (Common / Masse). Du steckst nur das rote Kabel um!</span>
                </div>
              </div>
              <div class="eng-card-soft rounded-xl border p-2.5 flex gap-2.5">
                <span class="font-mono font-bold text-amber-400">02</span>
                <div>
                  <strong class="eng-text-main">Spannung parallel, Strom in Reihe:</strong>
                  <span class="eng-text-body"> Für Volt Spitzen einfach anlegen. Für Ampere ein Kabel rausziehen und das Multimeter als Brücke dazwischenschalten.</span>
                </div>
              </div>
              <div class="eng-card-soft rounded-xl border p-2.5 flex gap-2.5">
                <span class="font-mono font-bold text-emerald-400">03</span>
                <div>
                  <strong class="eng-text-main">Widerstand &amp; Durchgang nur STROMLOS messen:</strong>
                  <span class="eng-text-body"> Vorher USB/Akku abziehen! Sonst kämpft die Schaltungs-Spannung gegen die Test-Batterie im Multimeter.</span>
                </div>
              </div>
              <div class="eng-card-soft rounded-xl border p-2.5 flex gap-2.5">
                <span class="font-mono font-bold text-rose-400">04</span>
                <div>
                  <strong class="eng-text-main">Nach 10A-Messung rotes Kabel sofort zurückstecken:</strong>
                  <span class="eng-text-body"> Der Klassiker-Fehler: Rotes Kabel in „10A“ vergessen und danach 5 V messen → sofortiger Kurzschluss!</span>
                </div>
              </div>
              <div class="eng-card-soft rounded-xl border p-2.5 flex gap-2.5">
                <span class="font-mono font-bold text-violet-400">05</span>
                <div>
                  <strong class="eng-text-main">Was bedeutet „OL“ im Display?</strong>
                  <span class="eng-text-body"> „Open Loop“ / „Over Limit“ — das Gerät ist nicht kaputt! Es heißt nur: kein Durchgang (Kabelbruch) oder Messbereich zu klein.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();

    if (reading.beep && this.soundEnabled) {
      this.playBeep();
    }
  }

  private computeReading(station: TestStation): MeasurementReading {
    const sign = this.probesSwapped ? '−' : '';

    if (this.dial === 'OFF') {
      return {
        displayMain: '---',
        displayUnit: '',
        subBadge: 'POWER OFF',
        tone: 'off',
        beep: false,
        ledGlow: false,
        explanationTitle: 'Multimeter ist ausgeschaltet',
        explanationBody:
          'Wähle links am Drehschalter einen Messbereich (z. B. V⎓ für Gleichspannung oder Ω für Widerstand). Tipp: Nach der Benutzung immer auf OFF stellen, damit die 9-V-Batterie hält!',
      };
    }

    // 1. Gefährlicher Klassiker-Fehler: Rotes Kabel steckt in 10A-Buchse, aber man misst parallel an einer eingeschalteten Spannungsquelle!
    if (
      !station.isSeriesCircuit &&
      this.circuitPowered &&
      station.voltageDcV > 0.5 &&
      (this.redJack === 'A10' || this.dial === 'MA' || this.dial === 'A10')
    ) {
      const whichFuse: 'mA' | '10A' = this.redJack === 'A10' ? '10A' : 'mA';
      return {
        displayMain: 'FUSE',
        displayUnit: 'ERR',
        subBadge: 'KURZSCHLUSS!',
        tone: 'danger',
        beep: false,
        ledGlow: false,
        blownFuse: whichFuse,
        explanationTitle: `⚡ Achtung! ${whichFuse}-Sicherung durch Parallel-Kurzschluss ausgelöst!`,
        explanationBody:
          'Im Strom-Modus (mA / 10A) bzw. in der 10A-Buchse hat das Multimeter fast 0 Ω Innenwiderstand (Shunt). Hältst du die Spitzen PARALLEL an eine Spannungsquelle (z. B. 3,3 V / 5 V), fließt ein sofortiger Kurzschlussstrom! Lösung: Rotes Kabel in „V Ω mA“, Drehschalter auf V⎓ und Sicherung ersetzen.',
      };
    }

    // 2. Sicherung bereits defekt bei Strommessung
    if ((this.dial === 'MA' || this.dial === 'A10') && this.fuseBlown) {
      return {
        displayMain: '0.00',
        displayUnit: this.dial === 'A10' ? 'A' : 'mA',
        subBadge: 'SICHERUNG DEFEKT',
        tone: 'danger',
        beep: false,
        ledGlow: false,
        explanationTitle: `Die ${this.fuseBlown}-Sicherung im Multimeter ist durchgebrannt`,
        explanationBody:
          'Mit durchgebrannter Sicherung zeigt das Multimeter im Strom-Modus immer 0.00 an. Klicke oben auf „🔧 Sicherung ersetzen“, um weiterzumessen.',
      };
    }

    // 3. Gleichspannung V DC
    if (this.dial === 'VDC') {
      if (this.redJack === 'A10') {
        return {
          displayMain: 'LEAD',
          displayUnit: 'ERR',
          subBadge: 'FALSCHE BUCHSE',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: 'Rotes Messkabel steckt in der falschen Buchse (10A)!',
          explanationBody:
            'Für Spannungsmessungen (V⎓) muss das rote Kabel unbedingt in der rechten Buchse „V Ω mA“ stecken. Klicke unten am Multimeter auf „V Ω mA“, um es umzustecken!',
        };
      }
      if (!this.circuitPowered || station.voltageDcV === 0) {
        return {
          displayMain: '0.00',
          displayUnit: 'V DC',
          subBadge: 'AUTO DC',
          tone: 'info',
          beep: false,
          ledGlow: false,
          explanationTitle: '0,00 V — keine Gleichspannung anliegend',
          explanationBody:
            station.voltageDcV > 0
              ? 'Die Schaltung ist aktuell AUS. Schalte oben auf „⚡ Schaltung: EIN“, um die Betriebsspannung zu messen!'
              : 'An diesem passiven Bauteil/Kabel liegt keine Spannungsquelle an. Nutze hierfür Ω (Widerstand) oder 🔊 (Durchgang).',
        };
      }
      if (station.isSeriesCircuit) {
        return {
          displayMain: `${sign}${station.voltageDcV.toFixed(2)}`,
          displayUnit: 'V DC',
          subBadge: 'OFFENE QUELLE',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: `Du misst ${sign}${station.voltageDcV.toFixed(2)} V über die Trennstelle (kein Strom fließt)`,
          explanationBody:
            'Da das Multimeter im V⎓-Modus 10 MΩ hochohmig ist, sperrt es den aufgetrennten Stromkreis. Um den fließenden Strom dieser Station zu messen, schalte auf mA bzw. 10A um!',
        };
      }
      return {
        displayMain: `${sign}${station.voltageDcV.toFixed(2)}`,
        displayUnit: 'V DC',
        subBadge: 'AUTO DC • 10 MΩ',
        tone: this.probesSwapped ? 'info' : 'ok',
        beep: false,
        ledGlow: false,
        explanationTitle: this.probesSwapped
          ? `Messwert: −${station.voltageDcV.toFixed(2)} V (Spitzen vertauscht — kein Schaden!)`
          : `✅ Perfekte Spannungsmessung: ${station.voltageDcV.toFixed(2)} V DC!`,
        explanationBody: this.probesSwapped
          ? 'Das Minuszeichen im Display verrät dir sofort: Die rote Spitze liegt am Minuspol (GND) und die schwarze am Pluspol. Einem Digital-Multimeter macht das gar nichts aus!'
          : 'Durch den extrem hohen Innenwiderstand (10 MΩ) misst du exakt die anliegende Betriebsspannung, ohne den ESP32 zu belasten.',
      };
    }

    // 4. Wechselspannung V AC
    if (this.dial === 'VAC') {
      if (this.redJack === 'A10') {
        return {
          displayMain: 'LEAD',
          displayUnit: 'ERR',
          subBadge: 'FALSCHE BUCHSE',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: 'Rotes Kabel in Buchse „V Ω mA“ umstecken!',
          explanationBody: 'Auch Wechselspannung (V~) wird immer über die Buchse „V Ω mA“ gemessen.',
        };
      }
      return {
        displayMain: '0.00',
        displayUnit: 'V AC',
        subBadge: 'AC RMS',
        tone: 'info',
        beep: false,
        ledGlow: false,
        explanationTitle: '0,00 V AC — Gleichspannung wird im AC-Modus ausgeblendet!',
        explanationBody:
          'ESP32, Akkus, USB und Netzteile liefern Gleichspannung (DC = V⎓). Der AC-Modus (V~) misst nur Wechselspannung (z. B. Transformator-Sekundärseite). Schalte für Mikrocontroller auf V⎓ um!',
      };
    }

    // 5. Widerstand Ω
    if (this.dial === 'OHM') {
      if (this.redJack === 'A10') {
        return {
          displayMain: 'LEAD',
          displayUnit: 'ERR',
          subBadge: 'FALSCHE BUCHSE',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: 'Rotes Kabel für Ω-Messung in „V Ω mA“ stecken!',
          explanationBody: 'Die 10A-Buchse ist ausschließlich für hohe Ströme gedacht.',
        };
      }
      if (this.circuitPowered && station.voltageDcV > 0.2) {
        return {
          displayMain: 'ERR',
          displayUnit: 'VOLT!',
          subBadge: 'SPANNUNG AKTIV',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: '⚠️ Schaltung erst ausschalten vor der Widerstandsmessung!',
          explanationBody:
            'Die Schaltung steht noch unter Spannung! Das Multimeter schickt für die Ω-Messung einen eigenen Teststrom — Fremdspannung verfälscht das Ergebnis komplett. Klicke oben auf „⚡ Schaltung: EIN“ → AUS!',
        };
      }
      if (!Number.isFinite(station.resistanceOhms)) {
        return {
          displayMain: 'OL',
          displayUnit: 'MΩ',
          subBadge: 'OPEN LOOP',
          tone: 'info',
          beep: false,
          ledGlow: false,
          explanationTitle: 'OL (Open Loop) — unendlicher Widerstand / kein Kontakt',
          explanationBody:
            station.id === 'led-diode'
              ? 'Im normalen Ω-Modus reicht die kleine Prüfspannung oft nicht für eine LED (Vf ≈ 2,0 V). Wechsle in den Dioden-Modus (🔊 ►|)!'
              : 'Zwischen den beiden Messspitzen besteht keine leitende Verbindung (Kabelbruch oder offener Schalter).',
        };
      }
      const isKilo = station.resistanceOhms >= 1000;
      const valStr = isKilo
        ? (station.resistanceOhms / 1000).toFixed(2)
        : station.resistanceOhms.toFixed(1);
      return {
        displayMain: valStr,
        displayUnit: isKilo ? 'kΩ' : 'Ω',
        subBadge: 'AUTO Ω',
        tone: 'ok',
        beep: false,
        ledGlow: false,
        explanationTitle: `✅ Widerstand sicher gemessen: ${valStr} ${isKilo ? 'kΩ' : 'Ω'}`,
        explanationBody:
          'Perfekt! Da die Schaltung stromlos ist, konnte das Multimeter seinen eigenen winzigen Messstrom durch das Bauteil schicken und den exakten Ohm-Wert bestimmen.',
      };
    }

    // 6. Durchgang & Dioden-Test (CONT / ►|)
    if (this.dial === 'CONT') {
      if (this.redJack === 'A10') {
        return {
          displayMain: 'LEAD',
          displayUnit: 'ERR',
          subBadge: 'FALSCHE BUCHSE',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: 'Rotes Kabel für Durchgang & Dioden-Test in „V Ω mA“ stecken!',
          explanationBody: 'Stecke das rote Kabel unten rechts in „V Ω mA“ um.',
        };
      }
      if (this.circuitPowered && station.voltageDcV > 0.2) {
        return {
          displayMain: 'ERR',
          displayUnit: 'VOLT!',
          subBadge: 'SPANNUNG AKTIV',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: '⚠️ Durchgang & Dioden immer stromlos testen!',
          explanationBody: 'Schalte die Schaltung zuerst auf AUS, bevor du Durchgang oder LEDs prüfst.',
        };
      }
      if (station.diodeForwardV !== undefined) {
        if (this.probesSwapped) {
          return {
            displayMain: 'OL',
            displayUnit: '►|',
            subBadge: 'SPERRRICHTUNG',
            tone: 'info',
            beep: false,
            ledGlow: false,
            explanationTitle: 'OL — LED in Sperrrichtung (Kathode an Rot)',
            explanationBody:
              'Eine Diode lässt Strom nur in einer Richtung durch! Klicke auf „🔀 Spitzen tauschen“, sodass Rot an der Anode (+) liegt — dann zeigt das Display die Durchlassspannung Vf!',
          };
        }
        return {
          displayMain: station.diodeForwardV.toFixed(2),
          displayUnit: 'V ►|',
          subBadge: 'DIODEN-TEST',
          tone: 'ok',
          beep: false,
          ledGlow: true,
          explanationTitle: `✅ LED funktioniert! Durchlassspannung Vf = ${station.diodeForwardV.toFixed(2)} V`,
          explanationBody:
            'Im Dioden-Modus legt das Multimeter ~3 V Prüfspannung mit Strombegrenzung (~1 mA) an: Eine gesunde LED leuchtet ganz leicht auf und zeigt ihre genaue Durchlassspannung Vf an!',
        };
      }
      if (station.resistanceOhms <= 50) {
        return {
          displayMain: station.resistanceOhms.toFixed(1),
          displayUnit: 'Ω',
          subBadge: 'DURCHGANG OK',
          tone: 'ok',
          beep: true,
          ledGlow: false,
          explanationTitle: `🔊 PIEP! Durchgang erkannt (${station.resistanceOhms.toFixed(1)} Ω < 50 Ω)`,
          explanationBody:
            'Die Verbindung zwischen beiden Messpunkten ist durchgehend leitend — super zum schnellen Prüfen von Kabeln, Sicherungen, Tastern oder zum Aufspüren von Kurzschlüssen!',
        };
      }
      return {
        displayMain: 'OL',
        displayUnit: 'Ω',
        subBadge: 'KEIN DURCHGANG',
        tone: 'info',
        beep: false,
        ledGlow: false,
        explanationTitle: 'Kein Piepton (OL / > 50 Ω) — keine direkte Verbindung',
        explanationBody:
          station.id === 'cable-broken'
            ? 'Treffer! Das Kabel ist innen gebrochen (Open Loop) — du hast den Fehler sofort entlarvt.'
            : 'Der Widerstand ist höher als ~50 Ω, daher bleibt der Piepser stumm.',
      };
    }

    // 7. Strommessung mA oder 10A (in Reihe!)
    if (this.dial === 'MA' || this.dial === 'A10') {
      if (!this.circuitPowered) {
        return {
          displayMain: '0.00',
          displayUnit: this.dial === 'A10' ? 'A' : 'mA',
          subBadge: 'SCHALTUNG AUS',
          tone: 'info',
          beep: false,
          ledGlow: false,
          explanationTitle: '0,00 — Schaltung ist ausgeschaltet',
          explanationBody:
            'Für eine Strommessung muss die Schaltung EIN sein, damit wirklich Elektronen durch den aufgetrennten Stromkreis (und durch dein Multimeter) fließen!',
        };
      }
      if (!station.isSeriesCircuit) {
        return {
          displayMain: '0.00',
          displayUnit: this.dial === 'A10' ? 'A' : 'mA',
          subBadge: 'KEIN STROM',
          tone: 'info',
          beep: false,
          ledGlow: false,
          explanationTitle: 'An diesem passiven Bauteil fließt kein Strom',
          explanationBody:
            'Wähle rechts eine der Reihen-Messstationen („⚡ Strom mA“ oder „🔥 Hochstrom 10A“), um echtes Strommessen zu üben.',
        };
      }

      const ma = station.seriesCurrentMa ?? 0;

      // Zu großer Strom (> 400 mA) über die kleine mA-Buchse!
      if (this.redJack === 'V_OHM_MA' && ma > 400) {
        return {
          displayMain: 'FUSE',
          displayUnit: '400mA',
          subBadge: 'ÜBERLAST!',
          tone: 'danger',
          beep: false,
          ledGlow: false,
          blownFuse: 'mA',
          explanationTitle: '⚡ 400-mA-Sicherung durchgebrannt! (2,45 A über mA-Buchse!)',
          explanationBody:
            'Der WLED-Streifen zieht 2,45 A (2450 mA) — viel zu viel für die mit 400 mA abgesicherte „V Ω mA“-Buchse! Stecke das rote Kabel für Ströme > 0,4 A immer in die „10A“-Buchse und drehe auf „10A“.',
        };
      }

      // Falsche Buchse für gewählten Bereich
      if (this.dial === 'A10' && this.redJack !== 'A10') {
        return {
          displayMain: 'LEAD',
          displayUnit: '10A!',
          subBadge: 'UMSTECKEN',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: 'Rotes Kabel für den 10A-Bereich in die linke „10A“-Buchse stecken!',
          explanationBody:
            'Im 10A-Modus liest das Multimeter ausschließlich den 10A-Shunt an der linken Buchse aus. Klicke unten links auf „10A MAX“!',
        };
      }
      if (this.dial === 'MA' && this.redJack === 'A10') {
        return {
          displayMain: 'LEAD',
          displayUnit: 'mA!',
          subBadge: 'UMSTECKEN',
          tone: 'warning',
          beep: false,
          ledGlow: false,
          explanationTitle: 'Rotes Kabel für kleine Ströme (mA) in „V Ω mA“ stecken!',
          explanationBody:
            'Für genaue Milliampere-Messungen (≤ 400 mA) steckt das rote Kabel in der rechten Buchse „V Ω mA“.',
        };
      }

      if (this.dial === 'A10') {
        return {
          displayMain: `${sign}${(ma / 1000).toFixed(2)}`,
          displayUnit: 'A DC',
          subBadge: '10A SHUNT • REIHE',
          tone: 'ok',
          beep: false,
          ledGlow: false,
          explanationTitle: `✅ Hochstrom sicher gemessen: ${sign}${(ma / 1000).toFixed(2)} A über die 10A-Buchse!`,
          explanationBody:
            'Perfekt gemacht: Stromkreis aufgetrennt, rotes Kabel in die 10A-Buchse gesteckt und in Reihe gemessen. Denk danach immer daran, das rote Kabel zurück in „V Ω mA“ zu stecken!',
        };
      }

      return {
        displayMain: `${sign}${ma.toFixed(1)}`,
        displayUnit: 'mA',
        subBadge: 'mA SHUNT • REIHE',
        tone: 'ok',
        beep: false,
        ledGlow: false,
        explanationTitle: `✅ Perfekte Reihen-Strommessung: ${sign}${ma.toFixed(1)} mA!`,
        explanationBody:
          'Der gesamte LED-Strom fließt durch den winzigen Mess-Shunt im Multimeter zurück zur LED. So prüfst du ganz einfach, ob ein ESP32-Pin (< 20 mA) sicher im Limit bleibt!',
      };
    }

    return {
      displayMain: '0.00',
      displayUnit: '',
      subBadge: 'READY',
      tone: 'info',
      beep: false,
      ledGlow: false,
      explanationTitle: 'Bereit zum Messen',
      explanationBody: 'Wähle links einen Messbereich und rechts eine Station.',
    };
  }

  private playBeep(): void {
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtor();
      }
      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 2650;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.14);
    } catch {
      // Ignore autoplay restrictions
    }
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-mm-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tabMode = btn.dataset.mmTab as MultimeterTabMode;
        this.render();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-mm-dial]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dial = btn.dataset.mmDial as MeterDialMode;
        this.render();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-mm-jack]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.redJack = btn.dataset.mmJack as RedJackId;
        this.render();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-mm-station]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stationId = btn.dataset.mmStation as StationId;
        this.probesSwapped = false;
        this.render();
      });
    });

    // Interaktive Mess-Platine: Spitzen-Toggle & Klick/Rechtsklick auf die 9 Test-Pads
    this.root.querySelectorAll<HTMLButtonElement>('[data-mm-probe]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeProbe = btn.dataset.mmProbe as 'red' | 'black';
        this.render();
      });
    });

    this.root.querySelectorAll<SVGGElement>('[data-mm-pad]').forEach((padEl) => {
      padEl.addEventListener('click', () => {
        const padId = padEl.dataset.mmPad;
        if (!padId) return;
        if (this.activeProbe === 'red') {
          this.redPadId = padId;
        } else {
          this.blackPadId = padId;
        }
        this.render();
      });
      padEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const padId = padEl.dataset.mmPad;
        if (!padId) return;
        this.blackPadId = padId;
        this.render();
      });
    });

    this.root.querySelector('[data-mm-action="swap-board-probes"]')?.addEventListener('click', () => {
      const tmp = this.redPadId;
      this.redPadId = this.blackPadId;
      this.blackPadId = tmp;
      this.render();
    });

    this.root.querySelectorAll('[data-mm-action="toggle-jumper"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.jumperJ1Closed = !this.jumperJ1Closed;
        this.render();
      });
    });

    // Fehler-Detektiv starten, raten & reparieren
    this.root.querySelectorAll('[data-mm-action="start-detective"]').forEach((el) => {
      el.addEventListener('click', () => {
        const faults: BoardFaultId[] = [
          'blown-fuse-f1',
          'open-resistor-r1',
          'dead-ldo-3v3',
          'short-3v3-gnd',
        ];
        const choices = faults.filter((f) => f !== this.boardFault);
        this.boardFault = choices[Math.floor(Math.random() * choices.length)];
        this.detectiveActive = true;
        this.detectiveFeedback = null;
        this.jumperJ1Closed = true;
        this.circuitPowered = true;
        this.fuseBlown = null;
        this.redJack = 'V_OHM_MA';
        this.dial = 'VDC';
        this.render();
      });
    });

    this.root.querySelector('[data-mm-action="clear-fault"]')?.addEventListener('click', () => {
      this.boardFault = 'none';
      this.detectiveActive = false;
      this.detectiveFeedback = null;
      this.render();
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-mm-guess]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const guess = btn.dataset.mmGuess as BoardFaultId;
        const actual = BOARD_FAULT_SCENARIOS.find((f) => f.id === this.boardFault);
        if (guess === this.boardFault) {
          this.detectiveSolvedCount += 1;
          this.detectiveFeedback = {
            tone: 'ok',
            text: `🎉 Volltreffer! „${actual?.title}“ korrekt mit dem Multimeter diagnostiziert! (${actual?.diagnosticHint})`,
          };
        } else {
          this.detectiveFeedback = {
            tone: 'danger',
            text: `❌ Noch nicht ganz — miss noch mal genau nach! Tipp: Prüfe erst TP1 (+5V), F1-B und TP2 (+3,3V), oder schalte die Platine AUS für Ω / 🔊!`,
          };
        }
        this.render();
      });
    });

    // 4 Schnell-Presets auf der interaktiven Platine
    this.root.querySelectorAll<HTMLButtonElement>('[data-mm-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.mmPreset;
        this.boardFault = 'none';
        this.detectiveActive = false;
        this.fuseBlown = null;
        this.redJack = 'V_OHM_MA';
        if (preset === 'r1-drop') {
          this.circuitPowered = true;
          this.jumperJ1Closed = true;
          this.dial = 'VDC';
          this.redPadId = 'TP5';
          this.blackPadId = 'TP6';
        } else if (preset === 'adc-div') {
          this.circuitPowered = true;
          this.jumperJ1Closed = true;
          this.dial = 'VDC';
          this.redPadId = 'TP8';
          this.blackPadId = 'TP3';
        } else if (preset === 'series-ma') {
          this.circuitPowered = true;
          this.jumperJ1Closed = false;
          this.dial = 'MA';
          this.redPadId = 'TP4';
          this.blackPadId = 'TP5';
        } else if (preset === 'diode-led') {
          this.circuitPowered = false;
          this.jumperJ1Closed = true;
          this.dial = 'CONT';
          this.redPadId = 'TP6';
          this.blackPadId = 'TP7';
        }
        this.render();
      });
    });

    this.root.querySelector('[data-mm-action="toggle-power"]')?.addEventListener('click', () => {
      this.circuitPowered = !this.circuitPowered;
      this.render();
    });

    this.root.querySelector('[data-mm-action="swap-probes"]')?.addEventListener('click', () => {
      this.probesSwapped = !this.probesSwapped;
      this.render();
    });

    this.root.querySelector('[data-mm-action="toggle-sound"]')?.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.render();
    });

    this.root.querySelectorAll('[data-mm-action="replace-fuse"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.fuseBlown = null;
        this.redJack = 'V_OHM_MA';
        this.dial = 'VDC';
        this.render();
      });
    });

    this.root.querySelector('[data-mm-action="auto-setup"]')?.addEventListener('click', () => {
      const station = TEST_STATIONS.find((s) => s.id === this.stationId) ?? TEST_STATIONS[0];
      this.fuseBlown = null;
      this.probesSwapped = false;
      this.redJack = station.recommendedJack;
      this.dial = station.recommendedMode;
      this.circuitPowered = !station.requiresPowerOff;
      this.render();
    });
  }
}
