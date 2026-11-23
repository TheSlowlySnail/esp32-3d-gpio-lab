import { ESP32_SPECS } from '../engine/ComponentRegistry';
import type { SimulationResult, ThemeMode } from '../engine/types';

/**
 * Echtzeit-2D-Oszilloskop (<canvas>) für ESP32-Signale (0–3,6 V)
 * mit eingezeichneten Logikschwellen VIH = 2,48 V und VIL = 0,83 V,
 * Light/Dark-Theme-Support und HOLD/RUN-Taste.
 */
export class Oscilloscope {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver;

  private readonly maxSamples = 220;
  private readonly samples: number[] = [];
  private paused = false;
  private theme: ThemeMode = 'dark';
  private currentLabel = 'GPIO 25';
  private isFloating = false;
  private isKickback = false;
  private lastSampleTime = 0;

  private pauseBtn!: HTMLButtonElement;
  private probeLabelEl!: HTMLElement;
  private liveReadoutEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.innerHTML = `
      <div class="eng-code-panel flex flex-col h-full rounded-lg border overflow-hidden">
        <div class="eng-header flex items-center justify-between px-3 py-1.5 border-b text-xs">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4] shrink-0"></span>
            <span class="font-semibold eng-text-main tracking-wide">OSZILLOSKOP</span>
            <span data-scope="probe" class="font-mono text-[11px] eng-text-accent bg-cyan-500/12 border border-cyan-500/30 px-1.5 py-0.5 rounded truncate">GPIO 25</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="hidden sm:inline text-[11px] font-mono eng-text-muted">
              <span class="text-emerald-500">V_IH 2,48V</span> · <span class="text-sky-500">V_IL 0,83V</span>
            </span>
            <span data-scope="readout" class="font-mono text-xs font-semibold eng-text-accent tabular-nums w-14 text-right">0,00 V</span>
            <button data-scope="pause" type="button" class="eng-btn-neutral px-2 py-0.5 rounded border text-[11px] font-mono transition cursor-pointer">
              HOLD
            </button>
          </div>
        </div>
        <div data-scope="canvas-wrap" class="relative flex-1 min-h-[120px] w-full">
          <canvas class="block w-full h-full"></canvas>
        </div>
      </div>
    `;

    const wrap = this.container.querySelector('[data-scope="canvas-wrap"]') as HTMLElement;
    this.canvas = wrap.querySelector('canvas')!;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas Context konnte nicht erstellt werden.');
    this.ctx = ctx;

    this.pauseBtn = this.container.querySelector('[data-scope="pause"]')!;
    this.probeLabelEl = this.container.querySelector('[data-scope="probe"]')!;
    this.liveReadoutEl = this.container.querySelector('[data-scope="readout"]')!;

    this.pauseBtn.addEventListener('click', () => {
      this.paused = !this.paused;
      this.pauseBtn.textContent = this.paused ? 'RUN' : 'HOLD';
      this.pauseBtn.classList.toggle('!bg-amber-500/20', this.paused);
      this.pauseBtn.classList.toggle('!border-amber-500/60', this.paused);
      this.pauseBtn.classList.toggle('!text-amber-500', this.paused);
    });

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.resizeCanvas(width, height);
      }
    });
    this.resizeObserver.observe(wrap);
  }

  public setTheme(theme: ThemeMode): void {
    this.theme = theme;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.draw(rect.width, rect.height);
    }
  }

  private resizeCanvas(cssWidth: number, cssHeight: number): void {
    if (cssWidth <= 0 || cssHeight <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw(cssWidth, cssHeight);
  }

  public clear(): void {
    this.samples.length = 0;
  }

  public pushSample(result: SimulationResult, nowMs: number): void {
    if (this.currentLabel !== result.probeLabel) {
      this.currentLabel = result.probeLabel;
      this.probeLabelEl.textContent = result.probePin;
      this.samples.length = 0;
    }

    this.isFloating = result.logicLevel === 'FLOATING';
    this.isKickback = result.kickbackSpikeActive;

    if (!this.paused) {
      if (nowMs - this.lastSampleTime >= 15) {
        this.lastSampleTime = nowMs;
        this.samples.push(result.nodeVoltage);
        if (this.samples.length > this.maxSamples) {
          this.samples.shift();
        }
        this.liveReadoutEl.textContent = `${result.nodeVoltage.toFixed(2).replace('.', ',')} V`;
      }
    }

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.draw(rect.width, rect.height);
    }
  }

  private draw(w: number, h: number): void {
    const ctx = this.ctx;
    const isLight = this.theme === 'light';

    const padLeft = 42;
    const padRight = 14;
    const padTop = 12;
    const padBottom = 18;
    const plotW = Math.max(10, w - padLeft - padRight);
    const plotH = Math.max(10, h - padTop - padBottom);

    const vMax = 3.6;
    const vToY = (v: number) => padTop + plotH - (Math.max(0, Math.min(vMax, v)) / vMax) * plotH;

    // Background
    ctx.fillStyle = isLight ? '#f8fafc' : '#060a12';
    ctx.fillRect(0, 0, w, h);

    // Undefined Schmitt-Trigger band
    const yVih = vToY(ESP32_SPECS.V_IH);
    const yVil = vToY(ESP32_SPECS.V_IL);
    ctx.fillStyle = isLight ? 'rgba(234, 179, 8, 0.08)' : 'rgba(250, 204, 21, 0.045)';
    ctx.fillRect(padLeft, yVih, plotW, yVil - yVih);

    // Horizontal voltage grid
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridVoltages = [0, 1.0, 2.0, 3.3];
    for (const gv of gridVoltages) {
      const y = vToY(gv);
      ctx.strokeStyle =
        gv === 3.3
          ? isLight
            ? 'rgba(220, 38, 38, 0.28)'
            : 'rgba(239, 68, 68, 0.25)'
          : isLight
            ? 'rgba(148, 163, 184, 0.35)'
            : 'rgba(51, 65, 85, 0.45)';
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      ctx.fillStyle = gv === 3.3 ? (isLight ? '#dc2626' : '#f87171') : '#64748b';
      ctx.fillText(`${gv.toFixed(1).replace('.', ',')}V`, padLeft - 6, y);
    }

    // Vertical time divisions
    const vDivs = 8;
    ctx.strokeStyle = isLight ? 'rgba(148, 163, 184, 0.28)' : 'rgba(51, 65, 85, 0.35)';
    for (let i = 0; i <= vDivs; i++) {
      const x = padLeft + (plotW / vDivs) * i;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
    }

    // VIH / VIL dashed thresholds
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = isLight ? 'rgba(5, 150, 105, 0.78)' : 'rgba(52, 211, 153, 0.78)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(padLeft, yVih);
    ctx.lineTo(padLeft + plotW, yVih);
    ctx.stroke();

    ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.78)' : 'rgba(56, 189, 248, 0.78)';
    ctx.beginPath();
    ctx.moveTo(padLeft, yVil);
    ctx.lineTo(padLeft + plotW, yVil);
    ctx.stroke();
    ctx.restore();

    ctx.font = 'bold 9.5px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = isLight ? '#047857' : 'rgba(52, 211, 153, 0.9)';
    ctx.fillText('VIH 2,48V (HIGH)', padLeft + 6, yVih - 7);

    ctx.fillStyle = isLight ? '#0369a1' : 'rgba(56, 189, 248, 0.9)';
    ctx.fillText('VIL 0,83V (LOW)', padLeft + 6, yVil + 9);

    // Waveform trace
    if (this.samples.length > 1) {
      const traceColor = this.isKickback
        ? '#ef4444'
        : this.isFloating
          ? isLight
            ? '#d97706'
            : '#fbbf24'
          : isLight
            ? '#0284c7'
            : '#22d3ee';
      const glowColor = this.isKickback
        ? 'rgba(239, 68, 68, 0.5)'
        : this.isFloating
          ? 'rgba(251, 191, 36, 0.35)'
          : isLight
            ? 'rgba(2, 132, 199, 0.25)'
            : 'rgba(34, 211, 238, 0.45)';

      ctx.save();
      ctx.strokeStyle = traceColor;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isLight ? 4 : 8;

      ctx.beginPath();
      const stepX = plotW / (this.maxSamples - 1);
      const startIndexOffset = this.maxSamples - this.samples.length;

      for (let i = 0; i < this.samples.length; i++) {
        const x = padLeft + (startIndexOffset + i) * stepX;
        const y = vToY(this.samples[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const lastV = this.samples[this.samples.length - 1];
      const tipX = padLeft + plotW;
      const tipY = vToY(lastV);
      ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public dispose(): void {
    this.resizeObserver.disconnect();
  }
}
