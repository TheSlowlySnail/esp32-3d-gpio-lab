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

  private initialized = false;
  private listEl: HTMLElement | null = null;
  private countEl: HTMLElement | null = null;
  private calcResultEl: HTMLElement | null = null;
  private catWrapEl: HTMLElement | null = null;

  constructor(root: HTMLElement, callbacks: GlossaryCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
  }

  public render(): void {
    if (!this.initialized) {
      this.buildShell();
      this.initialized = true;
    }
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
