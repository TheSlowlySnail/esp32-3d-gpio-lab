interface SolderPad {
  id: string;
  label: string;
  partName: string;
  x: number; // 0..760 logical canvas coords
  y: number; // 0..380
  tempC: number;
  solderAmount: number; // 0..1.35 (ideal: 0.55..0.95)
  heatSeconds: number;
  burned: boolean;
  status: 'empty' | 'perfect' | 'cold' | 'blob' | 'burned';
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
}

/**
 * Interaktiver Löt-Trainer & Praxis-Guide ("🔥 Löten"):
 * Echte 2D-Übungsplatine mit 8 Pads, Temperatur-Regler (250–450 °C),
 * Bleifrei vs. Bleihaltig, Flussmittel, Live-Hitze, Rauch & Lötstellen-Bewertung!
 */
export class SolderingView {
  private readonly container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private ironTempC = 350;
  private solderType: 'lead-free' | 'leaded' = 'lead-free';
  private fluxEnabled = true;
  private autoFeed = true;

  private pointerX = 380;
  private pointerY = 190;
  private pointerInside = false;
  private isHeating = false;
  private isFeedingManual = false;
  private activePadId: string | null = null;
  private lastFeedback =
    'Führe den Lötkolben über ein goldenes Pad und halte die linke Maustaste 2–3 Sekunden gedrückt!';
  private lastFeedbackTone: 'info' | 'ok' | 'warn' | 'danger' = 'info';

  private pads: SolderPad[] = [];
  private smoke: SmokeParticle[] = [];
  private rafId = 0;
  private lastFrameMs = performance.now();
  private running = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.resetPads();
    this.render();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private resetPads(): void {
    this.pads = [
      { id: 'p1', label: 'R1-A', partName: 'Widerstand 220 Ω', x: 130, y: 120, tempC: 24, solderAmount: 0, heatSeconds: 0, burned: false, status: 'empty' },
      { id: 'p2', label: 'R1-B', partName: 'Widerstand 220 Ω', x: 250, y: 120, tempC: 24, solderAmount: 0, heatSeconds: 0, burned: false, status: 'empty' },
      { id: 'p3', label: 'LED+', partName: '5mm LED Anode', x: 400, y: 120, tempC: 24, solderAmount: 0, heatSeconds: 0, burned: false, status: 'empty' },
      { id: 'p4', label: 'LED−', partName: '5mm LED Kathode', x: 485, y: 120, tempC: 24, solderAmount: 0, heatSeconds: 0, burned: false, status: 'empty' },
      { id: 'p5', label: 'C1+', partName: 'Elko 100 µF (+)', x: 615, y: 120, tempC: 24, solderAmount: 0, heatSeconds: 0, burned: false, status: 'empty' },
      { id: 'p6', label: 'PIN1', partName: 'Stiftleiste 3V3', x: 205, y: 268, tempC: 24, solderAmount: 0, heatSeconds: 0, burned: false, status: 'empty' },
      { id: 'p7', label: 'PIN2', partName: 'Stiftleiste GPIO', x: 380, y: 268, tempC: 24, solderAmount: 0, heatSeconds: 0, burned: false, status: 'empty' },
      { id: 'p8', label: 'PIN3', partName: 'Stiftleiste GND', x: 555, y: 268, tempC: 24, solderAmount: 0, heatSeconds: 0, burned: false, status: 'empty' },
    ];
    this.smoke = [];
    this.lastFeedback =
      'Übungsplatine zurückgesetzt! Tipp: Halte die Spitze 2–3 Sekunden auf ein Pad, bis ein glänzender Kegel entsteht.';
    this.lastFeedbackTone = 'info';
  }

  public setActive(active: boolean): void {
    if (active && !this.running) {
      this.running = true;
      this.lastFrameMs = performance.now();
      this.loop();
    } else if (!active && this.running) {
      this.running = false;
      cancelAnimationFrame(this.rafId);
    }
  }

  public render(): void {
    const perfectCount = this.pads.filter((p) => p.status === 'perfect').length;
    const meltC = this.solderType === 'lead-free' ? 227 : 183;

    this.container.innerHTML = `
      <div class="max-w-7xl mx-auto p-5 sm:p-6 flex flex-col gap-5">
        <!-- Hero Header -->
        <div class="eng-card rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xl">🔥</span>
              <h2 class="text-base sm:text-lg font-bold eng-text-main tracking-tight">
                Löt-Werkstatt &amp; Interaktiver Löt-Trainer
              </h2>
              <span data-solder-score class="text-[10.5px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-orange-500/18 text-orange-400 border border-orange-500/45 font-bold">
                ${perfectCount} / ${this.pads.length} perfekte Lötstellen
              </span>
            </div>
            <p class="text-xs sm:text-[13px] eng-text-body max-w-3xl leading-relaxed">
              Übe das richtige Timing, die ideale Temperatur und erkenne typische Fehler (kalte Lötstelle, Zinn-Kugel oder verbranntes Pad) direkt auf deiner virtuellen FR-4-Platine!
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" data-solder-demo class="px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold cursor-pointer">
              ✨ Beispiel-Pad perfekt löten
            </button>
            <button type="button" data-solder-reset class="eng-btn-neutral px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer">
              ↺ Platine entlöten
            </button>
          </div>
        </div>

        <!-- Main Simulator Grid: PCB Canvas + Lötstation-Steuerung -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <!-- Left: Interactive PCB Canvas -->
          <div class="lg:col-span-8 eng-card rounded-2xl border p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-xs font-bold eng-text-main">Interaktive FR-4 Übungsplatine (8 Durchkontaktierungen)</span>
              <span class="text-[11px] font-mono eng-text-muted">
                ${this.autoFeed ? 'Linksklick halten = Heizen + Zinn zuführen' : 'Linksklick halten = Heizen · Leertaste = Zinn zuführen'}
              </span>
            </div>

            <div class="relative rounded-xl overflow-hidden border border-emerald-500/35 bg-[#081511] select-none">
              <canvas data-solder-canvas class="w-full aspect-[2/1] block cursor-crosshair"></canvas>
            </div>

            <!-- Live Feedback Banner -->
            <div data-solder-feedback class="rounded-xl border px-3.5 py-2.5 text-xs font-medium leading-relaxed border-cyan-500/40 bg-cyan-500/10 eng-text-main">
              ${this.lastFeedback}
            </div>
          </div>

          <!-- Right: Konfigurierbare Lötstation -->
          <div class="lg:col-span-4 eng-card rounded-2xl border p-4 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider eng-text-accent font-mono">Lötstation (Konfigurierbar)</span>
              <span data-solder-temp-badge class="text-sm font-mono font-bold px-2.5 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-400">
                ${this.ironTempC} °C
              </span>
            </div>

            <!-- Temperatur-Regler -->
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between text-xs">
                <span class="eng-text-body">Spitzen-Temperatur</span>
                <span class="font-mono eng-text-muted">Schmelzpunkt: ${meltC} °C</span>
              </div>
              <input data-solder-temp type="range" min="240" max="450" step="5" value="${this.ironTempC}" class="eng-slider" />
              <div class="grid grid-cols-3 gap-1.5 mt-1">
                <button type="button" data-temp-preset="300" class="eng-btn-neutral py-1 rounded border text-[10.5px] font-mono cursor-pointer">300 °C (Pb)</button>
                <button type="button" data-temp-preset="350" class="eng-btn-neutral py-1 rounded border text-[10.5px] font-mono cursor-pointer">350 °C (Ideal)</button>
                <button type="button" data-temp-preset="435" class="eng-btn-neutral py-1 rounded border text-[10.5px] font-mono text-red-400 cursor-pointer">435 °C (Heiß!)</button>
              </div>
            </div>

            <!-- Lötzinn-Legierung -->
            <div class="flex flex-col gap-1.5">
              <span class="text-xs eng-text-body">Lötzinn-Legierung</span>
              <div class="grid grid-cols-2 gap-1.5">
                <button type="button" data-solder-alloy="lead-free" class="py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                  this.solderType === 'lead-free'
                    ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent'
                    : 'eng-btn-neutral'
                }">Bleifrei (227 °C)</button>
                <button type="button" data-solder-alloy="leaded" class="py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                  this.solderType === 'leaded'
                    ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent'
                    : 'eng-btn-neutral'
                }">Bleihaltig (183 °C)</button>
              </div>
            </div>

            <!-- Flussmittel & Zinn-Modus -->
            <div class="grid grid-cols-2 gap-1.5">
              <button type="button" data-solder-flux class="py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                this.fluxEnabled
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/50 text-amber-400'
              }">Flussmittel: ${this.fluxEnabled ? 'EIN ✓' : 'AUS'}</button>
              <button type="button" data-solder-autofeed class="py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                this.autoFeed
                  ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent'
                  : 'eng-btn-neutral'
              }">Zinn: ${this.autoFeed ? 'Auto' : 'Leertaste'}</button>
            </div>

            <!-- Pad-Übersicht -->
            <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-500/20">
              <span class="text-[10.5px] font-mono uppercase tracking-wider eng-text-muted font-bold">Lötstellen-Check (8 Pads)</span>
              <div data-solder-pad-grid class="grid grid-cols-2 gap-1.5"></div>
            </div>
          </div>
        </div>

        <!-- Praxis-Wissen: 5 Goldene Regeln + Fehler-Diagnose -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="eng-card rounded-2xl border p-5 flex flex-col gap-3">
            <h3 class="text-sm font-bold eng-text-main flex items-center gap-2">
              <span>🏆</span> Die 5 Goldenen Löt-Regeln für ESP32, Arduino &amp; Pi
            </h3>
            <ol class="flex flex-col gap-2 text-xs eng-text-body leading-relaxed list-decimal list-inside">
              <li><strong class="eng-text-main">Pad + Bauteilbein gleichzeitig erhitzen:</strong> Spitze leicht schräg (45°) an Kupferring UND Pin anlegen — nie nur das Lötzinn auf der Spitze schmelzen!</li>
              <li><strong class="eng-text-main">Die 2–3-Sekunden-Regel:</strong> 1 s vorwärmen → 1 s Zinn ans heiße Pad schieben → Zinn weg → 0,5 s warten → Kolben weg.</li>
              <li><strong class="eng-text-main">Flussmittel ist dein bester Freund:</strong> Entfernt unsichtbare Oxidschichten und lässt das Zinn blitzschnell wie Wasser in die Bohrung fließen.</li>
              <li><strong class="eng-text-main">Saubere Spitze (Messingwolle statt nassem Schwamm):</strong> Eine glänzend verzinnte Spitze überträgt Wärme 5× besser als eine schwarze, oxidierte Spitze.</li>
              <li><strong class="eng-text-main">Ruhig halten beim Abkühlen:</strong> 2 Sekunden nach dem Wegziehen nicht wackeln — sonst entsteht sofort eine matte, brüchige kalte Lötstelle!</li>
            </ol>
          </div>

          <div class="eng-card rounded-2xl border p-5 flex flex-col gap-3">
            <h3 class="text-sm font-bold eng-text-main flex items-center gap-2">
              <span>🔍</span> Lötstellen-Fehler erkennen &amp; retten
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div class="eng-card-soft rounded-xl border border-emerald-500/35 p-3">
                <div class="font-bold text-emerald-400">✅ Perfekter Kegel (Vulkan)</div>
                <p class="text-[11px] eng-text-body mt-1 leading-relaxed">Glänzend, leicht nach innen gewölbt (konkav), umschließt Pin &amp; Pad komplett — elektrisch &amp; mechanisch top!</p>
              </div>
              <div class="eng-card-soft rounded-xl border border-sky-500/35 p-3">
                <div class="font-bold text-sky-400">❄️ Kalte Lötstelle</div>
                <p class="text-[11px] eng-text-body mt-1 leading-relaxed">Matt, krümelig oder gerissen (zu kalt / gewackelt). Rettung: Frisches Flussmittel drauf und 2 s sauber nachlöten!</p>
              </div>
              <div class="eng-card-soft rounded-xl border border-amber-500/35 p-3">
                <div class="font-bold text-amber-400">🫧 Zinn-Kugel / Brücke</div>
                <p class="text-[11px] eng-text-body mt-1 leading-relaxed">Zu viel Lötzinn → Kurzschluss-Gefahr zum Nachbar-Pin! Rettung: Überschuss mit <strong>Entlötlitze</strong> oder Entlötpumpe absaugen.</p>
              </div>
              <div class="eng-card-soft rounded-xl border border-red-500/35 p-3">
                <div class="font-bold text-red-400">🔥 Verbranntes Pad</div>
                <p class="text-[11px] eng-text-body mt-1 leading-relaxed">Über 410 °C oder zu lange erhitzt → Kleber löst Kupferring vom FR-4! Immer bei 320–360 °C arbeiten und Pausen lassen.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('[data-solder-canvas]');
    this.ctx = this.canvas?.getContext('2d') ?? null;
    this.bindUi();
    this.updatePadGridUi();
    this.drawBoard();
  }

  private bindUi(): void {
    const tempInput = this.container.querySelector<HTMLInputElement>('[data-solder-temp]');
    tempInput?.addEventListener('input', () => {
      this.ironTempC = Number(tempInput.value);
      const badge = this.container.querySelector('[data-solder-temp-badge]');
      if (badge) badge.textContent = `${this.ironTempC} °C`;
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-temp-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.ironTempC = Number(btn.dataset.tempPreset);
        if (tempInput) tempInput.value = String(this.ironTempC);
        const badge = this.container.querySelector('[data-solder-temp-badge]');
        if (badge) badge.textContent = `${this.ironTempC} °C`;
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-solder-alloy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.solderType = btn.dataset.solderAlloy as 'lead-free' | 'leaded';
        this.render();
      });
    });

    this.container.querySelector('[data-solder-flux]')?.addEventListener('click', () => {
      this.fluxEnabled = !this.fluxEnabled;
      this.render();
    });

    this.container.querySelector('[data-solder-autofeed]')?.addEventListener('click', () => {
      this.autoFeed = !this.autoFeed;
      this.render();
    });

    this.container.querySelector('[data-solder-reset]')?.addEventListener('click', () => {
      this.resetPads();
      this.updatePadGridUi();
      this.updateFeedbackUi();
    });

    this.container.querySelector('[data-solder-demo]')?.addEventListener('click', () => {
      const target = this.pads.find((p) => p.status !== 'perfect');
      if (target) {
        target.tempC = 340;
        target.solderAmount = 0.78;
        target.heatSeconds = 2.2;
        target.burned = false;
        target.status = 'perfect';
        this.setFeedback(
          `✅ ${target.label} (${target.partName}) perfekt gelötet! Sieh dir den glänzenden Vulkan-Kegel an.`,
          'ok',
        );
        this.updatePadGridUi();
      }
    });

    if (this.canvas) {
      const toBoardCoords = (e: PointerEvent) => {
        const rect = this.canvas!.getBoundingClientRect();
        return {
          x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * 760,
          y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * 380,
        };
      };

      this.canvas.addEventListener('pointermove', (e) => {
        const pt = toBoardCoords(e);
        this.pointerX = pt.x;
        this.pointerY = pt.y;
        this.pointerInside = true;
      });
      this.canvas.addEventListener('pointerleave', () => {
        this.pointerInside = false;
        this.finishHeatingIfActive();
      });
      this.canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const pt = toBoardCoords(e);
        this.pointerX = pt.x;
        this.pointerY = pt.y;
        this.pointerInside = true;
        this.isHeating = true;
        const hit = this.findNearestPad(pt.x, pt.y, 34);
        this.activePadId = hit?.id ?? null;
      });
      window.addEventListener('pointerup', this.onPointerUp);
    }
  }

  private readonly onPointerUp = (): void => {
    this.finishHeatingIfActive();
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && this.running) {
      this.isFeedingManual = true;
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.isFeedingManual = false;
    }
  };

  private findNearestPad(x: number, y: number, maxDist: number): SolderPad | null {
    let best: SolderPad | null = null;
    let bestD = maxDist;
    for (const pad of this.pads) {
      const d = Math.hypot(pad.x - x, pad.y - y);
      if (d < bestD) {
        bestD = d;
        best = pad;
      }
    }
    return best;
  }

  private finishHeatingIfActive(): void {
    if (!this.isHeating) return;
    this.isHeating = false;
    if (!this.activePadId) return;
    const pad = this.pads.find((p) => p.id === this.activePadId);
    this.activePadId = null;
    if (!pad) return;

    if (pad.burned) {
      pad.status = 'burned';
      this.setFeedback(
        `🔥 ${pad.label}: Pad verbrannt! (${this.ironTempC} °C / ${pad.heatSeconds.toFixed(1)} s — zu heiß oder zu lange erhitzt!)`,
        'danger',
      );
    } else if (pad.solderAmount > 1.02) {
      pad.status = 'blob';
      this.setFeedback(
        `🫧 ${pad.label}: Zinn-Kugel (zu viel Lot)! Gefahr einer Kurzschlussbrücke — kürzer zuführen oder mit Entlötlitze retten.`,
        'warn',
      );
    } else if (pad.solderAmount >= 0.5 && pad.tempC >= (this.solderType === 'lead-free' ? 255 : 215)) {
      pad.status = 'perfect';
      const done = this.pads.filter((p) => p.status === 'perfect').length;
      this.setFeedback(
        done === this.pads.length
          ? `🎉 MEISTERHAFT! Alle ${this.pads.length} Lötstellen sind glänzend, sauber und elektrisch perfekt!`
          : `✅ ${pad.label} (${pad.partName}): Perfekte Lötstelle! Glänzender Vulkan-Kegel bei ${Math.round(pad.tempC)} °C.`,
        'ok',
      );
    } else if (pad.solderAmount > 0.08) {
      pad.status = 'cold';
      this.setFeedback(
        `❄️ ${pad.label}: Kalte Lötstelle (zu wenig Wärme/Zinn — ${Math.round(pad.tempC)} °C). Halte 2–3 Sekunden bei 340–360 °C!`,
        'warn',
      );
    }
    this.updatePadGridUi();
  }

  private setFeedback(text: string, tone: 'info' | 'ok' | 'warn' | 'danger'): void {
    this.lastFeedback = text;
    this.lastFeedbackTone = tone;
    this.updateFeedbackUi();
  }

  private updateFeedbackUi(): void {
    const el = this.container.querySelector('[data-solder-feedback]');
    if (!el) return;
    const cls =
      this.lastFeedbackTone === 'ok'
        ? 'border-emerald-500/55 bg-emerald-500/12 text-emerald-300'
        : this.lastFeedbackTone === 'danger'
          ? 'border-red-500/55 bg-red-500/12 text-red-300'
          : this.lastFeedbackTone === 'warn'
            ? 'border-amber-500/55 bg-amber-500/12 text-amber-300'
            : 'border-cyan-500/40 bg-cyan-500/10 eng-text-main';
    el.className = `rounded-xl border px-3.5 py-2.5 text-xs font-medium leading-relaxed ${cls}`;
    el.textContent = this.lastFeedback;
  }

  private updatePadGridUi(): void {
    const scoreEl = this.container.querySelector('[data-solder-score]');
    const perfectCount = this.pads.filter((p) => p.status === 'perfect').length;
    if (scoreEl) {
      scoreEl.textContent = `${perfectCount} / ${this.pads.length} perfekte Lötstellen`;
    }

    const grid = this.container.querySelector('[data-solder-pad-grid]');
    if (!grid) return;
    grid.innerHTML = this.pads
      .map((p) => {
        const badge =
          p.status === 'perfect'
            ? '<span class="text-emerald-400">✅ Perfekt</span>'
            : p.status === 'cold'
              ? '<span class="text-sky-400">❄️ Kalt</span>'
              : p.status === 'blob'
                ? '<span class="text-amber-400">🫧 Kugel</span>'
                : p.status === 'burned'
                  ? '<span class="text-red-400">🔥 Verbrannt</span>'
                  : '<span class="eng-text-muted">○ Offen</span>';
        return `
          <div class="eng-card-soft rounded-lg border px-2 py-1.5 flex items-center justify-between gap-1 text-[10.5px]">
            <span class="font-mono font-bold eng-text-main">${p.label}</span>
            <span class="font-mono">${badge}</span>
          </div>
        `;
      })
      .join('');
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameMs) / 1000);
    this.lastFrameMs = now;

    this.stepPhysics(dt);
    this.drawBoard();
  };

  private stepPhysics(dt: number): void {
    const meltC = this.solderType === 'lead-free' ? 227 : 183;
    const hitPad = this.isHeating ? this.findNearestPad(this.pointerX, this.pointerY, 34) : null;
    if (hitPad) this.activePadId = hitPad.id;

    for (const pad of this.pads) {
      const heatingThis = this.isHeating && hitPad?.id === pad.id;
      if (heatingThis) {
        const heatRate = this.fluxEnabled ? 1.55 : 0.95;
        pad.tempC += (this.ironTempC - pad.tempC) * Math.min(1, dt * heatRate * 1.4);
        pad.heatSeconds += dt;

        // Zinn zuführen sobald Pad warm genug ist
        const feeding = this.autoFeed ? pad.tempC >= meltC : this.isFeedingManual && pad.tempC >= meltC;
        if (feeding && !pad.burned) {
          const flowSpeed = this.fluxEnabled ? 0.42 : 0.24;
          pad.solderAmount = Math.min(1.32, pad.solderAmount + dt * flowSpeed);
        }

        // Verbrennungs-Check bei > 405 °C oder > 5.2 Sekunden Dauerhitze
        if (pad.tempC > 405 || pad.heatSeconds > 5.2) {
          pad.burned = true;
          pad.status = 'burned';
        }

        // Rauchpartikel erzeugen
        if (pad.tempC > 180 && Math.random() < (this.fluxEnabled ? 0.55 : 0.22)) {
          this.smoke.push({
            x: pad.x + (Math.random() - 0.5) * 10,
            y: pad.y - 6,
            vx: (Math.random() - 0.5) * 18,
            vy: -28 - Math.random() * 24,
            alpha: pad.burned ? 0.65 : 0.42,
            size: 4 + Math.random() * 6,
          });
        }
      } else {
        // Abkühlen Richtung Raumtemperatur
        pad.tempC += (24 - pad.tempC) * Math.min(1, dt * 0.9);
      }
    }

    // Rauch updaten
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.size += dt * 11;
      s.alpha -= dt * 0.45;
      if (s.alpha <= 0) this.smoke.splice(i, 1);
    }
  }

  private drawBoard(): void {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 760;
    const H = 380;
    if (this.canvas.width !== W * dpr || this.canvas.height !== H * dpr) {
      this.canvas.width = W * dpr;
      this.canvas.height = H * dpr;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Dunkelgrüne FR-4 Leiterplatte
    ctx.fillStyle = '#0d4a2b';
    ctx.fillRect(0, 0, W, H);

    // Feines Lochraster-Gitter
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let gx = 24; gx < W; gx += 22) {
      for (let gy = 24; gy < H; gy += 22) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Kupfer-Leiterbahnen
    ctx.strokeStyle = '#1b7a48';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const trace = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    trace(130, 120, 205, 268);
    trace(250, 120, 400, 120);
    trace(485, 120, 555, 268);
    trace(615, 120, 555, 268);
    trace(400, 120, 380, 268);

    // Weißer Bestückungsdruck (Silkscreen)
    ctx.strokeStyle = 'rgba(241,245,249,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(150, 96, 80, 48); // R1
    ctx.beginPath();
    ctx.arc(442, 120, 44, 0, Math.PI * 2); // LED1
    ctx.stroke();
    ctx.strokeRect(160, 238, 440, 60); // Header J1

    ctx.fillStyle = 'rgba(248,250,252,0.85)';
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R1 (220 Ω)', 190, 86);
    ctx.fillText('LED1 (5mm)', 442, 66);
    ctx.fillText('C1 (100 µF)', 615, 80);
    ctx.fillText('J1 — 3-PIN STIFTLEISTE (ESP32 / PI / ARDUINO)', 380, 318);

    // Alle 8 Löt-Pads zeichnen
    for (const pad of this.pads) {
      // Brandfleck bei verbranntem Pad
      if (pad.burned) {
        const burnGrad = ctx.createRadialGradient(pad.x, pad.y, 4, pad.x, pad.y, 32);
        burnGrad.addColorStop(0, 'rgba(38,16,6,0.92)');
        burnGrad.addColorStop(1, 'rgba(38,16,6,0)');
        ctx.fillStyle = burnGrad;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, 32, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wärmeglühen beim Erhitzen
      if (pad.tempC > 75) {
        const heatAlpha = Math.min(0.65, (pad.tempC - 75) / 360);
        const hg = ctx.createRadialGradient(pad.x, pad.y, 6, pad.x, pad.y, 28);
        hg.addColorStop(0, `rgba(249,115,22,${heatAlpha})`);
        hg.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, 28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Goldener Kupferring (Pad)
      ctx.fillStyle = pad.burned ? '#57361e' : '#e5b84b';
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 17, 0, Math.PI * 2);
      ctx.fill();

      // Dunkle Bohrung
      ctx.fillStyle = '#081511';
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Lötzinn-Meniskus!
      if (pad.solderAmount > 0.03) {
        const r = 8 + Math.min(1.25, pad.solderAmount) * 12;
        const grad = ctx.createRadialGradient(pad.x - 4, pad.y - 4, 2, pad.x, pad.y, r);
        if (pad.status === 'cold') {
          grad.addColorStop(0, '#94a3b8');
          grad.addColorStop(1, '#475569');
        } else {
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.55, '#cbd5e1');
          grad.addColorStop(1, '#64748b');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Silberner Bauteil-Pin in der Mitte
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Status-Ring & Label
      if (pad.status !== 'empty') {
        ctx.strokeStyle =
          pad.status === 'perfect'
            ? '#22c55e'
            : pad.status === 'cold'
              ? '#38bdf8'
              : pad.status === 'blob'
                ? '#f59e0b'
                : '#ef4444';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, 23, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pad.label, pad.x, pad.y + 37);

      if (pad.tempC > 45) {
        ctx.fillStyle = pad.tempC > 395 ? '#f87171' : '#fb923c';
        ctx.font = 'bold 10.5px JetBrains Mono, monospace';
        ctx.fillText(`${Math.round(pad.tempC)}°C`, pad.x, pad.y - 24);
      }
    }

    // Rauch-Partikel zeichnen
    for (const s of this.smoke) {
      ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lötkolben am Cursor zeichnen!
    if (this.pointerInside) {
      const ix = this.pointerX;
      const iy = this.pointerY;
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(-Math.PI / 4);

      // Spitze (leicht orange glühend bei > 380 °C)
      const tipHot = this.ironTempC > 380;
      ctx.fillStyle = tipHot ? '#fb923c' : '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(24, -6);
      ctx.lineTo(24, 6);
      ctx.closePath();
      ctx.fill();

      // Heizschaft (Edelstahl)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(24, -7, 46, 14);

      // Griff (Blau/Schwarz isoliert)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(70, -11, 78, 22);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(70, -11, 14, 22);
      ctx.restore();
    }

    ctx.restore();
  }

  public dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
