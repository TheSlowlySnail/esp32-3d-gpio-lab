import './style.css';
import { CircuitSolver, defaultComponentRegistry, ESP_BOARDS } from './engine';
import type {
  CircuitParameters,
  CircuitTopologyId,
  EspBoardId,
  HoverPartInfo,
  ThemeMode,
} from './engine';
import {
  createInitialCircuitParameters,
  getLessonById,
  LESSONS,
  type LessonCategory,
} from './lessons/lessons';
import { SceneManager } from './scene/SceneManager';
import { CodeGeneratorPanel } from './ui/CodeGenerator';
import { ControlsPanel } from './ui/ControlsPanel';
import { FritzingSchematicPanel } from './ui/FritzingSchematic';
import { Oscilloscope } from './ui/Oscilloscope';
import { TelemetryHud } from './ui/TelemetryHud';

const THEME_STORAGE_KEY = 'learn-esp32-theme';

class LearnEsp32App {
  private readonly root: HTMLElement;
  private readonly solver = new CircuitSolver();
  private params: CircuitParameters = createInitialCircuitParameters();
  private theme: ThemeMode = 'dark';

  private sceneManager!: SceneManager;
  private telemetryHud!: TelemetryHud;
  private oscilloscope!: Oscilloscope;
  private codeGenerator!: CodeGeneratorPanel;
  private controlsPanel!: ControlsPanel;
  private modalFritzing!: FritzingSchematicPanel;

  private lessonSelectEl!: HTMLSelectElement;
  private boardSelectEl!: HTMLSelectElement;
  private themeBtnEl!: HTMLButtonElement;
  private noBreadboardBtnEl!: HTMLButtonElement;
  private schematicModalEl!: HTMLElement;
  private hoverTooltipEl!: HTMLElement;
  private sceneSectionEl!: HTMLElement;

  private readonly startTimeMs = performance.now();
  private lastExplainUpdateMs = 0;
  private rafId = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.theme = this.loadSavedTheme();
    this.renderLayout();
    this.initSubsystems();
    this.applyTheme(this.theme);
    this.bindGlobalEvents();
    this.selectLesson('led-resistor', true);
    this.startSimulationLoop();
  }

  private loadSavedTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore storage errors
    }
    return 'dark';
  }

  private renderLayout(): void {
    const categories: LessonCategory[] = [
      'Grundlagen',
      'PWM & Leistung',
      'Sensoren & Busse',
      'Aktoren',
      'WLED & LED-Streifen',
    ];

    const lessonOptionsHtml = categories
      .map((cat) => {
        const items = LESSONS.filter((l) => l.category === cat)
          .map((l) => `<option value="${l.id}">${l.number} · ${l.title}</option>`)
          .join('');
        return `<optgroup label="${cat}">${items}</optgroup>`;
      })
      .join('');

    const standardBoards = ESP_BOARDS.filter((b) => !b.isMini)
      .map((b) => `<option value="${b.id}">${b.name}</option>`)
      .join('');
    const miniBoards = ESP_BOARDS.filter((b) => b.isMini)
      .map((b) => `<option value="${b.id}">${b.name} [MINI]</option>`)
      .join('');

    const registryCount = defaultComponentRegistry.getAll().length;

    this.root.innerHTML = `
      <!-- Top Navigation Bar -->
      <header class="eng-header h-14 shrink-0 px-3 sm:px-4 border-b flex items-center justify-between gap-2.5 z-20">
        <!-- Brand -->
        <div class="flex items-center gap-2.5 shrink-0">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_14px_rgba(6,182,212,0.35)] shrink-0">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
              <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>
            </svg>
          </div>
          <div class="leading-tight hidden md:block">
            <div class="flex items-center gap-1.5">
              <h1 class="text-sm font-bold tracking-tight eng-text-main">Learn ESP32 3D</h1>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 eng-text-accent border border-cyan-500/30">
                16 LABS
              </span>
            </div>
            <p class="text-[10.5px] eng-text-muted">6 ESP-Boards · WLED · Interaktive Diagnose</p>
          </div>
        </div>

        <!-- Center Selectors: Lesson Picker (16) + ESP Board Picker (6) -->
        <div class="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <div class="flex items-center gap-1 min-w-0 max-w-[345px] w-full">
            <button type="button" data-action="prev-lesson" title="Vorherige Lektion" class="eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs cursor-pointer shrink-0">◀</button>
            <select data-select="lesson" aria-label="Lektion auswählen" class="eng-select eng-input flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer focus:outline-none focus:border-cyan-500">
              ${lessonOptionsHtml}
            </select>
            <button type="button" data-action="next-lesson" title="Nächste Lektion" class="eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs cursor-pointer shrink-0">▶</button>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <span class="hidden xl:inline text-[11px] font-mono eng-text-muted">MCU:</span>
            <select data-select="board" aria-label="ESP-Modell auswählen" class="eng-select eng-input px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium cursor-pointer max-w-[220px] focus:outline-none focus:border-cyan-500">
              <optgroup label="Standard DevKits">${standardBoards}</optgroup>
              <optgroup label="Mini-Boards">${miniBoards}</optgroup>
            </select>
          </div>
        </div>

        <!-- Right Utility Actions -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-action="toggle-breadboard"
            title="Zwischen Steckbrett-Aufbau und Direktverdrahtung (WAGO 221 ohne Breadboard) wechseln"
            class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap"
          >
            <span data-bb-dot class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span data-bb-label>Ohne Breadboard</span>
          </button>

          <button
            type="button"
            data-action="open-schematic"
            title="Großen Fritzing-Schaltplan für diese Schaltung öffnen"
            class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap"
          >
            <span class="eng-text-accent font-mono">◈</span>
            <span class="hidden sm:inline">Schaltplan</span>
          </button>

          <button
            type="button"
            data-action="toggle-theme"
            title="Zwischen Hell- und Dunkelmodus wechseln"
            class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium"
          >
            <span data-theme-icon>☀️</span>
            <span data-theme-label class="hidden xl:inline">Hell</span>
          </button>

          <button
            type="button"
            data-action="reset-camera"
            title="Kamera auf aktuelle Schaltung zentrieren"
            class="eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5 eng-text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>
            </svg>
          </button>

          <button
            type="button"
            data-action="toggle-registry"
            class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer font-mono hidden 2xl:inline-flex"
            title="Registrierte Bauteile anzeigen"
          >
            Bauteile (${registryCount})
          </button>
        </div>
      </header>

      <!-- Main Engineering Workspace -->
      <main class="flex-1 flex min-h-0 overflow-hidden">
        <!-- Left & Center Column: 3D Stage + Bottom Instruments Dock -->
        <div class="flex-1 flex flex-col min-w-0 min-h-0">
          <!-- 3D Viewport -->
          <section data-section="scene" class="relative flex-1 min-h-[240px] overflow-hidden">
            <div data-mount="scene" class="w-full h-full"></div>

            <!-- Floating Telemetry HUD -->
            <div data-mount="hud" class="absolute top-3 left-3 right-3 pointer-events-none z-10"></div>

            <!-- Floating 3D Component Hover Tooltip -->
            <div
              data-tooltip="hover"
              class="hidden pointer-events-none fixed z-40 w-72 rounded-xl eng-hud-card backdrop-blur-md border shadow-2xl p-3 transition-opacity duration-75"
            >
              <div class="flex items-center justify-between gap-2">
                <span data-tip="category" class="text-[10px] font-mono uppercase tracking-wider eng-text-accent">Bauteil</span>
                <span data-tip="status" class="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border">EINGEBAUT</span>
              </div>
              <div data-tip="name" class="mt-1 text-xs font-bold eng-text-main leading-snug"></div>
              <p data-tip="desc" class="mt-1 text-[11px] eng-text-body leading-relaxed"></p>
              <div data-tip="spec" class="mt-2 pt-1.5 border-t border-slate-500/20 text-[10.5px] font-mono eng-text-muted"></div>
            </div>

            <!-- Subtle Controls Legend -->
            <div class="eng-hud-card absolute bottom-3 left-3 z-10 pointer-events-none flex items-center gap-2 text-[11px] font-mono eng-text-muted backdrop-blur-sm border rounded-md px-2.5 py-1">
              <span>Hover: Bauteil-Info</span>
              <span class="opacity-40">•</span>
              <span>Klick auf Bauteil: Entfernen/Einsetzen</span>
              <span class="opacity-40">•</span>
              <span data-hint="interactive" class="eng-text-accent">ESP32 3,3V Aktiv</span>
            </div>
          </section>

          <!-- Bottom Instruments Dock: Oscilloscope + Live Code Generator -->
          <section class="eng-dock h-[245px] shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5 p-2.5 border-t">
            <div data-mount="oscilloscope" class="min-h-0 h-full"></div>
            <div data-mount="codegen" class="min-h-0 h-full"></div>
          </section>
        </div>

        <!-- Right Inspector Sidebar -->
        <aside class="eng-sidebar w-[345px] xl:w-[390px] shrink-0 border-l overflow-y-auto p-4">
          <div data-mount="controls"></div>
        </aside>
      </main>

      <!-- Component Registry Modal -->
      <div data-modal="registry" class="hidden fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm items-center justify-center p-4">
        <div class="eng-card w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden">
          <div class="eng-header flex items-center justify-between px-4 py-3 border-b">
            <div>
              <h3 class="text-sm font-bold eng-text-main">ComponentRegistry — ${registryCount} Hardware-Komponenten &amp; 6 ESP-Boards</h3>
              <p class="text-xs eng-text-muted">Erweiterbare Bibliothek in <code class="eng-text-accent">src/engine/ComponentRegistry.ts</code> &amp; <code class="eng-text-accent">BoardCatalog.ts</code></p>
            </div>
            <button type="button" data-action="close-registry" class="eng-btn-neutral px-2.5 py-1 rounded border text-xs cursor-pointer">
              Schließen
            </button>
          </div>
          <div data-mount="registry-list" class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto"></div>
        </div>
      </div>

      <!-- Fritzing Schematic Fullscreen Modal -->
      <div data-modal="schematic" class="hidden fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm items-center justify-center p-4">
        <div class="eng-card w-full max-w-5xl rounded-xl border shadow-2xl overflow-hidden flex flex-col">
          <div class="eng-header flex items-center justify-between px-4 py-3 border-b gap-3">
            <div>
              <h3 data-schematic="title" class="text-sm font-bold eng-text-main">Fritzing-Schaltplan</h3>
              <p class="text-xs eng-text-muted">Live synchronisiert mit gewähltem ESP-Modell, Bauteilwerten, WAGO-/Breadboard-Modus &amp; entfernten Teilen</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button type="button" data-action="download-svg" class="eng-btn-neutral px-2.5 py-1 rounded border text-xs font-mono cursor-pointer">
                SVG speichern
              </button>
              <button type="button" data-action="close-schematic" class="eng-btn-neutral px-2.5 py-1 rounded border text-xs cursor-pointer">
                Schließen
              </button>
            </div>
          </div>
          <div data-mount="modal-fritzing" class="p-3 bg-transparent aspect-[820/365] max-h-[74vh] w-full flex items-center justify-center"></div>
        </div>
      </div>
    `;

    this.lessonSelectEl = this.root.querySelector('[data-select="lesson"]')!;
    this.boardSelectEl = this.root.querySelector('[data-select="board"]')!;
    this.themeBtnEl = this.root.querySelector('[data-action="toggle-theme"]')!;
    this.noBreadboardBtnEl = this.root.querySelector('[data-action="toggle-breadboard"]')!;
    this.schematicModalEl = this.root.querySelector('[data-modal="schematic"]')!;
    this.hoverTooltipEl = this.root.querySelector('[data-tooltip="hover"]')!;
    this.sceneSectionEl = this.root.querySelector('[data-section="scene"]')!;
  }

  private initSubsystems(): void {
    const sceneMount = this.root.querySelector('[data-mount="scene"]') as HTMLElement;
    const hudMount = this.root.querySelector('[data-mount="hud"]') as HTMLElement;
    const scopeMount = this.root.querySelector('[data-mount="oscilloscope"]') as HTMLElement;
    const codeMount = this.root.querySelector('[data-mount="codegen"]') as HTMLElement;
    const controlsMount = this.root.querySelector('[data-mount="controls"]') as HTMLElement;

    this.sceneManager = new SceneManager(sceneMount, {
      onButtonPressChange: (pressed) => this.setButtonPressed(pressed),
      onHoverPartChange: (info, x, y) => this.updateHoverTooltip(info, x, y),
      onTogglePartRemoved: (partId) => this.togglePartRemoved(partId),
    });

    this.telemetryHud = new TelemetryHud(hudMount);
    this.oscilloscope = new Oscilloscope(scopeMount);
    this.codeGenerator = new CodeGeneratorPanel(codeMount, () => this.openSchematicModal());
    this.modalFritzing = new FritzingSchematicPanel(
      this.root.querySelector('[data-mount="modal-fritzing"]') as HTMLElement,
    );
    this.controlsPanel = new ControlsPanel(controlsMount, {
      onParamsChange: (patch) => this.updateParams(patch),
      onButtonPressChange: (pressed) => this.setButtonPressed(pressed),
      onTogglePartRemoved: (partId) => this.togglePartRemoved(partId),
      onRestoreAllParts: () => this.restoreAllParts(),
    });

    this.populateRegistryModal();
  }

  private updateHoverTooltip(info: HoverPartInfo | null, clientX: number, clientY: number): void {
    if (!info) {
      this.hoverTooltipEl.classList.add('hidden');
      return;
    }

    const catEl = this.hoverTooltipEl.querySelector('[data-tip="category"]');
    const statusEl = this.hoverTooltipEl.querySelector('[data-tip="status"]');
    const nameEl = this.hoverTooltipEl.querySelector('[data-tip="name"]');
    const descEl = this.hoverTooltipEl.querySelector('[data-tip="desc"]');
    const specEl = this.hoverTooltipEl.querySelector('[data-tip="spec"]');

    if (catEl) catEl.textContent = info.categoryLabel;
    if (nameEl) nameEl.textContent = info.name;
    if (descEl) descEl.textContent = info.description;
    if (specEl) specEl.textContent = info.specLine;

    if (statusEl) {
      if (info.isRemoved) {
        statusEl.textContent = 'ENTFERNT';
        statusEl.className =
          'text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border bg-amber-500/20 text-amber-500 border-amber-500/50';
      } else if (info.removable) {
        statusEl.textContent = 'ENTFERNBAR';
        statusEl.className =
          'text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border bg-cyan-500/15 eng-text-accent border-cyan-500/40';
      } else {
        statusEl.textContent = 'FEST';
        statusEl.className =
          'text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border bg-slate-500/15 eng-text-muted border-slate-500/30';
      }
    }

    // Clamp tooltip cleanly inside viewport bounds
    const pad = 16;
    const tipW = 288;
    const tipH = 155;
    const bounds = this.sceneSectionEl.getBoundingClientRect();
    let left = clientX + 16;
    let top = clientY + 16;

    if (left + tipW > Math.min(window.innerWidth, bounds.right) - pad) {
      left = clientX - tipW - 16;
    }
    if (top + tipH > Math.min(window.innerHeight, bounds.bottom) - pad) {
      top = clientY - tipH - 12;
    }
    left = Math.max(pad, left);
    top = Math.max(64, top);

    this.hoverTooltipEl.style.left = `${Math.round(left)}px`;
    this.hoverTooltipEl.style.top = `${Math.round(top)}px`;
    this.hoverTooltipEl.classList.remove('hidden');
  }

  private togglePartRemoved(partId: string): void {
    // Keep synced with dedicated lesson toggles where applicable
    if (partId === 'i2c-pullups') {
      const nextActive = !this.params.i2cPullupEnabled;
      const filtered = this.params.removedParts.filter((id) => id !== partId);
      this.updateParams({
        i2cPullupEnabled: nextActive,
        removedParts: nextActive ? filtered : [...filtered, partId],
      });
      return;
    }
    if (partId === 'flyback-diode') {
      const nextActive = !this.params.relayFlybackDiode;
      const filtered = this.params.removedParts.filter((id) => id !== partId);
      this.updateParams({
        relayFlybackDiode: nextActive,
        removedParts: nextActive ? filtered : [...filtered, partId],
      });
      return;
    }
    if (partId === 'power-injection') {
      const currentlyActive =
        this.params.wledPowerInjection && !this.params.removedParts.includes(partId);
      const filtered = this.params.removedParts.filter((id) => id !== partId);
      this.updateParams({
        wledPowerInjection: !currentlyActive,
        removedParts: currentlyActive ? [...filtered, partId] : filtered,
      });
      return;
    }

    const exists = this.params.removedParts.includes(partId);
    const nextRemoved = exists
      ? this.params.removedParts.filter((id) => id !== partId)
      : [...this.params.removedParts, partId];

    this.updateParams({ removedParts: nextRemoved });
  }

  private restoreAllParts(): void {
    this.updateParams({
      removedParts: [],
      i2cPullupEnabled: true,
      relayFlybackDiode: true,
      wledPowerInjection: true,
    });
  }

  private applyTheme(mode: ThemeMode): void {
    this.theme = mode;
    const html = document.documentElement;
    if (mode === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }

    const iconEl = this.themeBtnEl.querySelector('[data-theme-icon]');
    const labelEl = this.themeBtnEl.querySelector('[data-theme-label]');
    if (iconEl) iconEl.textContent = mode === 'dark' ? '☀️' : '🌙';
    if (labelEl) labelEl.textContent = mode === 'dark' ? 'Hell' : 'Dunkel';

    this.sceneManager.setTheme(mode);
    this.oscilloscope.setTheme(mode);
    this.codeGenerator.setTheme(mode);
    this.stepSimulation(true);
  }

  private populateRegistryModal(): void {
    const listEl = this.root.querySelector('[data-mount="registry-list"]');
    if (!listEl) return;

    listEl.innerHTML = defaultComponentRegistry
      .getAll()
      .map((comp) => {
        const specs = Object.entries(comp.specs)
          .map(
            ([k, v]) =>
              `<div class="flex justify-between gap-2 text-[11px]"><span class="eng-text-muted">${k}</span><span class="font-mono eng-text-main text-right">${v}</span></div>`,
          )
          .join('');
        return `
          <div class="eng-card-soft rounded-lg border p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold eng-text-main">${comp.displayName}</span>
              <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/12 eng-text-accent border border-cyan-500/30">${comp.category}</span>
            </div>
            <p class="text-[11px] eng-text-muted leading-relaxed">${comp.description}</p>
            <div class="pt-1.5 border-t border-slate-500/20 flex flex-col gap-1">${specs}</div>
          </div>
        `;
      })
      .join('');
  }

  private bindGlobalEvents(): void {
    this.lessonSelectEl.addEventListener('change', () => {
      this.selectLesson(this.lessonSelectEl.value as CircuitTopologyId, false);
    });

    this.root.querySelector('[data-action="prev-lesson"]')?.addEventListener('click', () => {
      const idx = LESSONS.findIndex((l) => l.id === this.params.topology);
      const prev = LESSONS[(idx - 1 + LESSONS.length) % LESSONS.length];
      this.selectLesson(prev.id, false);
    });

    this.root.querySelector('[data-action="next-lesson"]')?.addEventListener('click', () => {
      const idx = LESSONS.findIndex((l) => l.id === this.params.topology);
      const next = LESSONS[(idx + 1) % LESSONS.length];
      this.selectLesson(next.id, false);
    });

    this.boardSelectEl.addEventListener('change', () => {
      this.selectBoard(this.boardSelectEl.value as EspBoardId);
    });

    this.themeBtnEl.addEventListener('click', () => {
      this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
    });

    this.noBreadboardBtnEl.addEventListener('click', () => {
      const next = !this.params.withoutBreadboard;
      this.updateBreadboardToggleUi(next);
      this.updateParams({ withoutBreadboard: next });
    });

    this.root.querySelector('[data-action="open-schematic"]')?.addEventListener('click', () => {
      this.openSchematicModal();
    });
    this.root.querySelector('[data-action="close-schematic"]')?.addEventListener('click', () => {
      this.schematicModalEl.classList.add('hidden');
      this.schematicModalEl.classList.remove('flex');
    });
    this.schematicModalEl.addEventListener('click', (e) => {
      if (e.target === this.schematicModalEl) {
        this.schematicModalEl.classList.add('hidden');
        this.schematicModalEl.classList.remove('flex');
      }
    });
    this.root.querySelector('[data-action="download-svg"]')?.addEventListener('click', () => {
      const svg = this.modalFritzing.getCurrentSvg();
      if (!svg) return;
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fritzing-${this.params.topology}-${this.params.boardId}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });

    this.root.querySelector('[data-action="reset-camera"]')?.addEventListener('click', () => {
      const lesson = getLessonById(this.params.topology);
      this.sceneManager.focusCamera(lesson.cameraPreset.position, lesson.cameraPreset.target);
    });

    const modal = this.root.querySelector('[data-modal="registry"]') as HTMLElement;
    this.root.querySelector('[data-action="toggle-registry"]')?.addEventListener('click', () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
    this.root.querySelector('[data-action="close-registry"]')?.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (this.params.topology === 'button-pull') {
        e.preventDefault();
        this.setButtonPressed(true);
      } else if (this.params.topology === 'led-resistor') {
        e.preventDefault();
        this.updateParams({ gpioOutputHigh: !this.params.gpioOutputHigh });
      } else if (this.params.topology === 'relay-flyback') {
        e.preventDefault();
        this.updateParams({ relayEnergized: !this.params.relayEnergized });
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code !== 'Space') return;
      if (this.params.topology === 'button-pull' && this.params.buttonPressed) {
        e.preventDefault();
        this.setButtonPressed(false);
      }
    });

    window.addEventListener('blur', () => {
      if (this.params.buttonPressed) {
        this.setButtonPressed(false);
      }
    });
  }

  private selectBoard(boardId: EspBoardId): void {
    this.params = { ...this.params, boardId };
    this.boardSelectEl.value = boardId;
    const lesson = getLessonById(this.params.topology);
    this.controlsPanel.render(lesson, this.params);
    this.stepSimulation(true);
  }

  private selectLesson(id: CircuitTopologyId, isInitial: boolean): void {
    const lesson = getLessonById(id);
    this.solver.resetDynamicState();
    this.params = {
      ...this.params,
      ...lesson.defaultParams,
      topology: id,
      removedParts: [],
      buttonPressed: false,
    };

    this.lessonSelectEl.value = id;
    this.hoverTooltipEl.classList.add('hidden');

    const hintEl = this.root.querySelector('[data-hint="interactive"]');
    if (hintEl) {
      if (id === 'button-pull') {
        hintEl.textContent = '3D-Taster drücken oder Pull-R entfernen';
      } else if (id === 'ld2490-radar') {
        hintEl.textContent = 'LD2490 24 GHz mmWave Radar aktiv';
      } else if (id.startsWith('wled-')) {
        hintEl.textContent = `WLED ${this.params.wledLedCount} LEDs · Klicke Bauteile zum Entfernen`;
      } else {
        hintEl.textContent = `${lesson.getPrimaryPin(this.params.boardId)} · Live`;
      }
    }

    this.oscilloscope.clear();
    if (!isInitial) {
      this.sceneManager.focusCamera(lesson.cameraPreset.position, lesson.cameraPreset.target);
    }

    this.controlsPanel.render(lesson, this.params);
    this.stepSimulation(true);
  }

  private updateParams(patch: Partial<CircuitParameters>): void {
    this.params = { ...this.params, ...patch };
    const lesson = getLessonById(this.params.topology);
    this.controlsPanel.render(lesson, this.params);
    this.stepSimulation(true);
  }

  private setButtonPressed(pressed: boolean): void {
    if (this.params.buttonPressed === pressed) return;
    this.params = { ...this.params, buttonPressed: pressed };
    const lesson = getLessonById(this.params.topology);
    this.controlsPanel.render(lesson, this.params);
    this.stepSimulation(true);
  }

  private updateBreadboardToggleUi(withoutBreadboard: boolean): void {
    const dot = this.noBreadboardBtnEl.querySelector('[data-bb-dot]');
    const label = this.noBreadboardBtnEl.querySelector('[data-bb-label]');
    if (withoutBreadboard) {
      this.noBreadboardBtnEl.className =
        'px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-semibold whitespace-nowrap bg-orange-500/18 border-orange-500 text-orange-500';
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]';
      if (label) label.textContent = 'Ohne Breadboard ✓';
    } else {
      this.noBreadboardBtnEl.className =
        'eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap';
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-400';
      if (label) label.textContent = 'Ohne Breadboard';
    }
  }

  private openSchematicModal(): void {
    const lesson = getLessonById(this.params.topology);
    const titleEl = this.schematicModalEl.querySelector('[data-schematic="title"]');
    if (titleEl) {
      titleEl.textContent = `Fritzing-Schaltplan — ${lesson.number} · ${lesson.title}`;
    }
    this.schematicModalEl.classList.remove('hidden');
    this.schematicModalEl.classList.add('flex');
    this.stepSimulation(true);
  }

  private stepSimulation(forceHudUpdate: boolean): void {
    const nowMs = performance.now();
    const elapsedSeconds = (nowMs - this.startTimeMs) / 1000;

    const result = this.solver.solve(this.params, elapsedSeconds);
    this.sceneManager.syncSimulation(this.params, result);
    this.telemetryHud.update(result, nowMs, forceHudUpdate);
    this.oscilloscope.pushSample(result, nowMs);

    if (forceHudUpdate || nowMs - this.lastExplainUpdateMs >= 200) {
      this.lastExplainUpdateMs = nowMs;
      this.controlsPanel.updateExplanation(result.explanation);
    }

    if (forceHudUpdate) {
      this.codeGenerator.update(this.params, result);
      this.modalFritzing.update(this.params, result, this.theme);
    }
  }

  private startSimulationLoop(): void {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      this.stepSimulation(false);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.sceneManager.dispose();
    this.oscilloscope.dispose();
  }
}

const appRoot = document.getElementById('app');
if (appRoot) {
  new LearnEsp32App(appRoot);
}
