import type { LogicLevel, SimulationResult } from '../engine/types';

function formatDe(value: number, decimals: number): string {
  return value.toFixed(decimals).replace('.', ',');
}

function getLogicBadgeClasses(level: LogicLevel): { bg: string; text: string; dot: string; label: string } {
  switch (level) {
    case 'HIGH':
      return {
        bg: 'bg-emerald-500/15 border-emerald-500/45',
        text: 'text-emerald-600 dark:text-emerald-300',
        dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
        label: 'HIGH',
      };
    case 'LOW':
      return {
        bg: 'bg-slate-500/15 border-slate-500/40',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-400',
        label: 'LOW',
      };
    case 'FLOATING':
      return {
        bg: 'bg-amber-500/15 border-amber-500/50',
        text: 'text-amber-600 dark:text-amber-300',
        dot: 'bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]',
        label: 'FLOATING',
      };
    case 'UNDEFINED':
      return {
        bg: 'bg-yellow-500/15 border-yellow-500/45',
        text: 'text-yellow-700 dark:text-yellow-300',
        dot: 'bg-yellow-500',
        label: 'ZWISCHENBEREICH',
      };
  }
}

/**
 * Ruhige Echtzeit-Telemetrie-Anzeige (HUD):
 * - Gedrosselt auf 5 Hz (200 ms) + Sofort-Update bei Benutzerinteraktion
 * - Durchgängig tabular-nums, Dark- & Lightmode-kompatibel
 */
export class TelemetryHud {
  private readonly container: HTMLElement;
  private lastDomUpdateMs = 0;
  private readonly throttleMs = 200;

  private voltageEl!: HTMLElement;
  private pinBadgeEl!: HTMLElement;
  private currentEl!: HTMLElement;
  private currentSubEl!: HTMLElement;
  private powerEl!: HTMLElement;
  private logicBadgeEl!: HTMLElement;
  private logicDotEl!: HTMLElement;
  private logicTextEl!: HTMLElement;
  private extraTitleEl!: HTMLElement;
  private extraValueEl!: HTMLElement;
  private extraBarEl!: HTMLElement;
  private warningContainerEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderShell();
  }

  private renderShell(): void {
    this.container.innerHTML = `
      <div class="flex flex-col gap-2">
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <!-- Spannung -->
          <div class="eng-hud-card rounded-lg backdrop-blur-md border px-3 py-2 shadow-md">
            <div class="flex items-center justify-between gap-1 text-[11px] eng-text-muted uppercase tracking-wider">
              <span>Spannung</span>
              <span data-hud="pin" class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 eng-text-accent border border-cyan-500/30 truncate max-w-[100px]">GPIO 25</span>
            </div>
            <div data-hud="voltage" class="mt-1 text-lg font-mono font-semibold eng-text-accent tabular-nums">0,00 V</div>
          </div>

          <!-- Strom -->
          <div class="eng-hud-card rounded-lg backdrop-blur-md border px-3 py-2 shadow-md">
            <div class="flex items-center justify-between text-[11px] eng-text-muted uppercase tracking-wider">
              <span>Strom</span>
              <span data-hud="current-sub" class="text-[10px] font-mono eng-text-muted tabular-nums">Limit 20 mA</span>
            </div>
            <div data-hud="current" class="mt-1 text-lg font-mono font-semibold eng-text-main tabular-nums">0,00 mA</div>
          </div>

          <!-- Leistung -->
          <div class="eng-hud-card rounded-lg backdrop-blur-md border px-3 py-2 shadow-md">
            <div class="text-[11px] eng-text-muted uppercase tracking-wider">Leistung</div>
            <div data-hud="power" class="mt-1 text-lg font-mono font-semibold eng-text-main tabular-nums">0,0 mW</div>
          </div>

          <!-- Logikpegel -->
          <div class="eng-hud-card rounded-lg backdrop-blur-md border px-3 py-2 shadow-md">
            <div class="text-[11px] eng-text-muted uppercase tracking-wider">Logikpegel</div>
            <div class="mt-1.5 flex items-center">
              <span data-hud="logic-badge" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-semibold border">
                <span data-hud="logic-dot" class="w-2 h-2 rounded-full"></span>
                <span data-hud="logic-text">LOW</span>
              </span>
            </div>
          </div>

          <!-- Dynamische Kontext-Metrik -->
          <div class="col-span-2 lg:col-span-1 eng-hud-card rounded-lg backdrop-blur-md border px-3 py-2 shadow-md">
            <div data-hud="extra-title" class="text-[11px] eng-text-muted uppercase tracking-wider truncate">Status</div>
            <div data-hud="extra-value" class="mt-0.5 text-xs font-mono font-semibold eng-text-main tabular-nums truncate">0 %</div>
            <div class="mt-1.5 h-1.5 w-full rounded-full bg-slate-500/20 overflow-hidden border border-slate-500/25">
              <div data-hud="extra-bar" class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <!-- Warnungs-Leiste -->
        <div data-hud="warnings" class="flex flex-col gap-1.5 empty:hidden"></div>
      </div>
    `;

    this.voltageEl = this.container.querySelector('[data-hud="voltage"]')!;
    this.pinBadgeEl = this.container.querySelector('[data-hud="pin"]')!;
    this.currentEl = this.container.querySelector('[data-hud="current"]')!;
    this.currentSubEl = this.container.querySelector('[data-hud="current-sub"]')!;
    this.powerEl = this.container.querySelector('[data-hud="power"]')!;
    this.logicBadgeEl = this.container.querySelector('[data-hud="logic-badge"]')!;
    this.logicDotEl = this.container.querySelector('[data-hud="logic-dot"]')!;
    this.logicTextEl = this.container.querySelector('[data-hud="logic-text"]')!;
    this.extraTitleEl = this.container.querySelector('[data-hud="extra-title"]')!;
    this.extraValueEl = this.container.querySelector('[data-hud="extra-value"]')!;
    this.extraBarEl = this.container.querySelector('[data-hud="extra-bar"]')!;
    this.warningContainerEl = this.container.querySelector('[data-hud="warnings"]')!;
  }

  public update(result: SimulationResult, nowMs: number, forceImmediate = false): void {
    if (!forceImmediate && nowMs - this.lastDomUpdateMs < this.throttleMs) {
      return;
    }
    this.lastDomUpdateMs = nowMs;

    this.pinBadgeEl.textContent = result.probePin;
    this.voltageEl.textContent = `${formatDe(result.nodeVoltage, 2)} V`;

    const currentDecimals = result.currentMa < 1 ? 2 : result.currentMa >= 100 ? 0 : 1;
    this.currentEl.textContent = `${formatDe(result.currentMa, currentDecimals)} mA`;

    if (result.isCriticalOvercurrent) {
      this.currentEl.className = 'mt-1 text-lg font-mono font-semibold text-red-500 tabular-nums';
      this.currentSubEl.textContent = 'ÜBERLAST!';
      this.currentSubEl.className = 'text-[10px] font-mono font-bold text-red-500';
    } else if (result.isOvercurrent) {
      this.currentEl.className = 'mt-1 text-lg font-mono font-semibold text-amber-500 tabular-nums';
      this.currentSubEl.textContent = '> 20 mA!';
      this.currentSubEl.className = 'text-[10px] font-mono font-bold text-amber-500';
    } else {
      this.currentEl.className = 'mt-1 text-lg font-mono font-semibold eng-text-main tabular-nums';
      this.currentSubEl.textContent =
        result.topology.startsWith('wled-')
          ? 'Mean Well 5V'
          : result.topology === 'mosfet-driver' || result.topology === 'ld2490-radar' || result.topology === 'relay-flyback'
            ? 'Ext. 5V/Last'
            : 'Limit 20 mA';
      this.currentSubEl.className = 'text-[10px] font-mono eng-text-muted tabular-nums';
    }

    if (result.powerMw >= 1000) {
      this.powerEl.textContent = `${formatDe(result.powerMw / 1000, 2)} W`;
    } else {
      const powerDecimals = result.powerMw < 10 ? 2 : 1;
      this.powerEl.textContent = `${formatDe(result.powerMw, powerDecimals)} mW`;
    }

    const badge = getLogicBadgeClasses(result.logicLevel);
    this.logicBadgeEl.className = `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${badge.bg} ${badge.text}`;
    this.logicDotEl.className = `w-2 h-2 rounded-full ${badge.dot}`;
    this.logicTextEl.textContent = badge.label;

    this.extraTitleEl.textContent = result.extraTitle;
    this.extraValueEl.textContent = result.extraDisplay;
    this.extraBarEl.style.width = `${Math.min(100, Math.max(0, result.extraPercent))}%`;

    if (result.topology === 'rgb-led') {
      this.extraBarEl.style.background = result.rgbHex;
      this.extraBarEl.className = 'h-full transition-all duration-150';
    } else {
      this.extraBarEl.style.background = '';
      this.extraBarEl.className = result.isOvercurrent
        ? 'h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-150'
        : result.logicLevel === 'FLOATING'
          ? 'h-full bg-amber-400 transition-all duration-75'
          : 'h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150';
    }

    if (result.warnings.length === 0) {
      if (this.warningContainerEl.childElementCount > 0) {
        this.warningContainerEl.innerHTML = '';
      }
    } else {
      const html = result.warnings
        .map((w) => {
          const styles =
            w.severity === 'danger'
              ? 'bg-red-500/15 border-red-500/60 text-red-700 dark:bg-red-950/90 dark:text-red-200'
              : w.severity === 'warning'
                ? 'bg-amber-500/15 border-amber-500/60 text-amber-800 dark:bg-amber-950/90 dark:text-amber-200'
                : 'bg-sky-500/12 border-sky-500/45 text-sky-900 dark:bg-sky-950/90 dark:text-sky-200';
          const icon = w.severity === 'danger' ? '⚠' : w.severity === 'warning' ? '⚡' : 'ℹ';
          return `
            <div class="rounded-lg border px-3 py-1.5 text-xs backdrop-blur-md flex items-start gap-2 shadow-md ${styles}">
              <span class="font-bold leading-4 mt-0.5">${icon}</span>
              <div>
                <span class="font-semibold">${w.title}:</span>
                <span class="opacity-95 ml-1">${w.message}</span>
              </div>
            </div>
          `;
        })
        .join('');
      this.warningContainerEl.innerHTML = html;
    }
  }
}
