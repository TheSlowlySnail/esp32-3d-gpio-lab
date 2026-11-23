import { getEspBoardById } from '../engine/BoardCatalog';
import {
  computeLdrResistance,
  formatResistance,
  getResistorColorBands,
  LED_SPECS,
} from '../engine/ComponentRegistry';
import type {
  CircuitParameters,
  DividerSensorMode,
  LedColorId,
  PullMode,
  SceneExplanation,
  WledEffectId,
  WledPowerSourceId,
} from '../engine/types';
import type { LessonDefinition } from '../lessons/lessons';

export interface ControlsCallbacks {
  onParamsChange: (patch: Partial<CircuitParameters>) => void;
  onButtonPressChange: (pressed: boolean) => void;
  onTogglePartRemoved: (partId: string) => void;
  onRestoreAllParts: () => void;
}

const LOG_RES_MIN = 10;
const LOG_RES_MAX = 10000;

function sliderToOhms(val: number, min: number, max: number): number {
  const t = val / 1000;
  const raw = min * Math.pow(max / min, t);
  if (raw < 100) return Math.round(raw);
  if (raw < 1000) return Math.round(raw / 5) * 5;
  if (raw < 10000) return Math.round(raw / 50) * 50;
  return Math.round(raw / 500) * 500;
}

function ohmsToSlider(ohms: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, ohms));
  const t = Math.log(clamped / min) / Math.log(max / min);
  return Math.round(t * 1000);
}

function renderColorBandPills(ohms: number): string {
  const bands = getResistorColorBands(ohms);
  return bands
    .map(
      (b) => `
      <span class="eng-card-soft inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] eng-text-body">
        <span class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style="background:${b.hex}"></span>
        <span>${b.name}</span>
      </span>
    `,
    )
    .join('');
}

export class ControlsPanel {
  private readonly container: HTMLElement;
  private readonly callbacks: ControlsCallbacks;
  private lastStructureKey = '';
  private lastExplanationKey = '';

  constructor(container: HTMLElement, callbacks: ControlsCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public render(lesson: LessonDefinition, params: CircuitParameters): void {
    const removedKey = [...params.removedParts].sort().join(',');
    const structureKey = [
      lesson.id,
      params.boardId,
      params.withoutBreadboard ? 'nobread' : 'bread',
      params.dividerMode,
      params.pullMode,
      params.rcAutoPulse,
      params.i2cPullupEnabled,
      params.relayFlybackDiode,
      params.wledPowerInjection,
      params.wledPowerSource,
      params.piTrafficAuto,
      params.piFanAutoMode,
      params.piOledPage,
      removedKey,
    ].join(':');

    if (structureKey !== this.lastStructureKey) {
      this.lastStructureKey = structureKey;
      this.lastExplanationKey = '';
      this.buildFullPanel(lesson, params);
    } else {
      this.syncLiveValues(params);
    }
  }

  public updateExplanation(explanation: SceneExplanation): void {
    const key = `${explanation.statusTone}:${explanation.statusBadge}:${explanation.whatHappens}`;
    if (key === this.lastExplanationKey) return;
    this.lastExplanationKey = key;

    const badgeEl = this.container.querySelector('[data-exp="badge"]');
    const whatEl = this.container.querySelector('[data-exp="what"]');
    const whyEl = this.container.querySelector('[data-exp="why"]');
    const boxEl = this.container.querySelector('[data-exp="box"]');
    if (!badgeEl || !whatEl || !whyEl || !boxEl) return;

    const toneBorder =
      explanation.statusTone === 'danger'
        ? 'border-red-500/60 bg-red-500/8'
        : explanation.statusTone === 'warning'
          ? 'border-amber-500/55 bg-amber-500/8'
          : explanation.statusTone === 'info'
            ? 'border-sky-500/45 bg-sky-500/8'
            : 'border-emerald-500/45 bg-emerald-500/6';

    const badgeTone =
      explanation.statusTone === 'danger'
        ? 'bg-red-500/20 text-red-500 border-red-500/50'
        : explanation.statusTone === 'warning'
          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50'
          : explanation.statusTone === 'info'
            ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/45'
            : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/45';

    boxEl.className = `rounded-xl border p-3.5 flex flex-col gap-2 transition-colors ${toneBorder}`;
    badgeEl.className = `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeTone}`;
    badgeEl.textContent = explanation.statusBadge;
    whatEl.textContent = explanation.whatHappens;
    whyEl.textContent = explanation.whyItHappens;
  }

  private buildFullPanel(lesson: LessonDefinition, params: CircuitParameters): void {
    const board = getEspBoardById(params.boardId);
    const primaryPin = lesson.getPrimaryPin(params.boardId);
    const controlsHtml = this.buildTopologyControls(lesson, params);

    const removableHtml =
      lesson.removableParts.length > 0
        ? `
        <div class="eng-card rounded-xl border p-3.5 flex flex-col gap-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted">Bauteil entfernen (Fehler-Test)</span>
            ${
              params.removedParts.length > 0
                ? `<button type="button" data-action="restore-parts" class="text-[10.5px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 eng-text-accent border border-cyan-500/40 cursor-pointer hover:bg-cyan-500/25">Alle einstecken</button>`
                : `<span class="text-[10px] font-mono eng-text-muted">oder in 3D klicken</span>`
            }
          </div>
          <div class="flex flex-col gap-1.5">
            ${lesson.removableParts
              .map((part) => {
                const removed =
                  params.removedParts.includes(part.id) ||
                  (part.id === 'i2c-pullups' && !params.i2cPullupEnabled) ||
                  (part.id === 'flyback-diode' && !params.relayFlybackDiode) ||
                  (part.id === 'power-injection' && !params.wledPowerInjection);
                return `
                  <button
                    type="button"
                    data-toggle-part="${part.id}"
                    class="w-full text-left rounded-lg border px-2.5 py-2 transition cursor-pointer flex items-start justify-between gap-2 ${
                      removed
                        ? 'bg-amber-500/12 border-amber-500/60'
                        : 'eng-card-soft hover:border-cyan-500/50'
                    }"
                  >
                    <div class="min-w-0">
                      <div class="text-xs font-semibold eng-text-main flex items-center gap-1.5">
                        <span class="${removed ? 'text-amber-500' : 'text-emerald-500'}">${removed ? '✕' : '✓'}</span>
                        <span class="truncate">${part.label}</span>
                      </div>
                      <div class="text-[10.5px] eng-text-muted mt-0.5 leading-snug">
                        ${removed ? `Fehlt: ${part.removedEffectHint}` : part.role}
                      </div>
                    </div>
                    <span class="shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                      removed
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50'
                        : 'eng-btn-neutral'
                    }">
                      ${removed ? 'Einstecken' : 'Entfernen'}
                    </span>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      `
        : '';

    const formulasHtml = lesson.formulas
      .map(
        (f) => `
        <div class="flex items-center justify-between gap-2 py-1 border-b border-slate-500/20 last:border-0 text-xs">
          <span class="eng-text-muted">${f.label}</span>
          <code class="eng-card-soft font-mono eng-text-accent px-1.5 py-0.5 rounded border text-[11px]">${f.expression}</code>
        </div>
      `,
      )
      .join('');

    const takeawaysHtml = lesson.keyTakeaways
      .map(
        (item) => `
        <li class="flex items-start gap-2 text-xs eng-text-body leading-relaxed">
          <span class="eng-text-accent mt-0.5">▸</span>
          <span>${item}</span>
        </li>
      `,
      )
      .join('');

    const challengesHtml = lesson.challenges
      .map(
        (c, idx) => `
        <div class="eng-card-soft rounded-md border p-2.5">
          <div class="text-xs font-medium eng-text-main">
            <span class="font-mono eng-text-accent mr-1.5">0${idx + 1}</span>${c.text}
          </div>
          <div class="text-[11px] eng-text-muted mt-1">${c.hint}</div>
        </div>
      `,
      )
      .join('');

    this.container.innerHTML = `
      <div class="flex flex-col gap-3.5 pb-6">
        <!-- Active ESP Board Info -->
        <div class="eng-card rounded-lg border px-3 py-2 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold eng-text-main truncate">${board.name}</span>
              ${board.isMini ? '<span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-500 border border-orange-500/40">MINI</span>' : ''}
            </div>
            <div class="text-[10.5px] eng-text-muted font-mono truncate">${board.architecture} · ${board.wireless}</div>
          </div>
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${board.accentHex}"></span>
        </div>

        <!-- LIVE SZENEN-ERKLÄRER ("Was passiert gerade & warum?") -->
        <div data-exp="box" class="rounded-xl border border-emerald-500/45 bg-emerald-500/6 p-3.5 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider eng-text-main">Was passiert hier gerade?</span>
            <span data-exp="badge" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-emerald-500/20 text-emerald-500 border-emerald-500/45">AKTIV</span>
          </div>
          <p data-exp="what" class="text-xs font-medium eng-text-main leading-relaxed"></p>
          <div class="pt-1.5 border-t border-slate-500/20">
            <span class="text-[10px] font-mono uppercase tracking-wider eng-text-muted">Warum?</span>
            <p data-exp="why" class="text-[11.5px] eng-text-body leading-relaxed mt-0.5"></p>
          </div>
        </div>

        <!-- Lesson Header -->
        <div>
          <div class="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider eng-text-accent">
            <span>Lektion ${lesson.number} / 19</span>
            <span class="opacity-50">•</span>
            <span class="eng-text-muted">${lesson.category}</span>
          </div>
          <h2 class="mt-1 text-base font-bold eng-text-main leading-snug">${lesson.title}</h2>
          <p class="mt-1 text-xs eng-text-muted leading-relaxed">${lesson.summary}</p>
        </div>

        <!-- Interactive Parameters -->
        <div class="eng-card rounded-xl border p-3.5 flex flex-col gap-3.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted">Parameter</span>
            <span class="font-mono text-[11px] eng-text-accent truncate">${primaryPin}</span>
          </div>
          ${controlsHtml}
        </div>

        <!-- Bauteil entfernen / Fehler-Diagnose -->
        ${removableHtml}

        <!-- Formulas -->
        <div class="eng-card rounded-xl border p-3.5">
          <div class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted mb-2">Formeln &amp; Grenzwerte</div>
          <div>${formulasHtml}</div>
        </div>

        <!-- Key Takeaways -->
        <div class="eng-card rounded-xl border p-3.5">
          <div class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted mb-2">Wichtige Konzepte</div>
          <ul class="flex flex-col gap-1.5">${takeawaysHtml}</ul>
        </div>

        <!-- Challenges -->
        <div class="eng-card rounded-xl border p-3.5">
          <div class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted mb-2">Ausprobieren</div>
          <div class="flex flex-col gap-2">${challengesHtml}</div>
        </div>
      </div>
    `;

    this.bindEvents(lesson, params);
  }

  private buildTopologyControls(lesson: LessonDefinition, params: CircuitParameters): string {
    switch (lesson.id) {
      case 'led-resistor': {
        const colorChips = (Object.keys(LED_SPECS) as LedColorId[])
          .map((id) => {
            const spec = LED_SPECS[id];
            const active = params.ledColor === id;
            return `
              <button type="button" data-led-color="${id}" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
                active ? 'bg-cyan-500/15 border-cyan-500 eng-text-main font-medium' : 'eng-btn-neutral'
              }">
                <span class="w-2.5 h-2.5 rounded-full" style="background:${spec.hex}; box-shadow: 0 0 6px ${spec.glowHex}"></span>
                <span>${spec.label.split(' ')[0]}</span>
              </button>`;
          })
          .join('');
        const presets = [33, 68, 100, 220, 330, 1000, 4700]
          .map(
            (ohms) =>
              `<button type="button" data-res-preset="${ohms}" class="eng-btn-neutral px-2 py-1 rounded border text-[11px] font-mono transition cursor-pointer">${formatResistance(ohms)}</button>`,
          )
          .join('');
        return `
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs eng-text-body">Digital-Ausgang</span>
            <button type="button" data-ctrl="gpio-toggle" class="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border transition cursor-pointer ${
              params.gpioOutputHigh ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-500' : 'eng-btn-neutral'
            }">${params.gpioOutputHigh ? 'HIGH (3,3 V)' : 'LOW (0,0 V)'}</button>
          </div>
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="eng-text-body">LED-Farbe &amp; V_f</span>
              <span data-val="led-vf" class="font-mono eng-text-accent tabular-nums">${LED_SPECS[params.ledColor].forwardVoltage.toFixed(1).replace('.', ',')} V</span>
            </div>
            <div class="flex flex-wrap gap-1.5">${colorChips}</div>
          </div>
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="eng-text-body">Vorwiderstand R</span>
              <span data-val="resistor-ohms" class="font-mono font-semibold eng-text-accent tabular-nums">${formatResistance(params.resistorOhms)}</span>
            </div>
            <input data-ctrl="resistor-slider" type="range" min="0" max="1000" value="${ohmsToSlider(params.resistorOhms, LOG_RES_MIN, LOG_RES_MAX)}" class="eng-slider" />
            <div class="flex flex-wrap gap-1 mt-2">${presets}</div>
            <div data-val="color-bands" class="flex flex-wrap gap-1 mt-2">${renderColorBandPills(params.resistorOhms)}</div>
          </div>`;
      }

      case 'button-pull': {
        const modes: Array<{ id: PullMode; label: string; sub: string }> = [
          { id: 'floating', label: 'Floating', sub: 'Ohne R' },
          { id: 'pull-down', label: 'Pull-Down', sub: 'R → GND' },
          { id: 'pull-up', label: 'Pull-Up', sub: 'R → 3,3V' },
        ];
        const modeBtns = modes
          .map((m) => {
            const active = params.pullMode === m.id;
            return `<button type="button" data-pull-mode="${m.id}" class="flex flex-col items-center py-2 px-1.5 rounded-lg border text-xs transition cursor-pointer ${
              active
                ? m.id === 'floating'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-semibold'
                  : 'bg-cyan-500/15 border-cyan-500 eng-text-accent font-semibold'
                : 'eng-btn-neutral'
            }"><span>${m.label}</span><span class="text-[10px] opacity-75 font-mono">${m.sub}</span></button>`;
          })
          .join('');
        return `
          <div class="grid grid-cols-3 gap-1.5">${modeBtns}</div>
          <button type="button" data-ctrl="hold-button" class="w-full py-2.5 px-3 rounded-lg font-semibold text-xs border transition select-none cursor-pointer flex items-center justify-center gap-2 ${
            params.buttonPressed
              ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_16px_rgba(14,165,233,0.45)]'
              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-500 border-sky-500/45'
          }"><span>●</span><span>${params.buttonPressed ? 'TASTER GEDRÜCKT' : 'Taster halten (Leertaste / 3D-Klick)'}</span></button>
          ${
            params.pullMode === 'floating'
              ? `<div>
                  <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">50-Hz-Störeinstrahlung</span><span data-val="noise-amp" class="font-mono text-amber-500 tabular-nums">${Math.round(params.noiseAmplitude * 100)} %</span></div>
                  <input data-ctrl="noise-slider" type="range" min="20" max="140" value="${Math.round(params.noiseAmplitude * 100)}" class="eng-slider" />
                </div>`
              : `<div>
                  <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Pull-Widerstand R</span><span data-val="pull-ohms" class="font-mono eng-text-accent tabular-nums">${formatResistance(params.pullResistorOhms)}</span></div>
                  <input data-ctrl="pull-slider" type="range" min="0" max="1000" value="${ohmsToSlider(params.pullResistorOhms, 1000, 100000)}" class="eng-slider" />
                  <div data-val="pull-bands" class="flex flex-wrap gap-1 mt-2">${renderColorBandPills(params.pullResistorOhms)}</div>
                </div>`
          }`;
      }

      case 'voltage-divider': {
        const ldrOhms = computeLdrResistance(params.lightLevelPercent);
        const modeTabs: Array<{ id: DividerSensorMode; label: string }> = [
          { id: 'resistors', label: 'Zwei Widerstände (R1/R2)' },
          { id: 'ldr', label: 'Fotowiderstand (LDR)' },
        ];
        return `
          <div class="grid grid-cols-2 gap-1.5">
            ${modeTabs
              .map(
                (m) =>
                  `<button type="button" data-divider-mode="${m.id}" class="py-1.5 px-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    params.dividerMode === m.id ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
                  }">${m.label}</button>`,
              )
              .join('')}
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Widerstand R1 (nach 3,3V)</span><span data-val="r1-ohms" class="font-mono eng-text-accent tabular-nums">${formatResistance(params.r1Ohms)}</span></div>
            <input data-ctrl="r1-slider" type="range" min="0" max="1000" value="${ohmsToSlider(params.r1Ohms, 1000, 100000)}" class="eng-slider" />
            <div data-val="r1-bands" class="flex flex-wrap gap-1 mt-2">${renderColorBandPills(params.r1Ohms)}</div>
          </div>
          ${
            params.dividerMode === 'resistors'
              ? `<div>
                  <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Widerstand R2 (nach GND)</span><span data-val="r2-ohms" class="font-mono text-amber-500 tabular-nums">${formatResistance(params.r2Ohms)}</span></div>
                  <input data-ctrl="r2-slider" type="range" min="0" max="1000" value="${ohmsToSlider(params.r2Ohms, 1000, 100000)}" class="eng-slider" />
                  <div data-val="r2-bands" class="flex flex-wrap gap-1 mt-2">${renderColorBandPills(params.r2Ohms)}</div>
                </div>`
              : `<div>
                  <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Umgebungshelligkeit (LDR)</span><span data-val="ldr-info" class="font-mono text-amber-500 tabular-nums">${Math.round(params.lightLevelPercent)} % (~${formatResistance(ldrOhms)})</span></div>
                  <input data-ctrl="light-slider" type="range" min="0" max="100" value="${Math.round(params.lightLevelPercent)}" class="eng-slider" />
                </div>`
          }`;
      }

      case 'pwm-dimmer':
        return `
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Duty-Cycle</span><span data-val="pwm-duty" class="font-mono font-semibold eng-text-accent tabular-nums">${Math.round(params.pwmDutyPercent)} %</span></div>
            <input data-ctrl="pwm-duty" type="range" min="0" max="100" value="${Math.round(params.pwmDutyPercent)}" class="eng-slider" />
            <div class="flex gap-1 mt-2">
              ${[0, 15, 50, 75, 100].map((d) => `<button type="button" data-pwm-preset="${d}" class="eng-btn-neutral flex-1 py-1 rounded border text-[11px] font-mono cursor-pointer">${d}%</button>`).join('')}
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">PWM-Frequenz</span><span data-val="pwm-freq" class="font-mono eng-text-accent tabular-nums">${Math.round(params.pwmFrequencyHz)} Hz</span></div>
            <input data-ctrl="pwm-freq" type="range" min="100" max="5000" step="100" value="${Math.round(params.pwmFrequencyHz)}" class="eng-slider" />
          </div>`;

      case 'rgb-led':
        return `
          <div class="flex flex-col gap-2.5">
            <div><div class="flex justify-between text-xs mb-1"><span class="text-red-500 font-medium">Rot (R)</span><span data-val="rgb-r" class="font-mono tabular-nums">${Math.round(params.rgbRed)}</span></div><input data-ctrl="rgb-r" type="range" min="0" max="255" value="${Math.round(params.rgbRed)}" class="eng-slider" /></div>
            <div><div class="flex justify-between text-xs mb-1"><span class="text-emerald-500 font-medium">Grün (G)</span><span data-val="rgb-g" class="font-mono tabular-nums">${Math.round(params.rgbGreen)}</span></div><input data-ctrl="rgb-g" type="range" min="0" max="255" value="${Math.round(params.rgbGreen)}" class="eng-slider" /></div>
            <div><div class="flex justify-between text-xs mb-1"><span class="text-blue-500 font-medium">Blau (B)</span><span data-val="rgb-b" class="font-mono tabular-nums">${Math.round(params.rgbBlue)}</span></div><input data-ctrl="rgb-b" type="range" min="0" max="255" value="${Math.round(params.rgbBlue)}" class="eng-slider" /></div>
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${[
                ['Cyan', 0, 240, 255],
                ['Magenta', 255, 0, 180],
                ['Amber', 255, 140, 0],
                ['Warmweiß', 255, 220, 170],
              ]
                .map(([lbl, r, g, b]) => `<button type="button" data-rgb-preset="${r},${g},${b}" class="eng-btn-neutral px-2 py-1 rounded border text-[11px] cursor-pointer">${lbl}</button>`)
                .join('')}
            </div>
          </div>`;

      case 'rc-lowpass':
        return `
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs eng-text-body">Autom. Rechteck-Impuls</span>
            <button type="button" data-ctrl="rc-auto" class="px-3 py-1 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
              params.rcAutoPulse ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
            }">${params.rcAutoPulse ? 'AUTO-PULS EIN' : 'MANUELL'}</button>
          </div>
          ${
            !params.rcAutoPulse
              ? `<div class="flex items-center justify-between gap-2">
                  <span class="text-xs eng-text-body">Eingang</span>
                  <button type="button" data-ctrl="rc-input" class="px-3 py-1 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
                    params.rcInputHigh ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
                  }">${params.rcInputHigh ? 'LADEN (3,3 V)' : 'ENTLADEN (0 V)'}</button>
                </div>`
              : ''
          }
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Widerstand R</span><span data-val="rc-r" class="font-mono eng-text-accent tabular-nums">${formatResistance(params.rcResistorOhms)}</span></div>
            <input data-ctrl="rc-r" type="range" min="0" max="1000" value="${ohmsToSlider(params.rcResistorOhms, 1000, 100000)}" class="eng-slider" />
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Kondensator C</span><span data-val="rc-c" class="font-mono text-amber-500 tabular-nums">${Math.round(params.rcCapacitorUf)} µF</span></div>
            <input data-ctrl="rc-c" type="range" min="1" max="330" value="${Math.round(params.rcCapacitorUf)}" class="eng-slider" />
          </div>`;

      case 'mosfet-driver':
        return `
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs eng-text-body">MOSFET Gate (GPIO)</span>
            <button type="button" data-ctrl="mosfet-gate" class="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
              params.mosfetGateHigh ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
            }">${params.mosfetGateHigh ? 'HIGH (LEITEND)' : 'LOW (SPERREND)'}</button>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            ${[5, 12, 24]
              .map(
                (v) =>
                  `<button type="button" data-mosfet-v="${v}" class="py-1.5 rounded-lg border text-xs font-mono cursor-pointer ${
                    params.mosfetLoadVoltage === v ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent font-semibold' : 'eng-btn-neutral'
                  }">${v} V</button>`,
              )
              .join('')}
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Lastwiderstand</span><span data-val="mosfet-r" class="font-mono eng-text-accent tabular-nums">${Math.round(params.mosfetLoadOhms)} Ω</span></div>
            <input data-ctrl="mosfet-r" type="range" min="10" max="200" value="${Math.round(params.mosfetLoadOhms)}" class="eng-slider" />
          </div>`;

      case 'i2c-bme280':
        return `
          <div>
            <div class="flex justify-between text-xs mb-1"><span class="eng-text-body">Temperatur</span><span data-val="bme-t" class="font-mono eng-text-accent tabular-nums">${params.bmeTempC.toFixed(1).replace('.', ',')} °C</span></div>
            <input data-ctrl="bme-t" type="range" min="-10" max="50" step="0.5" value="${params.bmeTempC}" class="eng-slider" />
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1"><span class="eng-text-body">Luftfeuchtigkeit</span><span data-val="bme-h" class="font-mono eng-text-accent tabular-nums">${Math.round(params.bmeHumidityPct)} %</span></div>
            <input data-ctrl="bme-h" type="range" min="10" max="95" value="${Math.round(params.bmeHumidityPct)}" class="eng-slider" />
          </div>`;

      case 'ultrasonic-hcsr04':
        return `
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Objekt-Abstand</span><span data-val="us-dist" class="font-mono font-semibold eng-text-accent tabular-nums">${Math.round(params.ultrasonicDistanceCm)} cm</span></div>
            <input data-ctrl="us-dist" type="range" min="2" max="400" value="${Math.round(params.ultrasonicDistanceCm)}" class="eng-slider" />
            <div class="flex gap-1 mt-2">
              ${[15, 45, 120, 250, 380].map((d) => `<button type="button" data-us-preset="${d}" class="eng-btn-neutral flex-1 py-1 rounded border text-[11px] font-mono cursor-pointer">${d}cm</button>`).join('')}
            </div>
          </div>`;

      case 'ld2490-radar':
        return `
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" data-ctrl="ld-present" class="py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
              params.ld2490TargetPresent ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
            }">${params.ld2490TargetPresent ? '● Person im Raum' : '○ Raum leer'}</button>
            <button type="button" data-ctrl="ld-moving" class="py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
              params.ld2490TargetMoving ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
            }">${params.ld2490TargetMoving ? 'Bewegung aktiv' : 'Still (Atem-Präsenz)'}</button>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Ziel-Distanz</span><span data-val="ld-dist" class="font-mono font-semibold eng-text-accent tabular-nums">${params.ld2490TargetDistanceM.toFixed(1).replace('.', ',')} m</span></div>
            <input data-ctrl="ld-dist" type="range" min="0.2" max="6.0" step="0.1" value="${params.ld2490TargetDistanceM}" class="eng-slider" />
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Gate-Limit</span><span data-val="ld-thresh" class="font-mono text-amber-500 tabular-nums">${params.ld2490ThresholdM.toFixed(1).replace('.', ',')} m</span></div>
            <input data-ctrl="ld-thresh" type="range" min="0.5" max="6.0" step="0.1" value="${params.ld2490ThresholdM}" class="eng-slider" />
          </div>`;

      case 'relay-flyback':
        return `
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs eng-text-body">Relais-Spule (5 V)</span>
            <button type="button" data-ctrl="relay-toggle" class="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
              params.relayEnergized ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
            }">${params.relayEnergized ? 'ANGEZOGEN (EIN)' : 'ABGEFALLEN (AUS)'}</button>
          </div>`;

      case 'servo-pwm':
        return `
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Servo-Winkel</span><span data-val="servo-deg" class="font-mono font-semibold eng-text-accent tabular-nums">${Math.round(params.servoAngleDeg)}°</span></div>
            <input data-ctrl="servo-deg" type="range" min="0" max="180" value="${Math.round(params.servoAngleDeg)}" class="eng-slider" />
            <div class="flex gap-1 mt-2">
              ${[0, 45, 90, 135, 180].map((a) => `<button type="button" data-servo-preset="${a}" class="eng-btn-neutral flex-1 py-1 rounded border text-[11px] font-mono cursor-pointer">${a}°</button>`).join('')}
            </div>
          </div>`;

      case 'piezo-buzzer':
        return `
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs eng-text-body">Ton-Ausgabe</span>
            <button type="button" data-ctrl="buzzer-toggle" class="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
              params.buzzerEnabled ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
            }">${params.buzzerEnabled ? 'AKTIV (EIN)' : 'STUMM (AUS)'}</button>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5"><span class="eng-text-body">Frequenz</span><span data-val="buzzer-freq" class="font-mono font-semibold eng-text-accent tabular-nums">${Math.round(params.buzzerFrequencyHz)} Hz</span></div>
            <input data-ctrl="buzzer-freq" type="range" min="200" max="4000" step="10" value="${Math.round(params.buzzerFrequencyHz)}" class="eng-slider" />
            <div class="flex flex-wrap gap-1 mt-2">
              ${[
                ['C4', 262],
                ['E4', 330],
                ['G4', 392],
                ['A4', 440],
                ['A5', 880],
                ['Alarm', 2400],
              ]
                .map(([lbl, f]) => `<button type="button" data-buzzer-preset="${f}" class="eng-btn-neutral px-2 py-1 rounded border text-[11px] font-mono cursor-pointer">${lbl}</button>`)
                .join('')}
            </div>
          </div>`;

      case 'wled-compact':
      case 'wled-medium':
      case 'wled-long-injection': {
        const minLeds = lesson.id === 'wled-compact' ? 8 : lesson.id === 'wled-medium' ? 30 : 90;
        const maxLeds = lesson.id === 'wled-compact' ? 45 : lesson.id === 'wled-medium' ? 120 : 300;
        const presets =
          lesson.id === 'wled-compact'
            ? [8, 16, 30, 45]
            : lesson.id === 'wled-medium'
              ? [30, 60, 90, 120]
              : [120, 180, 240, 300];
        const meters = (params.wledLedCount / 60).toFixed(2).replace('.', ',');

        const effects: Array<{ id: WledEffectId; label: string }> = [
          { id: 'rainbow', label: 'Regenbogen' },
          { id: 'solid-white', label: 'Vollweiß' },
          { id: 'chase', label: 'Lauflicht' },
          { id: 'fire', label: 'Feuer' },
          { id: 'breathe', label: 'Atmen' },
        ];

        return `
          <!-- Mean Well Stromversorgung / Akku-Pack -->
          <div class="rounded-lg eng-card-soft border p-2.5 flex flex-col gap-2">
            <div class="text-[11px] font-semibold eng-text-main">Mean Well 5V-Versorgung</div>
            <div class="grid grid-cols-2 gap-1.5">
              <button type="button" data-wled-power="meanwell-battery" class="py-1.5 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                params.wledPowerSource === 'meanwell-battery'
                  ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent'
                  : 'eng-btn-neutral'
              }">Mean Well + Akku</button>
              <button type="button" data-wled-power="meanwell-psu" class="py-1.5 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                params.wledPowerSource === 'meanwell-psu'
                  ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent'
                  : 'eng-btn-neutral'
              }">Mean Well Netzteil</button>
            </div>
            ${
              params.wledPowerSource === 'meanwell-battery'
                ? `
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="eng-text-muted">Akku-Kapazität (Li-Ion 5V)</span>
                  <span data-val="wled-cap" class="font-mono eng-text-accent tabular-nums">${Math.round(params.wledBatteryCapacityMah / 1000)} Ah (${params.wledBatteryCapacityMah} mAh)</span>
                </div>
                <input data-ctrl="wled-cap" type="range" min="4000" max="20000" step="1000" value="${params.wledBatteryCapacityMah}" class="eng-slider" />
              </div>
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="eng-text-muted">Akku-Ladezustand (SoC)</span>
                  <span data-val="wled-soc" class="font-mono text-emerald-500 tabular-nums">${Math.round(params.wledBatterySocPct)} %</span>
                </div>
                <input data-ctrl="wled-soc" type="range" min="10" max="100" step="5" value="${Math.round(params.wledBatterySocPct)}" class="eng-slider" />
              </div>
            `
                : ''
            }
          </div>

          <!-- Streifenlänge -->
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="eng-text-body">Streifenlänge (60 LEDs/m)</span>
              <span data-val="wled-len" class="font-mono font-semibold eng-text-accent tabular-nums">${params.wledLedCount} LEDs (~${meters} m)</span>
            </div>
            <input data-ctrl="wled-len" type="range" min="${minLeds}" max="${maxLeds}" step="2" value="${params.wledLedCount}" class="eng-slider" />
            <div class="flex gap-1 mt-2">
              ${presets
                .map(
                  (cnt) =>
                    `<button type="button" data-wled-len="${cnt}" class="eng-btn-neutral flex-1 py-1 rounded border text-[11px] font-mono cursor-pointer">${cnt} LEDs</button>`,
                )
                .join('')}
            </div>
          </div>

          <!-- WLED Effekt -->
          <div>
            <div class="text-xs eng-text-body mb-1.5">WLED-Effekt</div>
            <div class="flex flex-wrap gap-1.5">
              ${effects
                .map(
                  (ef) =>
                    `<button type="button" data-wled-effect="${ef.id}" class="px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition ${
                      params.wledEffect === ef.id
                        ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent font-semibold'
                        : 'eng-btn-neutral'
                    }">${ef.label}</button>`,
                )
                .join('')}
            </div>
          </div>

          <!-- Helligkeit -->
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="eng-text-body">WLED Helligkeit</span>
              <span data-val="wled-bright" class="font-mono eng-text-accent tabular-nums">${Math.round(params.wledBrightnessPct)} %</span>
            </div>
            <input data-ctrl="wled-bright" type="range" min="0" max="100" value="${Math.round(params.wledBrightnessPct)}" class="eng-slider" />
          </div>

          <!-- WLED Software Limiter -->
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="eng-text-body">WLED Strombegrenzer</span>
              <span data-val="wled-limit" class="font-mono text-amber-500 tabular-nums">${Math.round(params.wledCurrentLimitMa)} mA</span>
            </div>
            <input data-ctrl="wled-limit" type="range" min="500" max="15000" step="250" value="${Math.round(params.wledCurrentLimitMa)}" class="eng-slider" />
          </div>

          ${
            lesson.id === 'wled-long-injection'
              ? `
            <div class="flex items-center justify-between gap-2 pt-1">
              <span class="text-xs eng-text-body">5 V Power Injection (Ende)</span>
              <button type="button" data-ctrl="wled-injection" class="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
                params.wledPowerInjection && !params.removedParts.includes('power-injection')
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                  : 'bg-red-500/20 border-red-500 text-red-500'
              }">${params.wledPowerInjection && !params.removedParts.includes('power-injection') ? 'EINGESPEIST ✓' : 'AUS (VOLTAGE DROP)'}</button>
            </div>
          `
              : ''
          }
        `;
      }

      case 'pi-traffic-light': {
        const phases: Array<{ id: CircuitParameters['piTrafficPhase']; label: string }> = [
          { id: 'red', label: 'Rot' },
          { id: 'red-yellow', label: 'Rot-Gelb' },
          { id: 'green', label: 'Grün' },
          { id: 'yellow', label: 'Gelb' },
        ];
        return `
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs eng-text-body">Automatik-Zyklus</span>
            <button type="button" data-ctrl="pi-traffic-auto" class="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
              params.piTrafficAuto ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
            }">${params.piTrafficAuto ? 'AUTO-AMPEL EIN' : 'MANUELL'}</button>
          </div>
          ${
            !params.piTrafficAuto
              ? `<div class="grid grid-cols-2 gap-1.5">
                  ${phases
                    .map(
                      (ph) =>
                        `<button type="button" data-pi-phase="${ph.id}" class="py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                          params.piTrafficPhase === ph.id
                            ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent'
                            : 'eng-btn-neutral'
                        }">${ph.label}</button>`,
                    )
                    .join('')}
                </div>`
              : ''
          }
        `;
      }

      case 'pi-fan-pwm': {
        return `
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs eng-text-body">Temperatur-Automatik</span>
            <button type="button" data-ctrl="pi-fan-auto" class="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
              params.piFanAutoMode ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
            }">${params.piFanAutoMode ? 'AUTO (TEMP-KURVE)' : 'MANUELL PWM'}</button>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="eng-text-body">Simulierte Pi CPU-Temperatur</span>
              <span data-val="pi-temp" class="font-mono font-semibold text-amber-500 tabular-nums">${Math.round(params.piCpuTempC)} °C</span>
            </div>
            <input data-ctrl="pi-temp" type="range" min="35" max="85" value="${Math.round(params.piCpuTempC)}" class="eng-slider" />
          </div>
          ${
            !params.piFanAutoMode
              ? `<div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="eng-text-body">Manuelle Lüfter-Drehzahl</span>
                    <span data-val="pi-fan-man" class="font-mono eng-text-accent tabular-nums">${Math.round(params.piFanManualPct)} %</span>
                  </div>
                  <input data-ctrl="pi-fan-man" type="range" min="0" max="100" value="${Math.round(params.piFanManualPct)}" class="eng-slider" />
                </div>`
              : ''
          }
        `;
      }

      case 'pi-oled-i2c': {
        const pages: Array<{ id: CircuitParameters['piOledPage']; label: string }> = [
          { id: 'system', label: 'System' },
          { id: 'network', label: 'Netzwerk' },
          { id: 'gpio', label: 'GPIO' },
        ];
        return `
          <div>
            <div class="text-xs eng-text-body mb-1.5">OLED Display-Seite</div>
            <div class="grid grid-cols-3 gap-1.5">
              ${pages
                .map(
                  (pg) =>
                    `<button type="button" data-oled-page="${pg.id}" class="py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      params.piOledPage === pg.id
                        ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent'
                        : 'eng-btn-neutral'
                    }">${pg.label}</button>`,
                )
                .join('')}
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="eng-text-body">OLED Kontrast / Leuchtkraft</span>
              <span data-val="oled-contrast" class="font-mono eng-text-accent tabular-nums">${Math.round(params.piOledContrastPct)} %</span>
            </div>
            <input data-ctrl="oled-contrast" type="range" min="15" max="100" value="${Math.round(params.piOledContrastPct)}" class="eng-slider" />
          </div>
        `;
      }
    }
  }

  private bindEvents(lesson: LessonDefinition, params: CircuitParameters): void {
    const q = <T extends Element>(sel: string) => this.container.querySelector<T>(sel);
    const qAll = <T extends Element>(sel: string) => this.container.querySelectorAll<T>(sel);

    // Removable parts diagnosis buttons
    qAll<HTMLButtonElement>('[data-toggle-part]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.togglePart;
        if (id) this.callbacks.onTogglePartRemoved(id);
      });
    });
    q('[data-action="restore-parts"]')?.addEventListener('click', () =>
      this.callbacks.onRestoreAllParts(),
    );

    switch (lesson.id) {
      case 'led-resistor':
        q('[data-ctrl="gpio-toggle"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ gpioOutputHigh: !params.gpioOutputHigh }),
        );
        qAll<HTMLButtonElement>('[data-led-color]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ ledColor: b.dataset.ledColor as LedColorId }),
          ),
        );
        q<HTMLInputElement>('[data-ctrl="resistor-slider"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({
            resistorOhms: sliderToOhms(Number((e.target as HTMLInputElement).value), LOG_RES_MIN, LOG_RES_MAX),
          }),
        );
        qAll<HTMLButtonElement>('[data-res-preset]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ resistorOhms: Number(b.dataset.resPreset) }),
          ),
        );
        break;

      case 'button-pull': {
        qAll<HTMLButtonElement>('[data-pull-mode]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ pullMode: b.dataset.pullMode as PullMode }),
          ),
        );
        const holdBtn = q<HTMLButtonElement>('[data-ctrl="hold-button"]');
        if (holdBtn) {
          const down = (e: Event) => {
            e.preventDefault();
            this.callbacks.onButtonPressChange(true);
          };
          const up = () => this.callbacks.onButtonPressChange(false);
          holdBtn.addEventListener('pointerdown', down);
          holdBtn.addEventListener('pointerup', up);
          holdBtn.addEventListener('pointerleave', up);
          holdBtn.addEventListener('pointercancel', up);
        }
        q<HTMLInputElement>('[data-ctrl="noise-slider"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({
            noiseAmplitude: Number((e.target as HTMLInputElement).value) / 100,
          }),
        );
        q<HTMLInputElement>('[data-ctrl="pull-slider"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({
            pullResistorOhms: sliderToOhms(Number((e.target as HTMLInputElement).value), 1000, 100000),
          }),
        );
        break;
      }

      case 'voltage-divider':
        qAll<HTMLButtonElement>('[data-divider-mode]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ dividerMode: b.dataset.dividerMode as DividerSensorMode }),
          ),
        );
        q<HTMLInputElement>('[data-ctrl="r1-slider"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({
            r1Ohms: sliderToOhms(Number((e.target as HTMLInputElement).value), 1000, 100000),
          }),
        );
        q<HTMLInputElement>('[data-ctrl="r2-slider"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({
            r2Ohms: sliderToOhms(Number((e.target as HTMLInputElement).value), 1000, 100000),
          }),
        );
        q<HTMLInputElement>('[data-ctrl="light-slider"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ lightLevelPercent: Number((e.target as HTMLInputElement).value) }),
        );
        break;

      case 'pwm-dimmer':
        q<HTMLInputElement>('[data-ctrl="pwm-duty"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ pwmDutyPercent: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="pwm-freq"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ pwmFrequencyHz: Number((e.target as HTMLInputElement).value) }),
        );
        qAll<HTMLButtonElement>('[data-pwm-preset]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ pwmDutyPercent: Number(b.dataset.pwmPreset) }),
          ),
        );
        break;

      case 'rgb-led':
        q<HTMLInputElement>('[data-ctrl="rgb-r"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ rgbRed: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="rgb-g"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ rgbGreen: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="rgb-b"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ rgbBlue: Number((e.target as HTMLInputElement).value) }),
        );
        qAll<HTMLButtonElement>('[data-rgb-preset]').forEach((b) =>
          b.addEventListener('click', () => {
            const [r, g, bl] = (b.dataset.rgbPreset ?? '0,0,0').split(',').map(Number);
            this.callbacks.onParamsChange({ rgbRed: r, rgbGreen: g, rgbBlue: bl });
          }),
        );
        break;

      case 'rc-lowpass':
        q('[data-ctrl="rc-auto"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ rcAutoPulse: !params.rcAutoPulse }),
        );
        q('[data-ctrl="rc-input"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ rcInputHigh: !params.rcInputHigh }),
        );
        q<HTMLInputElement>('[data-ctrl="rc-r"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({
            rcResistorOhms: sliderToOhms(Number((e.target as HTMLInputElement).value), 1000, 100000),
          }),
        );
        q<HTMLInputElement>('[data-ctrl="rc-c"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ rcCapacitorUf: Number((e.target as HTMLInputElement).value) }),
        );
        break;

      case 'mosfet-driver':
        q('[data-ctrl="mosfet-gate"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ mosfetGateHigh: !params.mosfetGateHigh }),
        );
        qAll<HTMLButtonElement>('[data-mosfet-v]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ mosfetLoadVoltage: Number(b.dataset.mosfetV) }),
          ),
        );
        q<HTMLInputElement>('[data-ctrl="mosfet-r"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ mosfetLoadOhms: Number((e.target as HTMLInputElement).value) }),
        );
        break;

      case 'i2c-bme280':
        q<HTMLInputElement>('[data-ctrl="bme-t"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ bmeTempC: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="bme-h"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ bmeHumidityPct: Number((e.target as HTMLInputElement).value) }),
        );
        break;

      case 'ultrasonic-hcsr04':
        q<HTMLInputElement>('[data-ctrl="us-dist"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ ultrasonicDistanceCm: Number((e.target as HTMLInputElement).value) }),
        );
        qAll<HTMLButtonElement>('[data-us-preset]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ ultrasonicDistanceCm: Number(b.dataset.usPreset) }),
          ),
        );
        break;

      case 'ld2490-radar':
        q('[data-ctrl="ld-present"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ ld2490TargetPresent: !params.ld2490TargetPresent }),
        );
        q('[data-ctrl="ld-moving"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ ld2490TargetMoving: !params.ld2490TargetMoving }),
        );
        q<HTMLInputElement>('[data-ctrl="ld-dist"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ ld2490TargetDistanceM: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="ld-thresh"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ ld2490ThresholdM: Number((e.target as HTMLInputElement).value) }),
        );
        break;

      case 'relay-flyback':
        q('[data-ctrl="relay-toggle"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ relayEnergized: !params.relayEnergized }),
        );
        break;

      case 'servo-pwm':
        q<HTMLInputElement>('[data-ctrl="servo-deg"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ servoAngleDeg: Number((e.target as HTMLInputElement).value) }),
        );
        qAll<HTMLButtonElement>('[data-servo-preset]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ servoAngleDeg: Number(b.dataset.servoPreset) }),
          ),
        );
        break;

      case 'piezo-buzzer':
        q('[data-ctrl="buzzer-toggle"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ buzzerEnabled: !params.buzzerEnabled }),
        );
        q<HTMLInputElement>('[data-ctrl="buzzer-freq"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ buzzerFrequencyHz: Number((e.target as HTMLInputElement).value) }),
        );
        qAll<HTMLButtonElement>('[data-buzzer-preset]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({
              buzzerEnabled: true,
              buzzerFrequencyHz: Number(b.dataset.buzzerPreset),
            }),
          ),
        );
        break;

      case 'wled-compact':
      case 'wled-medium':
      case 'wled-long-injection':
        qAll<HTMLButtonElement>('[data-wled-power]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ wledPowerSource: b.dataset.wledPower as WledPowerSourceId }),
          ),
        );
        q<HTMLInputElement>('[data-ctrl="wled-cap"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ wledBatteryCapacityMah: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="wled-soc"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ wledBatterySocPct: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="wled-len"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ wledLedCount: Number((e.target as HTMLInputElement).value) }),
        );
        qAll<HTMLButtonElement>('[data-wled-len]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ wledLedCount: Number(b.dataset.wledLen) }),
          ),
        );
        qAll<HTMLButtonElement>('[data-wled-effect]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({ wledEffect: b.dataset.wledEffect as WledEffectId }),
          ),
        );
        q<HTMLInputElement>('[data-ctrl="wled-bright"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ wledBrightnessPct: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="wled-limit"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ wledCurrentLimitMa: Number((e.target as HTMLInputElement).value) }),
        );
        q('[data-ctrl="wled-injection"]')?.addEventListener('click', () =>
          this.callbacks.onTogglePartRemoved('power-injection'),
        );
        break;

      case 'pi-traffic-light':
        q('[data-ctrl="pi-traffic-auto"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ piTrafficAuto: !params.piTrafficAuto }),
        );
        qAll<HTMLButtonElement>('[data-pi-phase]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({
              piTrafficPhase: b.dataset.piPhase as CircuitParameters['piTrafficPhase'],
            }),
          ),
        );
        break;

      case 'pi-fan-pwm':
        q('[data-ctrl="pi-fan-auto"]')?.addEventListener('click', () =>
          this.callbacks.onParamsChange({ piFanAutoMode: !params.piFanAutoMode }),
        );
        q<HTMLInputElement>('[data-ctrl="pi-temp"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ piCpuTempC: Number((e.target as HTMLInputElement).value) }),
        );
        q<HTMLInputElement>('[data-ctrl="pi-fan-man"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ piFanManualPct: Number((e.target as HTMLInputElement).value) }),
        );
        break;

      case 'pi-oled-i2c':
        qAll<HTMLButtonElement>('[data-oled-page]').forEach((b) =>
          b.addEventListener('click', () =>
            this.callbacks.onParamsChange({
              piOledPage: b.dataset.oledPage as CircuitParameters['piOledPage'],
            }),
          ),
        );
        q<HTMLInputElement>('[data-ctrl="oled-contrast"]')?.addEventListener('input', (e) =>
          this.callbacks.onParamsChange({ piOledContrastPct: Number((e.target as HTMLInputElement).value) }),
        );
        break;
    }
  }

  private syncLiveValues(params: CircuitParameters): void {
    const setText = (sel: string, txt: string) => {
      const el = this.container.querySelector(sel);
      if (el) el.textContent = txt;
    };
    const setHtml = (sel: string, html: string) => {
      const el = this.container.querySelector(sel);
      if (el) el.innerHTML = html;
    };
    const setSlider = (sel: string, val: number) => {
      const el = this.container.querySelector<HTMLInputElement>(sel);
      if (el && document.activeElement !== el) el.value = String(val);
    };

    switch (params.topology) {
      case 'led-resistor': {
        const toggle = this.container.querySelector<HTMLButtonElement>('[data-ctrl="gpio-toggle"]');
        if (toggle) {
          toggle.textContent = params.gpioOutputHigh ? 'HIGH (3,3 V)' : 'LOW (0,0 V)';
          toggle.className = `px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border transition cursor-pointer ${
            params.gpioOutputHigh ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-500' : 'eng-btn-neutral'
          }`;
        }
        setText('[data-val="led-vf"]', `${LED_SPECS[params.ledColor].forwardVoltage.toFixed(1).replace('.', ',')} V`);
        setText('[data-val="resistor-ohms"]', formatResistance(params.resistorOhms));
        setSlider('[data-ctrl="resistor-slider"]', ohmsToSlider(params.resistorOhms, LOG_RES_MIN, LOG_RES_MAX));
        setHtml('[data-val="color-bands"]', renderColorBandPills(params.resistorOhms));
        this.container.querySelectorAll<HTMLButtonElement>('[data-led-color]').forEach((btn) => {
          const active = btn.dataset.ledColor === params.ledColor;
          btn.className = `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
            active ? 'bg-cyan-500/15 border-cyan-500 eng-text-main font-medium' : 'eng-btn-neutral'
          }`;
        });
        break;
      }

      case 'button-pull': {
        const holdBtn = this.container.querySelector<HTMLButtonElement>('[data-ctrl="hold-button"]');
        if (holdBtn) {
          holdBtn.className = `w-full py-2.5 px-3 rounded-lg font-semibold text-xs border transition select-none cursor-pointer flex items-center justify-center gap-2 ${
            params.buttonPressed
              ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_16px_rgba(14,165,233,0.45)]'
              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-500 border-sky-500/45'
          }`;
          const spans = holdBtn.querySelectorAll('span');
          if (spans[1]) spans[1].textContent = params.buttonPressed ? 'TASTER GEDRÜCKT' : 'Taster halten (Leertaste / 3D-Klick)';
        }
        setText('[data-val="noise-amp"]', `${Math.round(params.noiseAmplitude * 100)} %`);
        setText('[data-val="pull-ohms"]', formatResistance(params.pullResistorOhms));
        setHtml('[data-val="pull-bands"]', renderColorBandPills(params.pullResistorOhms));
        break;
      }

      case 'voltage-divider':
        setText('[data-val="r1-ohms"]', formatResistance(params.r1Ohms));
        setHtml('[data-val="r1-bands"]', renderColorBandPills(params.r1Ohms));
        setText('[data-val="r2-ohms"]', formatResistance(params.r2Ohms));
        setHtml('[data-val="r2-bands"]', renderColorBandPills(params.r2Ohms));
        setText(
          '[data-val="ldr-info"]',
          `${Math.round(params.lightLevelPercent)} % (~${formatResistance(computeLdrResistance(params.lightLevelPercent))})`,
        );
        break;

      case 'pwm-dimmer':
        setText('[data-val="pwm-duty"]', `${Math.round(params.pwmDutyPercent)} %`);
        setSlider('[data-ctrl="pwm-duty"]', Math.round(params.pwmDutyPercent));
        setText('[data-val="pwm-freq"]', `${Math.round(params.pwmFrequencyHz)} Hz`);
        break;

      case 'rgb-led':
        setText('[data-val="rgb-r"]', `${Math.round(params.rgbRed)}`);
        setText('[data-val="rgb-g"]', `${Math.round(params.rgbGreen)}`);
        setText('[data-val="rgb-b"]', `${Math.round(params.rgbBlue)}`);
        setSlider('[data-ctrl="rgb-r"]', Math.round(params.rgbRed));
        setSlider('[data-ctrl="rgb-g"]', Math.round(params.rgbGreen));
        setSlider('[data-ctrl="rgb-b"]', Math.round(params.rgbBlue));
        break;

      case 'rc-lowpass':
        setText('[data-val="rc-r"]', formatResistance(params.rcResistorOhms));
        setText('[data-val="rc-c"]', `${Math.round(params.rcCapacitorUf)} µF`);
        break;

      case 'mosfet-driver': {
        const gBtn = this.container.querySelector<HTMLButtonElement>('[data-ctrl="mosfet-gate"]');
        if (gBtn) {
          gBtn.textContent = params.mosfetGateHigh ? 'HIGH (LEITEND)' : 'LOW (SPERREND)';
          gBtn.className = `px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
            params.mosfetGateHigh ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
          }`;
        }
        setText('[data-val="mosfet-r"]', `${Math.round(params.mosfetLoadOhms)} Ω`);
        this.container.querySelectorAll<HTMLButtonElement>('[data-mosfet-v]').forEach((b) => {
          const active = Number(b.dataset.mosfetV) === params.mosfetLoadVoltage;
          b.className = `py-1.5 rounded-lg border text-xs font-mono cursor-pointer ${
            active ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent font-semibold' : 'eng-btn-neutral'
          }`;
        });
        break;
      }

      case 'i2c-bme280':
        setText('[data-val="bme-t"]', `${params.bmeTempC.toFixed(1).replace('.', ',')} °C`);
        setText('[data-val="bme-h"]', `${Math.round(params.bmeHumidityPct)} %`);
        break;

      case 'ultrasonic-hcsr04':
        setText('[data-val="us-dist"]', `${Math.round(params.ultrasonicDistanceCm)} cm`);
        setSlider('[data-ctrl="us-dist"]', Math.round(params.ultrasonicDistanceCm));
        break;

      case 'ld2490-radar': {
        const pBtn = this.container.querySelector<HTMLButtonElement>('[data-ctrl="ld-present"]');
        if (pBtn) {
          pBtn.textContent = params.ld2490TargetPresent ? '● Person im Raum' : '○ Raum leer';
          pBtn.className = `py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
            params.ld2490TargetPresent ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
          }`;
        }
        const mBtn = this.container.querySelector<HTMLButtonElement>('[data-ctrl="ld-moving"]');
        if (mBtn) {
          mBtn.textContent = params.ld2490TargetMoving ? 'Bewegung aktiv' : 'Still (Atem-Präsenz)';
          mBtn.className = `py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
            params.ld2490TargetMoving ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
          }`;
        }
        setText('[data-val="ld-dist"]', `${params.ld2490TargetDistanceM.toFixed(1).replace('.', ',')} m`);
        setText('[data-val="ld-thresh"]', `${params.ld2490ThresholdM.toFixed(1).replace('.', ',')} m`);
        break;
      }

      case 'relay-flyback': {
        const rBtn = this.container.querySelector<HTMLButtonElement>('[data-ctrl="relay-toggle"]');
        if (rBtn) {
          rBtn.textContent = params.relayEnergized ? 'ANGEZOGEN (EIN)' : 'ABGEFALLEN (AUS)';
          rBtn.className = `px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
            params.relayEnergized ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
          }`;
        }
        break;
      }

      case 'servo-pwm':
        setText('[data-val="servo-deg"]', `${Math.round(params.servoAngleDeg)}°`);
        setSlider('[data-ctrl="servo-deg"]', Math.round(params.servoAngleDeg));
        break;

      case 'piezo-buzzer': {
        const bBtn = this.container.querySelector<HTMLButtonElement>('[data-ctrl="buzzer-toggle"]');
        if (bBtn) {
          bBtn.textContent = params.buzzerEnabled ? 'AKTIV (EIN)' : 'STUMM (AUS)';
          bBtn.className = `px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer ${
            params.buzzerEnabled ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
          }`;
        }
        setText('[data-val="buzzer-freq"]', `${Math.round(params.buzzerFrequencyHz)} Hz`);
        setSlider('[data-ctrl="buzzer-freq"]', Math.round(params.buzzerFrequencyHz));
        break;
      }

      case 'wled-compact':
      case 'wled-medium':
      case 'wled-long-injection': {
        const meters = (params.wledLedCount / 60).toFixed(2).replace('.', ',');
        setText('[data-val="wled-len"]', `${params.wledLedCount} LEDs (~${meters} m)`);
        setSlider('[data-ctrl="wled-len"]', params.wledLedCount);
        setText('[data-val="wled-bright"]', `${Math.round(params.wledBrightnessPct)} %`);
        setText('[data-val="wled-limit"]', `${Math.round(params.wledCurrentLimitMa)} mA`);
        setText(
          '[data-val="wled-cap"]',
          `${Math.round(params.wledBatteryCapacityMah / 1000)} Ah (${params.wledBatteryCapacityMah} mAh)`,
        );
        setText('[data-val="wled-soc"]', `${Math.round(params.wledBatterySocPct)} %`);
        this.container.querySelectorAll<HTMLButtonElement>('[data-wled-effect]').forEach((b) => {
          const active = b.dataset.wledEffect === params.wledEffect;
          b.className = `px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition ${
            active ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent font-semibold' : 'eng-btn-neutral'
          }`;
        });
        break;
      }

      case 'pi-traffic-light':
        this.container.querySelectorAll<HTMLButtonElement>('[data-pi-phase]').forEach((b) => {
          const active = b.dataset.piPhase === params.piTrafficPhase;
          b.className = `py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
            active ? 'bg-cyan-500/15 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
          }`;
        });
        break;

      case 'pi-fan-pwm':
        setText('[data-val="pi-temp"]', `${Math.round(params.piCpuTempC)} °C`);
        setText('[data-val="pi-fan-man"]', `${Math.round(params.piFanManualPct)} %`);
        break;

      case 'pi-oled-i2c':
        setText('[data-val="oled-contrast"]', `${Math.round(params.piOledContrastPct)} %`);
        break;
    }
  }
}
