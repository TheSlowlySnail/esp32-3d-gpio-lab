import { formatResistance, getResistorColorBands } from '../engine/ComponentRegistry';
import type { AppMode } from '../sandbox/SandboxTypes';
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_ENTRIES,
  type GlossaryCategory,
  type GlossaryEntry,
} from './GlossaryData';

export interface GlossaryCallbacks {
  onTryInApp: (mode: AppMode, lessonId?: string) => void;
}

const E12_VALUES = [
  10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82, 100, 120, 150, 180, 220, 270, 330, 390, 470, 560,
  680, 820, 1000, 1200, 1500, 1800, 2200, 2700, 3300, 4700, 10000,
];

function nextStandardE12(ohms: number): number {
  for (const val of E12_VALUES) {
    if (val >= ohms) return val;
  }
  return 10000;
}

/**
 * Interaktive Rubrik "📖 Grundlagen & Fachbegriffe":
 * - Wasser-Analogie & Ohmsches Gesetz auf einen Blick
 * - Live-LED-Vorwiderstands-Rechner mit E12-Normwert & IEC-Farbringen
 * - Durchsuchbares & filterbares E-Technik-Glossar mit Direkt-Sprung in 3D-Lektionen
 */
export class GlossaryView {
  private readonly root: HTMLElement;
  private readonly callbacks: GlossaryCallbacks;

  private activeCategory: 'ALL' | GlossaryCategory = 'ALL';
  private searchQuery = '';

  // Live-Rechner State
  private calcSupplyV = 3.3;
  private calcLedVf = 2.0;
  private calcCurrentMa = 10;

  // Interaktives Anode/Kathode Polaritäts-Labor State
  private polarityPart: 'led' | 'diode' | 'cap' = 'led';
  private polarityReversed = false;
  private polarityLedColor: 'red' | 'green' | 'blue' = 'red';

  private initialized = false;
  private listEl: HTMLElement | null = null;
  private countEl: HTMLElement | null = null;
  private calcResultEl: HTMLElement | null = null;
  private catWrapEl: HTMLElement | null = null;
  private polarityLabEl: HTMLElement | null = null;

  constructor(root: HTMLElement, callbacks: GlossaryCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
  }

  public render(): void {
    if (!this.initialized) {
      this.buildShell();
      this.initialized = true;
    }
    this.renderPolarityLab();
    this.renderCategoryPills();
    this.renderCalculatorResult();
    this.renderEntries();
  }

  private buildShell(): void {
    this.root.innerHTML = `
      <div class="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-5">
        <!-- Header -->
        <div class="eng-card rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xl">📖</span>
              <h2 class="text-base sm:text-lg font-bold eng-text-main">E-Technik Grundlagen &amp; Fachbegriffe</h2>
              <span class="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 eng-text-accent">
                ${GLOSSARY_ENTRIES.length} Erklärungen
              </span>
            </div>
            <p class="mt-1 text-xs sm:text-[13px] eng-text-muted max-w-3xl">
              Was ist ein Pull-Down oder Pull-Up? Warum brennt eine LED ohne Vorwiderstand durch? Wie funktionieren MOSFET, I²C und PWM?
              Alle wichtigen Elektronik-Begriffe verständlich erklärt — mit Live-Rechner und 1-Klick-Sprung in die 3D-Simulation.
            </p>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            <button type="button" data-scroll-polarity class="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer bg-amber-500/18 border-amber-400 text-amber-300 hover:bg-amber-500/28">
              💡 Anode &amp; Kathode
            </button>
            <button type="button" data-quick-jump="pull-down" class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer">
              ⬇️ Pull-Down
            </button>
            <button type="button" data-quick-jump="pull-up" class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer">
              ⬆️ Pull-Up
            </button>
            <button type="button" data-quick-jump="why-resistor" class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer">
              🛡️ Warum Widerstand?
            </button>
          </div>
        </div>

        <!-- Interaktives Polaritäts-Labor: Anode (+) vs. Kathode (−) anschaulich erleben -->
        <div data-polarity-lab class="eng-card rounded-2xl border border-amber-500/35 p-4 sm:p-5 flex flex-col gap-4"></div>

        <!-- 2-Spalten Grundlagen-Cockpit: Wasser-Analogie + Live-Vorwiderstands-Rechner -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Wasser-Analogie & Formeln -->
          <div class="eng-card rounded-2xl border p-4 flex flex-col justify-between gap-3">
            <div>
              <div class="text-[11px] font-mono uppercase tracking-wider eng-text-accent font-bold">
                💧 Die Wasser-Analogie — Elektronik in 30 Sekunden verstehen
              </div>
              <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div class="eng-card-soft rounded-xl border p-3">
                  <div class="text-xs font-bold text-orange-400">🔋 Spannung (U · Volt)</div>
                  <div class="mt-1 text-[11px] eng-text-body leading-snug">
                    = <strong>Wasserdruck</strong> in der Leitung. Treibt den Strom an (z. B. 3,3 V oder 5 V).
                  </div>
                </div>
                <div class="eng-card-soft rounded-xl border p-3">
                  <div class="text-xs font-bold text-amber-400">⚡ Strom (I · Ampere)</div>
                  <div class="mt-1 text-[11px] eng-text-body leading-snug">
                    = <strong>Wassermenge</strong> pro Sekunde, die tatsächlich fließt (LED ~10 mA).
                  </div>
                </div>
                <div class="eng-card-soft rounded-xl border p-3">
                  <div class="text-xs font-bold text-cyan-400">🚧 Widerstand (R · Ohm)</div>
                  <div class="mt-1 text-[11px] eng-text-body leading-snug">
                    = <strong>Engstelle / Ventil</strong> im Rohr. Bremst den Strom auf sichere Werte.
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-xl bg-slate-900/45 border border-slate-500/25 p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span class="eng-text-accent font-bold">U = R · I</span>
              <span class="opacity-40">|</span>
              <span class="text-emerald-400 font-bold">I = U / R</span>
              <span class="opacity-40">|</span>
              <span class="text-amber-400 font-bold">R = U / I</span>
              <span class="opacity-40">|</span>
              <span class="text-rose-400 font-bold">P = U · I</span>
            </div>
          </div>

          <!-- Interaktiver LED-Vorwiderstands-Rechner -->
          <div class="eng-card rounded-2xl border p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
              <div class="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                🧮 Live-Rechner: Welchen Vorwiderstand brauche ich?
              </div>
              <span class="text-[10px] font-mono eng-text-muted">R = (U − Vf) / I</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div class="flex flex-col gap-1">
                <span class="text-[10.5px] eng-text-muted font-medium">Versorgungsspannung U</span>
                <div class="flex gap-1" data-calc-group="supply">
                  ${[3.3, 5, 9, 12]
                    .map(
                      (v) => `
                    <button type="button" data-calc-supply="${v}" class="flex-1 px-2 py-1 rounded-lg border font-mono text-[11px] cursor-pointer transition">
                      ${String(v).replace('.', ',')} V
                    </button>
                  `,
                    )
                    .join('')}
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-[10.5px] eng-text-muted font-medium">LED-Farbe (Durchlassspannung Vf)</span>
                <div class="flex gap-1" data-calc-group="led">
                  ${[
                    { vf: 2.0, label: '🔴 2,0V' },
                    { vf: 2.2, label: '🟢 2,2V' },
                    { vf: 3.0, label: '🔵 3,0V' },
                  ]
                    .map(
                      (item) => `
                    <button type="button" data-calc-vf="${item.vf}" class="flex-1 px-1.5 py-1 rounded-lg border font-mono text-[10.5px] cursor-pointer transition">
                      ${item.label}
                    </button>
                  `,
                    )
                    .join('')}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <label class="text-[11px] eng-text-muted shrink-0">Wunsch-Strom I:</label>
              <input type="range" min="2" max="20" step="1" value="${this.calcCurrentMa}" data-calc-current class="flex-1 accent-cyan-400 cursor-pointer" />
              <span data-calc-current-label class="font-mono text-xs font-bold eng-text-accent w-14 text-right">${this.calcCurrentMa} mA</span>
            </div>

            <div data-calc-result class="rounded-xl bg-slate-900/50 border border-cyan-500/30 p-3"></div>
          </div>
        </div>

        <!-- Suche & Kategorie-Filter -->
        <div class="eng-card rounded-2xl border p-3.5 flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div class="relative flex-1">
              <input
                type="search"
                data-glossary-search
                placeholder="Fachbegriff suchen (z. B. Pull-Down, Pull-Up, Widerstand, MOSFET, I²C, PWM, Floating…)"
                class="w-full eng-input rounded-xl border px-3.5 py-2 text-xs font-medium outline-none focus:border-cyan-400"
              />
            </div>
            <div data-glossary-count class="text-xs font-mono eng-text-muted shrink-0 px-1"></div>
          </div>
          <div data-glossary-cats class="flex flex-wrap gap-1.5"></div>
        </div>

        <!-- Fachbegriffs-Karten -->
        <div data-glossary-list class="grid grid-cols-1 lg:grid-cols-2 gap-4"></div>
      </div>
    `;

    this.listEl = this.root.querySelector('[data-glossary-list]');
    this.countEl = this.root.querySelector('[data-glossary-count]');
    this.calcResultEl = this.root.querySelector('[data-calc-result]');
    this.catWrapEl = this.root.querySelector('[data-glossary-cats]');
    this.polarityLabEl = this.root.querySelector('[data-polarity-lab]');

    this.root.querySelector('[data-scroll-polarity]')?.addEventListener('click', () => {
      this.polarityLabEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (this.polarityLabEl) {
        this.polarityLabEl.classList.add('ring-2', 'ring-amber-400');
        setTimeout(() => this.polarityLabEl?.classList.remove('ring-2', 'ring-amber-400'), 1400);
      }
    });

    const searchInput = this.root.querySelector<HTMLInputElement>('[data-glossary-search]');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.trim().toLowerCase();
      this.renderEntries();
    });

    // Quick-Jump-Buttons oben
    this.root.querySelectorAll<HTMLButtonElement>('[data-quick-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.quickJump;
        this.activeCategory = 'ALL';
        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        this.renderCategoryPills();
        this.renderEntries();
        const card = this.root.querySelector<HTMLElement>(`[data-glossary-card="${targetId}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (card) {
          card.classList.add('ring-2', 'ring-cyan-400');
          setTimeout(() => card.classList.remove('ring-2', 'ring-cyan-400'), 1800);
        }
      });
    });

    // Live-Rechner Events
    this.root.querySelectorAll<HTMLButtonElement>('[data-calc-supply]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.calcSupplyV = Number(btn.dataset.calcSupply);
        this.renderCalculatorResult();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-calc-vf]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.calcLedVf = Number(btn.dataset.calcVf);
        this.renderCalculatorResult();
      });
    });
    const currentSlider = this.root.querySelector<HTMLInputElement>('[data-calc-current]');
    const currentLabel = this.root.querySelector<HTMLElement>('[data-calc-current-label]');
    currentSlider?.addEventListener('input', () => {
      this.calcCurrentMa = Number(currentSlider.value);
      if (currentLabel) currentLabel.textContent = `${this.calcCurrentMa} mA`;
      this.renderCalculatorResult();
    });

    // Event-Delegation für "In 3D ausprobieren"
    this.listEl?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-try-mode]');
      if (!btn) return;
      const mode = btn.dataset.tryMode as AppMode;
      const lessonId = btn.dataset.tryLesson || undefined;
      this.callbacks.onTryInApp(mode, lessonId);
    });
  }

  private renderPolarityLab(): void {
    if (!this.polarityLabEl) return;

    const rev = this.polarityReversed;
    const part = this.polarityPart;

    const ledCfg =
      this.polarityLedColor === 'green'
        ? { hex: '#22c55e', glow: '#4ade80', dark: '#064e3b', vf: 2.2, name: 'Grün' }
        : this.polarityLedColor === 'blue'
          ? { hex: '#3b82f6', glow: '#60a5fa', dark: '#1e3a8a', vf: 3.0, name: 'Blau' }
          : { hex: '#ef4444', glow: '#f87171', dark: '#450a0a', vf: 2.0, name: 'Rot' };

    const ledCurrentMa = rev ? 0 : Math.max(0, ((3.3 - ledCfg.vf) / 220) * 1000);
    const diodeCurrentMa = rev ? 0 : ((3.3 - 0.7) / 220) * 1000;

    // Bauteil-spezifische Status-Texte
    let statusTitle = '';
    let statusText = '';
    let statusCls = '';
    let symbolHint = '';

    if (part === 'led') {
      symbolHint = 'Schaltzeichen ──►|── : Der Pfeil zeigt von Anode (+) zur Kathode (−); die Querwand | ist die Kathode!';
      if (!rev) {
        statusTitle = `✅ DURCHLASSRICHTUNG · ${ledCurrentMa.toFixed(1)} mA · LED (${ledCfg.name}) leuchtet!`;
        statusText =
          'Plus (+3,3 V über 220 Ω) liegt an der Anode (langer Fuß), Minus (GND) an der Kathode (kurzer Fuß & flache Kante). Der Strom fließt ungehindert in Pfeilrichtung!';
        statusCls = 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300';
      } else {
        statusTitle = '⛔ SPERRRICHTUNG · 0,0 mA · LED bleibt dunkel!';
        statusText =
          'Die LED ist falsch herum eingesetzt (Plus an der Kathode / Sperrwand). Eine Diode wirkt wie ein Rückschlagventil — bei 3,3 V geht sie nicht kaputt, leuchtet aber einfach nicht! Klicke auf „Umdrehen“!';
        statusCls = 'bg-amber-500/15 border-amber-400/50 text-amber-300';
      }
    } else if (part === 'diode') {
      symbolHint = 'Silberner Ring am schwarzen Gehäuse = IMMER die Kathode (− / Ausgangs-Strich im Symbol ►|)!';
      if (!rev) {
        statusTitle = `✅ DURCHLASSRICHTUNG · ${diodeCurrentMa.toFixed(1)} mA · Ventil offen (Vf ≈ 0,7 V)`;
        statusText =
          'Strom fließt von der Anode (+) durch die 1N4007-Diode Richtung silberner Ring (Kathode −) nach GND. Ideal als Verpolungsschutz oder Freilaufdiode!';
        statusCls = 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300';
      } else {
        statusTitle = '⛔ SPERRRICHTUNG · 0,0 mA · Ventil geschlossen!';
        statusText =
          'Der silberne Ring (Kathode) zeigt Richtung Pluspol — die Diode blockiert den Strom komplett (bis zu 1000 V Sperrspannung bei der 1N4007!).';
        statusCls = 'bg-amber-500/15 border-amber-400/50 text-amber-300';
      }
    } else {
      symbolHint = 'Elko-Regel: Langer Fuß = Plus (+ Anode), weißer Streifen mit „− − −“ & kurzer Fuß = Minus (− Kathode)!';
      if (!rev) {
        statusTitle = '✅ RICHTIG GEPOLT · Elko lädt sicher auf 3,3 V auf!';
        statusText =
          'Plus (+3,3 V) liegt am langen Beinchen, Minus (GND) an der Seite mit dem weißen Minus-Streifen. Die hauchdünne Oxidschicht im Inneren bleibt stabil und puffert Stromspitzen!';
        statusCls = 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300';
      } else {
        statusTitle = '🚨 GEFAHR: ELKO VERPOLT! Überhitzung & Kurzschluss!';
        statusText =
          'Anders als eine LED verzeiht ein Elektrolyt-Kondensator (Elko) keine Verpolung: Die interne Isolierschicht zersetzt sich, der Elko wird heiß, bläht sich auf und kann platzen! Immer auf den weißen Minus-Streifen achten!';
        statusCls = 'bg-red-500/18 border-red-500/60 text-red-300';
      }
    }

    // Interaktives SVG-Schaubild für LED / 1N4007 / Elko
    const buildSvg = (): string => {
      const flowActive = !rev && part !== 'cap';
      const capDanger = rev && part === 'cap';
      const leftLabel = rev ? 'KATHODE (−)' : 'ANODE (+)';
      const rightLabel = rev ? 'ANODE (+)' : 'KATHODE (−)';
      const leftColor = rev ? '#94a3b8' : '#ef4444';
      const rightColor = rev ? '#ef4444' : '#94a3b8';

      let partArtwork = '';

      if (part === 'led') {
        const lit = !rev;
        // Wenn umgedreht, spiegeln wir das LED-Innenleben + Beinchenlängen sauber um x = 310!
        const transform = rev ? 'translate(620, 0) scale(-1, 1)' : '';
        partArtwork = `
          <g transform="${transform}">
            ${
              lit
                ? `<circle cx="310" cy="112" r="78" fill="${ledCfg.glow}" opacity="0.28"/>
                   <circle cx="310" cy="112" r="46" fill="${ledCfg.glow}" opacity="0.48"/>`
                : ''
            }
            <!-- Beinchen: links = langer Fuß (Anode), rechts = kurzer Fuß (Kathode) -->
            <line x1="286" y1="158" x2="286" y2="234" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round"/>
            <line x1="334" y1="158" x2="334" y2="212" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round"/>

            <!-- Epoxid-Gehäuse (links rund, rechts abgeflachte Kante an der Kathode!) -->
            <path d="M 258 158 L 258 104 A 52 52 0 0 1 362 104 L 362 158 Z" fill="${lit ? ledCfg.hex : ledCfg.dark}" fill-opacity="${lit ? '0.88' : '0.78'}" stroke="${ledCfg.glow}" stroke-width="2.5"/>
            <!-- Unterer Kragen: links überstehend, rechts abgeflacht (Flat Spot!) -->
            <rect x="248" y="152" width="114" height="14" rx="4" fill="${lit ? ledCfg.hex : ledCfg.dark}" stroke="${ledCfg.glow}" stroke-width="2"/>
            <!-- Markierung der flachen Kante rechts -->
            <line x1="362" y1="146" x2="362" y2="170" stroke="#fde047" stroke-width="4"/>

            <!-- Sichtbares Innenleben: links schmaler Post (Anode), rechts großer Amboss/Reflektor (Kathode) -->
            <path d="M 284 156 L 284 114 L 296 106 L 296 122 L 290 128 L 290 156 Z" fill="#cbd5e1"/>
            <path d="M 336 156 L 336 104 L 306 104 L 314 126 L 328 126 L 328 156 Z" fill="#94a3b8"/>
            <!-- Goldener Bonddraht + leuchtender Chip -->
            <path d="M 290 108 Q 305 88 318 105" fill="none" stroke="#facc15" stroke-width="2.2"/>
            <rect x="313" y="102" width="10" height="6" fill="${lit ? '#ffffff' : '#fbbf24'}"/>
          </g>

          <!-- Erkennungs-Callouts -->
          <text x="${rev ? 445 : 175}" y="196" text-anchor="middle" fill="#fca5a5" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">Langer Fuß = Anode (+)</text>
          <text x="${rev ? 175 : 445}" y="196" text-anchor="middle" fill="#fde047" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">Kurzer Fuß + flache Kante</text>
          <text x="${rev ? 175 : 445}" y="211" text-anchor="middle" fill="#cbd5e1" font-family="JetBrains Mono, monospace" font-size="10">große Fahne innen = Kathode (−)</text>
        `;
      } else if (part === 'diode') {
        const transform = rev ? 'translate(620, 0) scale(-1, 1)' : '';
        partArtwork = `
          <g transform="${transform}">
            <line x1="210" y1="138" x2="410" y2="138" stroke="#cbd5e1" stroke-width="6"/>
            <!-- Schwarzer 1N4007 Zylinder -->
            <rect x="248" y="108" width="124" height="60" rx="10" fill="#111827" stroke="#475569" stroke-width="2.5"/>
            <!-- Silberner Kathoden-Ring rechts! -->
            <rect x="336" y="109" width="22" height="58" fill="#e2e8f0"/>
            <text x="292" y="143" text-anchor="middle" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="13" font-weight="800">1N4007</text>
          </g>
          <text x="${rev ? 185 : 435}" y="94" text-anchor="middle" fill="#fde047" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">Silberner Ring = Kathode (−)</text>
          <text x="${rev ? 435 : 185}" y="94" text-anchor="middle" fill="#fca5a5" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">Schwarze Seite = Anode (+)</text>
        `;
      } else {
        const transform = rev ? 'translate(620, 0) scale(-1, 1)' : '';
        partArtwork = `
          <g transform="${transform}">
            ${
              capDanger
                ? `<circle cx="310" cy="118" r="68" fill="#ef4444" opacity="0.32"/>`
                : ''
            }
            <!-- Beinchen: links lang (+), rechts kurz (−) -->
            <line x1="286" y1="164" x2="286" y2="232" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round"/>
            <line x1="334" y1="164" x2="334" y2="210" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round"/>
            <!-- Blauer Elko-Körper -->
            <rect x="256" y="64" width="108" height="104" rx="12" fill="#1e3a8a" stroke="${capDanger ? '#ef4444' : '#60a5fa'}" stroke-width="3"/>
            <!-- Silberner Deckel oben -->
            <rect x="262" y="60" width="96" height="12" rx="4" fill="#cbd5e1"/>
            <!-- Weißer Minus-Streifen rechts (Kathode!) -->
            <rect x="330" y="66" width="28" height="100" rx="4" fill="#e2e8f0"/>
            <text x="344" y="102" text-anchor="middle" fill="#0f172a" font-family="JetBrains Mono, monospace" font-size="22" font-weight="900">−</text>
            <text x="344" y="138" text-anchor="middle" fill="#0f172a" font-family="JetBrains Mono, monospace" font-size="22" font-weight="900">−</text>
            <text x="292" y="114" text-anchor="middle" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="13" font-weight="800">100 µF</text>
            <text x="292" y="134" text-anchor="middle" fill="#93c5fd" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">16V</text>
          </g>
          <text x="${rev ? 445 : 175}" y="196" text-anchor="middle" fill="#fca5a5" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">Langer Fuß = Plus (+)</text>
          <text x="${rev ? 175 : 445}" y="196" text-anchor="middle" fill="#fde047" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">Weißer Minus-Streifen (−)</text>
          ${
            capDanger
              ? `<text x="310" y="44" text-anchor="middle" fill="#fca5a5" font-family="JetBrains Mono, monospace" font-size="14" font-weight="900">🔥 ÜBERHITZUNG / VERPOLT!</text>`
              : ''
          }
        `;
      }

      return `
        <svg viewBox="0 0 620 264" class="w-full h-auto rounded-xl bg-slate-950/75 border border-slate-700/60 select-none">
          <!-- Stromkreis-Leitungen: links +3,3V (Rot), rechts GND (Blau/Grau) -->
          <rect x="18" y="116" width="72" height="44" rx="10" fill="rgba(239,68,68,0.18)" stroke="#ef4444" stroke-width="2"/>
          <text x="54" y="135" text-anchor="middle" fill="#fca5a5" font-family="JetBrains Mono, monospace" font-size="12" font-weight="800">+3,3 V</text>
          <text x="54" y="151" text-anchor="middle" fill="#ef4444" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">PLUS (+)</text>

          <rect x="530" y="116" width="72" height="44" rx="10" fill="rgba(148,163,184,0.18)" stroke="#94a3b8" stroke-width="2"/>
          <text x="566" y="135" text-anchor="middle" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="12" font-weight="800">GND</text>
          <text x="566" y="151" text-anchor="middle" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">MINUS (−)</text>

          <!-- Anschluss-Drähte -->
          <path d="M 90 138 L 210 138" fill="none" stroke="#ef4444" stroke-width="4" stroke-dasharray="${flowActive ? '10 6' : 'none'}"/>
          <path d="M 410 138 L 530 138" fill="none" stroke="#64748b" stroke-width="4" stroke-dasharray="${flowActive ? '10 6' : 'none'}"/>

          <!-- Stromrichtungspfeile oder Sperr-Symbol -->
          ${
            flowActive
              ? `<polygon points="154,129 170,138 154,147" fill="#4ade80"/>
                 <polygon points="462,129 478,138 462,147" fill="#4ade80"/>
                 <text x="155" y="121" text-anchor="middle" fill="#4ade80" font-family="JetBrains Mono, monospace" font-size="10" font-weight="800">Strom fließt →</text>`
              : rev && part !== 'cap'
                ? `<line x1="205" y1="118" x2="205" y2="158" stroke="#f59e0b" stroke-width="5"/>
                   <text x="155" y="121" text-anchor="middle" fill="#fbbf24" font-family="JetBrains Mono, monospace" font-size="10" font-weight="800">⛔ GESPERRT!</text>`
                : ''
          }

          <!-- Links / Rechts Pol-Badges direkt am Bauteil -->
          <rect x="112" y="16" width="128" height="26" rx="7" fill="${leftColor}22" stroke="${leftColor}" stroke-width="1.5"/>
          <text x="176" y="33" text-anchor="middle" fill="${leftColor}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">Links: ${leftLabel}</text>

          <rect x="380" y="16" width="128" height="26" rx="7" fill="${rightColor}22" stroke="${rightColor}" stroke-width="1.5"/>
          <text x="444" y="33" text-anchor="middle" fill="${rightColor}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">Rechts: ${rightLabel}</text>

          <!-- Schaltzeichen-Miniatur unten mittig -->
          <g transform="translate(262, 232)">
            <line x1="0" y1="12" x2="96" y2="12" stroke="#64748b" stroke-width="2.5"/>
            ${
              part === 'cap'
                ? `<line x1="42" y1="1" x2="42" y2="23" stroke="#fca5a5" stroke-width="3.5"/>
                   <path d="M 56 1 Q 50 12 56 23" fill="none" stroke="#94a3b8" stroke-width="3.5"/>`
                : `<g transform="${rev ? 'translate(96,0) scale(-1,1)' : ''}">
                     <polygon points="34,2 34,22 58,12" fill="${!rev ? '#4ade80' : '#475569'}" stroke="#e2e8f0" stroke-width="1.8"/>
                     <line x1="60" y1="2" x2="60" y2="22" stroke="#fde047" stroke-width="3.5"/>
                   </g>`
            }
          </g>

          ${partArtwork}
        </svg>
      `;
    };

    this.polarityLabEl.innerHTML = `
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
            💡 Interaktives Polaritäts-Labor: Anode (+) vs. Kathode (−)
          </div>
          <p class="mt-0.5 text-xs eng-text-muted">
            Klicke auf <strong>„Bauteil umdrehen“</strong> und sieh sofort, was bei LED, Diode und Elko passiert, wenn Anode und Kathode vertauscht werden!
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-1.5 shrink-0">
          ${(
            [
              { id: 'led', label: '💡 5mm-LED' },
              { id: 'diode', label: '➡️ 1N4007-Diode' },
              { id: 'cap', label: '⚡ Elko' },
            ] as const
          )
            .map((p) => {
              const active = this.polarityPart === p.id;
              return `
                <button type="button" data-pol-part="${p.id}" class="px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                  active
                    ? 'bg-amber-500/22 border-amber-400 text-amber-300'
                    : 'eng-btn-neutral'
                }">${p.label}</button>
              `;
            })
            .join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <!-- Interaktives Schaubild -->
        <div class="lg:col-span-7 flex flex-col gap-2">
          ${buildSvg()}
          <div class="text-[11px] font-mono eng-text-muted text-center">${symbolHint}</div>
        </div>

        <!-- Steuerung, Live-Status & Eselsbrücken -->
        <div class="lg:col-span-5 flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-pol-action="flip"
              class="flex-1 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                rev
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                  : 'bg-cyan-500/20 border-cyan-400 eng-text-accent hover:bg-cyan-500/30'
              }"
            >
              🔄 Bauteil umdrehen (${rev ? 'aktuell VERPOLT' : 'aktuell RICHTIG'})
            </button>
            ${
              part === 'led'
                ? `
              <div class="flex items-center gap-1">
                ${(
                  [
                    { id: 'red', label: '🔴' },
                    { id: 'green', label: '🟢' },
                    { id: 'blue', label: '🔵' },
                  ] as const
                )
                  .map(
                    (c) => `
                  <button type="button" data-pol-color="${c.id}" class="px-2 py-2 rounded-xl border text-xs cursor-pointer ${
                    this.polarityLedColor === c.id
                      ? 'bg-slate-700/80 border-cyan-400'
                      : 'eng-btn-neutral'
                  }">${c.label}</button>
                `,
                  )
                  .join('')}
              </div>
            `
                : ''
            }
          </div>

          <div data-pol-status class="rounded-xl border p-3.5 ${statusCls}">
            <div class="text-xs font-bold">${statusTitle}</div>
            <p class="mt-1 text-xs leading-relaxed opacity-95">${statusText}</p>
          </div>

          <!-- Die 2 wichtigsten Eselsbrücken -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 text-xs">
            <div class="rounded-xl bg-red-500/10 border border-red-500/35 p-2.5">
              <div class="font-bold text-red-400">➕ ANODE (Pluspol)</div>
              <div class="mt-0.5 text-[11.5px] eng-text-body">
                <strong>A</strong>nfang des Stroms · <strong>langer Fuß</strong> · schmaler Träger innen · runde Kante.
              </div>
            </div>
            <div class="rounded-xl bg-slate-500/12 border border-slate-400/35 p-2.5">
              <div class="font-bold text-amber-300">➖ KATHODE (Minuspol)</div>
              <div class="mt-0.5 text-[11.5px] eng-text-body">
                <strong>K</strong>urzer Fuß · <strong>K</strong>ante (flach) · große Fahne innen · silberner Ring / weißer „−“-Streifen.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.polarityLabEl.querySelectorAll<HTMLButtonElement>('[data-pol-part]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.polarityPart = btn.dataset.polPart as 'led' | 'diode' | 'cap';
        this.polarityReversed = false;
        this.renderPolarityLab();
      });
    });

    this.polarityLabEl.querySelector('[data-pol-action="flip"]')?.addEventListener('click', () => {
      this.polarityReversed = !this.polarityReversed;
      this.renderPolarityLab();
    });

    this.polarityLabEl.querySelectorAll<HTMLButtonElement>('[data-pol-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.polarityLedColor = btn.dataset.polColor as 'red' | 'green' | 'blue';
        this.renderPolarityLab();
      });
    });
  }

  private renderCategoryPills(): void {
    if (!this.catWrapEl) return;
    const allTabs: Array<{ id: 'ALL' | GlossaryCategory; label: string; count: number }> = [
      { id: 'ALL', label: 'Alle Themen', count: GLOSSARY_ENTRIES.length },
      ...GLOSSARY_CATEGORIES.map((cat) => ({
        id: cat,
        label: cat,
        count: GLOSSARY_ENTRIES.filter((e) => e.category === cat).length,
      })),
    ];

    this.catWrapEl.innerHTML = allTabs
      .map((t) => {
        const active = this.activeCategory === t.id;
        const cls = active
          ? 'bg-cyan-500/20 border-cyan-400 eng-text-accent font-bold'
          : 'eng-btn-neutral font-medium';
        return `
          <button type="button" data-glossary-cat="${t.id}" class="px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer transition ${cls}">
            ${t.label} <span class="font-mono opacity-75">(${t.count})</span>
          </button>
        `;
      })
      .join('');

    this.catWrapEl.querySelectorAll<HTMLButtonElement>('[data-glossary-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.glossaryCat as 'ALL' | GlossaryCategory;
        this.renderCategoryPills();
        this.renderEntries();
      });
    });
  }

  private renderCalculatorResult(): void {
    // Active button states
    this.root.querySelectorAll<HTMLButtonElement>('[data-calc-supply]').forEach((btn) => {
      const active = Number(btn.dataset.calcSupply) === this.calcSupplyV;
      btn.className = active
        ? 'flex-1 px-2 py-1 rounded-lg border font-mono text-[11px] cursor-pointer transition bg-cyan-500/20 border-cyan-400 eng-text-accent font-bold'
        : 'flex-1 px-2 py-1 rounded-lg border font-mono text-[11px] cursor-pointer transition eng-btn-neutral';
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-calc-vf]').forEach((btn) => {
      const active = Number(btn.dataset.calcVf) === this.calcLedVf;
      btn.className = active
        ? 'flex-1 px-1.5 py-1 rounded-lg border font-mono text-[10.5px] cursor-pointer transition bg-emerald-500/20 border-emerald-400 text-emerald-400 font-bold'
        : 'flex-1 px-1.5 py-1 rounded-lg border font-mono text-[10.5px] cursor-pointer transition eng-btn-neutral';
    });

    if (!this.calcResultEl) return;

    const uDrop = Math.max(0.1, this.calcSupplyV - this.calcLedVf);
    const iAmp = this.calcCurrentMa / 1000;
    const exactOhms = uDrop / iAmp;
    const stdOhms = nextStandardE12(exactOhms);
    const actualMa = (uDrop / stdOhms) * 1000;
    const powerMw = uDrop * actualMa;
    const bands = getResistorColorBands(stdOhms);

    this.calcResultEl.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-[10px] font-mono uppercase eng-text-muted">Empfohlener Standard-Widerstand (E12)</div>
          <div class="text-base font-mono font-bold text-emerald-400 flex items-baseline gap-2">
            <span>${formatResistance(stdOhms)}</span>
            <span class="text-[11px] font-normal eng-text-muted">(exakt: ${Math.round(exactOhms)} Ω · real: ${actualMa.toFixed(1)} mA · ${powerMw.toFixed(0)} mW)</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#dfb885]/20 border border-amber-500/30" title="IEC 60062 Farbringe">
          ${bands
            .map(
              (b) => `
            <span class="flex flex-col items-center gap-0.5">
              <span class="w-3.5 h-5 rounded-xs border border-black/40 inline-block" style="background:${b.hex}"></span>
              <span class="text-[8.5px] font-mono eng-text-muted">${b.name.slice(0, 3)}</span>
            </span>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderEntries(): void {
    if (!this.listEl || !this.countEl) return;

    const filtered = GLOSSARY_ENTRIES.filter((entry) => {
      if (this.activeCategory !== 'ALL' && entry.category !== this.activeCategory) return false;
      if (!this.searchQuery) return true;
      const hay = `${entry.term} ${entry.shortSubtitle} ${entry.quickAnswer} ${entry.explanation} ${entry.analogyOrTip} ${entry.formulaOrValues ?? ''} ${entry.category}`.toLowerCase();
      return hay.includes(this.searchQuery);
    });

    this.countEl.textContent = `${filtered.length} von ${GLOSSARY_ENTRIES.length} Begriffen`;

    if (filtered.length === 0) {
      this.listEl.innerHTML = `
        <div class="col-span-full eng-card rounded-2xl border p-8 text-center">
          <div class="text-2xl">🔍</div>
          <div class="mt-2 text-sm font-bold eng-text-main">Kein Fachbegriff gefunden</div>
          <p class="mt-1 text-xs eng-text-muted">Probiere z. B. „Pull“, „Widerstand“, „MOSFET“, „PWM“, „I²C“ oder „Akku“.</p>
        </div>
      `;
      return;
    }

    this.listEl.innerHTML = filtered.map((e) => this.renderCard(e)).join('');
  }

  private renderCard(e: GlossaryEntry): string {
    return `
      <article
        data-glossary-card="${e.id}"
        class="eng-card rounded-2xl border p-4 flex flex-col justify-between gap-3 transition"
      >
        <div class="flex flex-col gap-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border" style="background:${e.accentHex}18;border-color:${e.accentHex}55">
                ${e.icon}
              </span>
              <div class="min-w-0">
                <h3 class="text-sm font-bold eng-text-main leading-snug">${e.term}</h3>
                <div class="text-[11px] eng-text-muted leading-snug">${e.shortSubtitle}</div>
              </div>
            </div>
            <span class="text-[9.5px] font-mono px-2 py-0.5 rounded-md border shrink-0" style="color:${e.accentHex};background:${e.accentHex}16;border-color:${e.accentHex}45">
              ${e.category.split(' ')[0].replace(/,$/, '')}
            </span>
          </div>

          <div class="rounded-xl px-3 py-2 border text-xs leading-relaxed" style="background:${e.accentHex}12;border-color:${e.accentHex}35">
            <span class="font-bold eng-text-main">Kurz gesagt:</span>
            <span class="eng-text-body"> ${e.quickAnswer}</span>
          </div>

          <p class="text-xs eng-text-body leading-relaxed">${e.explanation}</p>

          <div class="text-[11.5px] eng-text-muted leading-relaxed bg-slate-900/35 border border-slate-500/20 rounded-xl px-3 py-2">
            💡 ${e.analogyOrTip}
          </div>

          ${
            e.formulaOrValues
              ? `<div class="text-[11px] font-mono eng-text-accent bg-slate-950/45 border border-slate-500/25 rounded-lg px-3 py-1.5">
                   📐 ${e.formulaOrValues}
                 </div>`
              : ''
          }
        </div>

        ${
          e.tryAction
            ? `
          <div class="pt-2 border-t border-slate-500/20 flex justify-end">
            <button
              type="button"
              data-try-mode="${e.tryAction.mode}"
              data-try-lesson="${e.tryAction.lessonId ?? ''}"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition bg-cyan-500/15 border-cyan-500/45 eng-text-accent hover:bg-cyan-500/25 flex items-center gap-1.5"
            >
              <span>🚀</span>
              <span>${e.tryAction.label}</span>
            </button>
          </div>
        `
            : ''
        }
      </article>
    `;
  }
}
