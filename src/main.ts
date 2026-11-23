import './style.css';
import { CircuitSolver, defaultComponentRegistry, ESP_BOARDS, getEspBoardById } from './engine';
import type {
  CircuitParameters,
  CircuitTopologyId,
  EspBoardId,
  HoverPartInfo,
  SimulationResult,
  ThemeMode,
} from './engine';
import {
  createInitialCircuitParameters,
  getLessonById,
  LESSONS,
  type LessonCategory,
} from './lessons/lessons';
import {
  applyGuidedStep,
  getGuidedProjectById,
  GUIDED_PROJECTS,
} from './sandbox/GuidedProjects';
import { FavoritesStore, type FavoriteKind } from './sandbox/FavoritesStore';
import { FUNNY_IDEAS, type FunnyIdea } from './sandbox/FunnyIdeas';
import {
  createStarterSandboxState,
  evaluateSandboxCircuit,
  getCatalogItem,
  SANDBOX_CATALOG,
} from './sandbox/SandboxEngine';
import type {
  AppMode,
  HighlightMarker,
  PlacedPart,
  PlacedWire,
  SandboxPartType,
  SandboxSimSummary,
  SandboxState,
  SandboxToolId,
  WireEndpoint,
} from './sandbox/SandboxTypes';
import { SceneManager } from './scene/SceneManager';
import { CodeGeneratorPanel } from './ui/CodeGenerator';
import { ControlsPanel } from './ui/ControlsPanel';
import { FavoritesView } from './ui/FavoritesView';
import { FritzingSchematicPanel } from './ui/FritzingSchematic';
import { FunnyIdeasView } from './ui/FunnyIdeasView';
import { Oscilloscope } from './ui/Oscilloscope';
import { SandboxPanel } from './ui/SandboxPanel';
import { TelemetryHud } from './ui/TelemetryHud';

const THEME_STORAGE_KEY = 'learn-esp32-theme';

function createDemoSandboxState(): SandboxState {
  return {
    parts: [
      { id: 'demo-r1', type: 'resistor-220', col: 4, row: 'h' },
      { id: 'demo-led1', type: 'led-red', col: 10, row: 'g' },
      { id: 'demo-radar', type: 'ld2490', col: 15, row: 'h' },
      { id: 'demo-oled', type: 'oled', col: 22, row: 'g' },
    ],
    wires: [
      {
        id: 'demo-w1',
        from: { kind: 'board', boardPinRole: 'GND' },
        to: { kind: 'breadboard', col: 2, row: '-top' },
        colorHex: '#1e293b',
      },
      {
        id: 'demo-w2',
        from: { kind: 'board', boardPinRole: '3V3' },
        to: { kind: 'breadboard', col: 3, row: '+top' },
        colorHex: '#ef4444',
      },
      {
        id: 'demo-w3',
        from: { kind: 'board', boardPinRole: 'outA' },
        to: { kind: 'breadboard', col: 4, row: 'f' },
        colorHex: '#38bdf8',
      },
      {
        id: 'demo-w4',
        from: { kind: 'breadboard', col: 12, row: 'j' },
        to: { kind: 'breadboard', col: 12, row: '-top' },
        colorHex: '#1e293b',
      },
      {
        id: 'demo-w5',
        from: { kind: 'breadboard', col: 15, row: 'j' },
        to: { kind: 'breadboard', col: 15, row: '+top' },
        colorHex: '#ef4444',
      },
      {
        id: 'demo-w6',
        from: { kind: 'breadboard', col: 16, row: 'j' },
        to: { kind: 'breadboard', col: 16, row: '-top' },
        colorHex: '#1e293b',
      },
      {
        id: 'demo-w6b',
        from: { kind: 'breadboard', col: 19, row: 'i' },
        to: { kind: 'board', boardPinRole: 'inputA' },
        colorHex: '#22c55e',
      },
      {
        id: 'demo-w7',
        from: { kind: 'breadboard', col: 22, row: 'j' },
        to: { kind: 'breadboard', col: 22, row: '-top' },
        colorHex: '#1e293b',
      },
      {
        id: 'demo-w8',
        from: { kind: 'breadboard', col: 23, row: 'j' },
        to: { kind: 'breadboard', col: 23, row: '+top' },
        colorHex: '#ef4444',
      },
      {
        id: 'demo-w9',
        from: { kind: 'board', boardPinRole: 'scl' },
        to: { kind: 'breadboard', col: 24, row: 'i' },
        colorHex: '#facc15',
      },
      {
        id: 'demo-w10',
        from: { kind: 'board', boardPinRole: 'sda' },
        to: { kind: 'breadboard', col: 25, row: 'h' },
        colorHex: '#38bdf8',
      },
    ],
    gpioHigh: true,
    buttonPressed: false,
    lightPercent: 60,
    servoAngleDeg: 90,
    radarPresent: true,
    sensorTriggered: true,
    switchClosed: true,
  };
}

class LearnEsp32App {
  private readonly root: HTMLElement;
  private readonly solver = new CircuitSolver();
  private params: CircuitParameters = createInitialCircuitParameters();
  private theme: ThemeMode = 'dark';
  private roomDimmed = false;

  // App-Modus: Lektionen | Freie Werkbank | Geführter Bau-Assistent | Funny Ideen | Favoriten
  private appMode: AppMode = 'lessons';
  private readonly favorites = new FavoritesStore();
  private sandboxState: SandboxState = createStarterSandboxState();
  private sandboxTool: SandboxToolId = 'place';
  private selectedPartType: SandboxPartType = 'resistor-220';
  private selectedMovePartId: string | null = null;
  private wireColorHex = '#38bdf8';
  private wireStart: WireEndpoint | null = null;
  private guidedProjectId: string = GUIDED_PROJECTS[0].id;

  private sceneManager!: SceneManager;
  private telemetryHud!: TelemetryHud;
  private oscilloscope!: Oscilloscope;
  private codeGenerator!: CodeGeneratorPanel;
  private controlsPanel!: ControlsPanel;
  private sandboxPanel!: SandboxPanel;
  private funnyView!: FunnyIdeasView;
  private favoritesView!: FavoritesView;
  private modalFritzing!: FritzingSchematicPanel;

  private lessonSelectEl!: HTMLSelectElement;
  private lessonPickerWrapEl!: HTMLElement;
  private lessonFavBtnEl!: HTMLButtonElement;
  private boardSelectEl!: HTMLSelectElement;
  private themeBtnEl!: HTMLButtonElement;
  private roomDimBtnEl!: HTMLButtonElement;
  private noBreadboardBtnEl!: HTMLButtonElement;
  private workspaceMainEl!: HTMLElement;
  private funnyMountEl!: HTMLElement;
  private favoritesMountEl!: HTMLElement;
  private favCountBadgeEl!: HTMLElement;
  private controlsMountEl!: HTMLElement;
  private sandboxMountEl!: HTMLElement;
  private modeLegendEl!: HTMLElement;
  private modeSubbarHintEl!: HTMLElement;
  private schematicModalEl!: HTMLElement;
  private boardsModalEl!: HTMLElement;
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
      'Raspberry Pi',
    ];

    const lessonOptionsHtml = categories
      .map((cat) => {
        const items = LESSONS.filter((l) => l.category === cat)
          .map((l) => `<option value="${l.id}">${l.number} · ${l.title}</option>`)
          .join('');
        return `<optgroup label="${cat}">${items}</optgroup>`;
      })
      .join('');

    const espStandard = ESP_BOARDS.filter((b) => b.family === 'esp32' && !b.isMini)
      .map((b) => `<option value="${b.id}">${b.name}</option>`)
      .join('');
    const espMinis = ESP_BOARDS.filter((b) => b.family === 'esp32' && b.isMini)
      .map((b) => `<option value="${b.id}">${b.name} [MINI]</option>`)
      .join('');
    const rpiSbcs = ESP_BOARDS.filter((b) => b.family === 'raspberry-pi-sbc')
      .map((b) => `<option value="${b.id}">${b.name}${b.isMini ? ' [MINI]' : ''}</option>`)
      .join('');
    const rpiMcus = ESP_BOARDS.filter((b) => b.family === 'raspberry-pi-mcu')
      .map((b) => `<option value="${b.id}">${b.name} [MCU]</option>`)
      .join('');

    const registryCount = defaultComponentRegistry.getAll().length;
    const boardCount = ESP_BOARDS.length;

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
              <h1 class="text-sm font-bold tracking-tight eng-text-main">Learn ESP &amp; Pi 3D</h1>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 eng-text-accent border border-cyan-500/30">
                19 LABS
              </span>
            </div>
            <p class="text-[10.5px] eng-text-muted">${boardCount} Boards (ESP32 &amp; Raspberry Pi) · WLED</p>
          </div>
        </div>

        <!-- Center Selectors: Lesson Picker (19) + Board Picker (10) -->
        <div class="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <div data-wrap="lesson-picker" class="flex items-center gap-1 min-w-0 max-w-[355px] w-full">
            <button type="button" data-action="prev-lesson" title="Vorherige Lektion" class="eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs cursor-pointer shrink-0">◀</button>
            <select data-select="lesson" aria-label="Lektion auswählen" class="eng-select eng-input flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer focus:outline-none focus:border-cyan-500">
              ${lessonOptionsHtml}
            </select>
            <button type="button" data-action="next-lesson" title="Nächste Lektion" class="eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs cursor-pointer shrink-0">▶</button>
            <button type="button" data-action="toggle-lesson-fav" title="Aktuelle Lektion als Favorit merken" class="eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs cursor-pointer shrink-0">☆</button>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <span class="hidden 2xl:inline text-[11px] font-mono eng-text-muted">Board:</span>
            <select data-select="board" aria-label="Mikrocomputer auswählen" class="eng-select eng-input px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium cursor-pointer max-w-[205px] focus:outline-none focus:border-cyan-500">
              <optgroup label="ESP32 Standard DevKits">${espStandard}</optgroup>
              <optgroup label="ESP32 Mini-Boards">${espMinis}</optgroup>
              <optgroup label="Raspberry Pi (Linux SBC)">${rpiSbcs}</optgroup>
              <optgroup label="Raspberry Pi (Mikrocontroller)">${rpiMcus}</optgroup>
            </select>
          </div>
        </div>

        <!-- Right Utility Actions -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-action="open-boards"
            title="Alle 10 Mikrocomputer &amp; Mikrocontroller im Vergleich kennenlernen"
            class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap"
          >
            <span class="eng-text-accent">▣</span>
            <span>Boards (${boardCount})</span>
          </button>

          <button
            type="button"
            data-action="toggle-room-dim"
            title="3D-Raumlicht abdunkeln, damit LEDs, WLED-Streifen, Ampel und OLED stark leuchten"
            class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap"
          >
            <span data-dim-icon>💡</span>
            <span data-dim-label class="hidden lg:inline">Raum dunkel</span>
          </button>

          <button
            type="button"
            data-action="toggle-breadboard"
            title="Zwischen Steckbrett-Aufbau und Direktverdrahtung (WAGO 221 ohne Breadboard) wechseln"
            class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap"
          >
            <span data-bb-dot class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span data-bb-label class="hidden xl:inline">Ohne Breadboard</span>
          </button>

          <button
            type="button"
            data-action="open-schematic"
            title="Großen Fritzing-Schaltplan für diese Schaltung öffnen"
            class="eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap"
          >
            <span class="eng-text-accent font-mono">◈</span>
            <span class="hidden lg:inline">Schaltplan</span>
          </button>

          <button
            type="button"
            data-action="toggle-theme"
            title="Zwischen Hell- und Dunkelmodus wechseln"
            class="eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1 font-medium"
          >
            <span data-theme-icon>☀️</span>
            <span data-theme-label class="hidden 2xl:inline">Hell</span>
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
            class="eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs transition cursor-pointer font-mono hidden 2xl:inline-flex"
            title="Registrierte Bauteile anzeigen"
          >
            Teile (${registryCount})
          </button>
        </div>
      </header>

      <!-- 5-Sektionen-Navigationsleiste: Lektionen | Freie Werkbank | Bau mit mir! | Funny Ideen | Favoriten -->
      <nav class="eng-header shrink-0 px-3 sm:px-4 py-1.5 border-b flex items-center justify-between gap-3 z-20">
        <div class="flex items-center gap-1.5 overflow-x-auto shrink-0" role="tablist" aria-label="Arbeitsbereich wählen">
          <button
            type="button"
            role="tab"
            data-mode="lessons"
            class="px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <span>📚</span>
            <span>Lektionen</span>
            <span class="text-[10px] font-mono opacity-80">(${LESSONS.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            data-mode="sandbox"
            class="px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🔧</span>
            <span>Freie Werkbank</span>
            <span class="text-[10px] font-mono opacity-80">(${SANDBOX_CATALOG.length} Teile)</span>
          </button>
          <button
            type="button"
            role="tab"
            data-mode="guided"
            class="px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🧭</span>
            <span>Bau mit mir!</span>
            <span class="text-[10px] font-mono opacity-80">(${GUIDED_PROJECTS.length} Projekte)</span>
          </button>
          <button
            type="button"
            role="tab"
            data-mode="funny"
            class="px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <span>😂</span>
            <span>Funny Ideen</span>
            <span class="text-[10px] font-mono opacity-80">(${FUNNY_IDEAS.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            data-mode="favorites"
            class="px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <span>⭐</span>
            <span>Favoriten</span>
            <span data-fav-count class="text-[10px] font-mono opacity-80">(${this.favorites.getTotalCount()})</span>
          </button>
        </div>
        <div data-mode-hint class="hidden 2xl:flex items-center gap-1.5 text-[11px] font-mono eng-text-muted truncate min-w-0">
          <span>Wähle eine Lektion oder baue in der Werkbank deine eigene Schaltung</span>
        </div>
      </nav>

      <!-- Main Engineering Workspace (3D + Dock + Sidebar) -->
      <main data-wrap="workspace" class="flex-1 flex min-h-0 overflow-hidden">
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
            <div data-legend="mode" class="eng-hud-card absolute bottom-3 left-3 z-10 pointer-events-none flex items-center gap-2 text-[11px] font-mono eng-text-muted backdrop-blur-sm border rounded-md px-2.5 py-1">
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
          <div data-mount="sandbox" class="hidden"></div>
        </aside>
      </main>

      <!-- Rubrik: Funny Maker-Ideen für Raspberry Pi & ESP32 -->
      <section data-mount="funny" class="hidden flex-1 overflow-y-auto"></section>

      <!-- Rubrik: Favoriten (Gespeicherte Bauteile, Lektionen, Bauprojekte & Funny Ideen) -->
      <section data-mount="favorites" class="hidden flex-1 overflow-y-auto"></section>

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

      <!-- Rubrik: Alle Mikrocomputer & Mikrocontroller im Überblick -->
      <div data-modal="boards" class="hidden fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm items-center justify-center p-4">
        <div class="eng-card w-full max-w-5xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
          <div class="eng-header flex items-center justify-between px-5 py-3.5 border-b gap-3">
            <div>
              <h3 class="text-sm font-bold eng-text-main">Mikrocomputer &amp; Mikrocontroller — Alle ${boardCount} Boards im Überblick</h3>
              <p class="text-xs eng-text-muted">Vergleich zwischen ESP32-Mikrocontrollern (Echtzeit, Stromspar, WLAN/Zigbee) und Raspberry Pi Einplatinencomputern (Linux SBC, 40-Pin-GPIO &amp; Python)</p>
            </div>
            <button type="button" data-action="close-boards" class="eng-btn-neutral px-3 py-1.5 rounded-lg border text-xs cursor-pointer">
              Schließen
            </button>
          </div>
          <div data-mount="boards-showcase" class="p-5 overflow-y-auto flex flex-col gap-5"></div>
        </div>
      </div>
    `;

    this.lessonSelectEl = this.root.querySelector('[data-select="lesson"]')!;
    this.lessonPickerWrapEl = this.root.querySelector('[data-wrap="lesson-picker"]')!;
    this.lessonFavBtnEl = this.root.querySelector('[data-action="toggle-lesson-fav"]')!;
    this.boardSelectEl = this.root.querySelector('[data-select="board"]')!;
    this.themeBtnEl = this.root.querySelector('[data-action="toggle-theme"]')!;
    this.roomDimBtnEl = this.root.querySelector('[data-action="toggle-room-dim"]')!;
    this.noBreadboardBtnEl = this.root.querySelector('[data-action="toggle-breadboard"]')!;
    this.workspaceMainEl = this.root.querySelector('[data-wrap="workspace"]')!;
    this.funnyMountEl = this.root.querySelector('[data-mount="funny"]')!;
    this.favoritesMountEl = this.root.querySelector('[data-mount="favorites"]')!;
    this.favCountBadgeEl = this.root.querySelector('[data-fav-count]')!;
    this.controlsMountEl = this.root.querySelector('[data-mount="controls"]')!;
    this.sandboxMountEl = this.root.querySelector('[data-mount="sandbox"]')!;
    this.modeLegendEl = this.root.querySelector('[data-legend="mode"]')!;
    this.modeSubbarHintEl = this.root.querySelector('[data-mode-hint]')!;
    this.schematicModalEl = this.root.querySelector('[data-modal="schematic"]')!;
    this.boardsModalEl = this.root.querySelector('[data-modal="boards"]')!;
    this.hoverTooltipEl = this.root.querySelector('[data-tooltip="hover"]')!;
    this.sceneSectionEl = this.root.querySelector('[data-section="scene"]')!;
  }

  private initSubsystems(): void {
    const sceneMount = this.root.querySelector('[data-mount="scene"]') as HTMLElement;
    const hudMount = this.root.querySelector('[data-mount="hud"]') as HTMLElement;
    const scopeMount = this.root.querySelector('[data-mount="oscilloscope"]') as HTMLElement;
    const codeMount = this.root.querySelector('[data-mount="codegen"]') as HTMLElement;

    this.sceneManager = new SceneManager(sceneMount, {
      onButtonPressChange: (pressed) => this.setButtonPressed(pressed),
      onHoverPartChange: (info, x, y) => this.updateHoverTooltip(info, x, y),
      onTogglePartRemoved: (partId) => this.togglePartRemoved(partId),
      onSandboxEndpointClick: (endpoint) => this.handleSandboxEndpointClick(endpoint),
      onSandboxDeleteItem: (kind, id) => this.handleSandboxDeleteItem(kind, id),
      onSandboxPickPart: (partId) => {
        this.selectedMovePartId = partId;
        this.stepSimulation(true);
      },
    });

    this.telemetryHud = new TelemetryHud(hudMount);
    this.oscilloscope = new Oscilloscope(scopeMount);
    this.codeGenerator = new CodeGeneratorPanel(codeMount, () => this.openSchematicModal());
    this.modalFritzing = new FritzingSchematicPanel(
      this.root.querySelector('[data-mount="modal-fritzing"]') as HTMLElement,
    );
    this.controlsPanel = new ControlsPanel(this.controlsMountEl, {
      onParamsChange: (patch) => this.updateParams(patch),
      onButtonPressChange: (pressed) => this.setButtonPressed(pressed),
      onTogglePartRemoved: (partId) => this.togglePartRemoved(partId),
      onRestoreAllParts: () => this.restoreAllParts(),
    });
    this.funnyView = new FunnyIdeasView(
      this.funnyMountEl,
      (idea) => this.loadFunnyIdeaInSandbox(idea),
      (id) => this.favorites.has('funny', id),
      (id) => this.handleToggleFavorite('funny', id),
    );
    this.favoritesView = new FavoritesView(this.favoritesMountEl, this.favorites, {
      onOpenPartInSandbox: (type) => {
        this.selectedPartType = type;
        this.sandboxTool = 'place';
        this.setAppMode('sandbox');
      },
      onOpenLesson: (id) => {
        this.setAppMode('lessons');
        this.selectLesson(id, false);
      },
      onOpenGuidedProject: (projectId) => {
        this.guidedProjectId = projectId;
        this.sandboxState = createStarterSandboxState();
        this.setAppMode('guided');
      },
      onLoadFunnyIdea: (idea) => this.loadFunnyIdeaInSandbox(idea),
      onToggleFavorite: (kind, id) => this.handleToggleFavorite(kind, id),
      onClearAllFavorites: () => {
        this.favorites.clearAll();
        this.refreshFavoritesUi();
      },
    });
    this.sandboxPanel = new SandboxPanel(this.sandboxMountEl, {
      onSelectTool: (tool) => {
        this.sandboxTool = tool;
        this.wireStart = null;
        if (tool !== 'move') this.selectedMovePartId = null;
        this.sceneManager.setSandboxTool(tool);
        this.stepSimulation(true);
      },
      onSelectPartType: (type) => {
        this.selectedPartType = type;
        this.sandboxTool = 'place';
        this.wireStart = null;
        this.selectedMovePartId = null;
        this.sceneManager.setSandboxTool('place');
        this.stepSimulation(true);
      },
      onSelectWireColor: (hex) => {
        this.wireColorHex = hex;
        this.sandboxTool = 'wire';
        this.selectedMovePartId = null;
        this.sceneManager.setSandboxTool('wire');
        this.stepSimulation(true);
      },
      onCancelWire: () => {
        this.wireStart = null;
        this.stepSimulation(true);
      },
      onSelectMovePart: (partId) => {
        this.selectedMovePartId = partId;
        if (partId) {
          this.sandboxTool = 'move';
          this.sceneManager.setSandboxTool('move');
        }
        this.stepSimulation(true);
      },
      onNudgePart: (partId, deltaCol) => {
        this.sandboxState = {
          ...this.sandboxState,
          parts: this.sandboxState.parts.map((p) => {
            if (p.id !== partId) return p;
            const item = getCatalogItem(p.type);
            const nextCol = Math.max(1, Math.min(30 - item.colSpan, p.col + deltaCol));
            return { ...p, col: nextCol };
          }),
        };
        this.stepSimulation(true);
      },
      onDeletePart: (id) => {
        if (this.selectedMovePartId === id) this.selectedMovePartId = null;
        this.sandboxState = {
          ...this.sandboxState,
          parts: this.sandboxState.parts.filter((p) => p.id !== id),
        };
        this.stepSimulation(true);
      },
      onDeleteWire: (id) => {
        this.sandboxState = {
          ...this.sandboxState,
          wires: this.sandboxState.wires.filter((w) => w.id !== id),
        };
        this.stepSimulation(true);
      },
      onClearBoard: () => {
        this.sandboxState = createStarterSandboxState();
        this.wireStart = null;
        this.selectedMovePartId = null;
        this.stepSimulation(true);
      },
      onLoadStarterKit: () => {
        this.sandboxState = createDemoSandboxState();
        this.wireStart = null;
        this.selectedMovePartId = null;
        this.stepSimulation(true);
      },
      onStatePatch: (patch) => {
        this.sandboxState = { ...this.sandboxState, ...patch };
        this.stepSimulation(true);
      },
      onSelectGuidedProject: (projectId) => {
        this.guidedProjectId = projectId;
        this.sandboxState = createStarterSandboxState();
        this.wireStart = null;
        this.selectedMovePartId = null;
        this.stepSimulation(true);
      },
      onAutoApplyGuidedStep: () => {
        const project = getGuidedProjectById(this.guidedProjectId);
        const activeStep = project.steps.find((s) => !s.isCompleted(this.sandboxState));
        if (!activeStep) return;
        this.sandboxState = applyGuidedStep(this.sandboxState, activeStep);
        this.wireStart = null;
        this.stepSimulation(true);
      },
      onRestartGuidedProject: () => {
        this.sandboxState = createStarterSandboxState();
        this.wireStart = null;
        this.stepSimulation(true);
      },
      onSwitchToFreeSandbox: () => {
        this.setAppMode('sandbox');
      },
      onToggleFavorite: (kind, id) => this.handleToggleFavorite(kind, id),
    });

    this.populateRegistryModal();
    this.populateBoardsShowcaseModal();
    this.updateModeUi();
  }

  private populateBoardsShowcaseModal(): void {
    const mount = this.root.querySelector('[data-mount="boards-showcase"]');
    if (!mount) return;

    const groups = [
      {
        title: 'Raspberry Pi — Einplatinencomputer (Linux SBC)',
        subtitle: 'Vollwertige Linux-Computer mit 40-Pin-GPIO-Leiste, Python (gpiozero), HDMI, Netzwerk & eigenem Betriebssystem.',
        items: ESP_BOARDS.filter((b) => b.family === 'raspberry-pi-sbc'),
      },
      {
        title: 'Raspberry Pi — Mikrocontroller (RP2350)',
        subtitle: 'Startet in Millisekunden ohne Betriebssystem, ideal für MicroPython, PIO-Echtzeit-Timing und 12-Bit-ADC.',
        items: ESP_BOARDS.filter((b) => b.family === 'raspberry-pi-mcu'),
      },
      {
        title: 'ESP32 — Standard DevKits',
        subtitle: 'Leistungsstarke WLAN/BLE/Zigbee-Mikrocontroller für Arduino C++, ESPHome & WLED.',
        items: ESP_BOARDS.filter((b) => b.family === 'esp32' && !b.isMini),
      },
      {
        title: 'ESP32 — Mini-Boards',
        subtitle: 'Ultra-kompakte Formfaktoren für Unterputz-Sensoren (z. B. LD2490), Wearables & winzige Gehäuse.',
        items: ESP_BOARDS.filter((b) => b.family === 'esp32' && b.isMini),
      },
    ];

    mount.innerHTML = groups
      .map(
        (g) => `
        <section class="flex flex-col gap-2.5">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider eng-text-accent">${g.title}</h4>
            <p class="text-[11.5px] eng-text-muted">${g.subtitle}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${g.items
              .map(
                (b) => `
              <div class="eng-card-soft rounded-xl border p-3.5 flex flex-col justify-between gap-2.5">
                <div class="flex flex-col gap-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-3 h-3 rounded-full shrink-0" style="background:${b.accentHex}"></span>
                      <span class="text-xs font-bold eng-text-main leading-snug">${b.name}</span>
                    </div>
                    <span class="text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                      b.family === 'raspberry-pi-sbc'
                        ? 'bg-pink-500/15 text-pink-500 border-pink-500/40'
                        : b.isMini
                          ? 'bg-orange-500/15 text-orange-500 border-orange-500/40'
                          : 'bg-cyan-500/15 eng-text-accent border-cyan-500/40'
                    }">${b.family === 'raspberry-pi-sbc' ? 'LINUX SBC' : b.isMini ? 'MINI' : 'MCU'}</span>
                  </div>
                  <p class="text-[11px] eng-text-body leading-relaxed">${b.overview}</p>
                  <div class="pt-1.5 border-t border-slate-500/20 flex flex-col gap-1 text-[10.5px]">
                    <div class="flex justify-between gap-2"><span class="eng-text-muted">CPU</span><span class="font-mono eng-text-main text-right">${b.architecture}</span></div>
                    <div class="flex justify-between gap-2"><span class="eng-text-muted">Funk</span><span class="font-mono eng-text-main text-right">${b.wireless}</span></div>
                    <div class="flex justify-between gap-2"><span class="eng-text-muted">Speicher</span><span class="font-mono eng-text-main text-right">${b.flash}</span></div>
                    <div class="flex justify-between gap-2"><span class="eng-text-muted">Spannung</span><span class="font-mono eng-text-main text-right">${b.voltageInfo}</span></div>
                  </div>
                  <div class="text-[10.5px] eng-text-muted pt-1">
                    <span class="font-semibold eng-text-main">Ideal für:</span> ${b.idealFor}
                  </div>
                </div>
                <button
                  type="button"
                  data-pick-board="${b.id}"
                  class="w-full py-1.5 px-2.5 rounded-lg border border-cyan-500/50 bg-cyan-500/12 hover:bg-cyan-500/25 eng-text-accent text-xs font-semibold font-mono transition cursor-pointer"
                >
                  In 3D laden →
                </button>
              </div>
            `,
              )
              .join('')}
          </div>
        </section>
      `,
      )
      .join('');

    mount.querySelectorAll<HTMLButtonElement>('[data-pick-board]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pickBoard as EspBoardId;
        this.selectBoard(id);
        this.boardsModalEl.classList.add('hidden');
        this.boardsModalEl.classList.remove('flex');
      });
    });
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
    this.root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as AppMode;
        this.setAppMode(mode);
      });
    });

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

    this.lessonFavBtnEl.addEventListener('click', () => {
      this.handleToggleFavorite('lesson', this.params.topology);
    });

    this.boardSelectEl.addEventListener('change', () => {
      this.selectBoard(this.boardSelectEl.value as EspBoardId);
    });

    this.themeBtnEl.addEventListener('click', () => {
      this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
    });

    this.roomDimBtnEl.addEventListener('click', () => {
      this.roomDimmed = !this.roomDimmed;
      this.sceneManager.setRoomDimmed(this.roomDimmed);
      this.updateRoomDimToggleUi(this.roomDimmed);
    });

    this.root.querySelector('[data-action="open-boards"]')?.addEventListener('click', () => {
      this.boardsModalEl.classList.remove('hidden');
      this.boardsModalEl.classList.add('flex');
    });
    this.root.querySelector('[data-action="close-boards"]')?.addEventListener('click', () => {
      this.boardsModalEl.classList.add('hidden');
      this.boardsModalEl.classList.remove('flex');
    });
    this.boardsModalEl.addEventListener('click', (e) => {
      if (e.target === this.boardsModalEl) {
        this.boardsModalEl.classList.add('hidden');
        this.boardsModalEl.classList.remove('flex');
      }
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
      if (this.appMode === 'lessons') {
        const lesson = getLessonById(this.params.topology);
        this.sceneManager.focusCamera(lesson.cameraPreset.position, lesson.cameraPreset.target);
      } else {
        this.sceneManager.focusCamera([1.4, 11.4, 10.6], [1.1, 0.35, 0.35]);
      }
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
      if (e.code === 'Escape' && (this.wireStart || this.selectedMovePartId)) {
        this.wireStart = null;
        this.selectedMovePartId = null;
        this.stepSimulation(true);
        return;
      }
      if (e.code !== 'Space' || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (this.appMode === 'sandbox' || this.appMode === 'guided') {
        e.preventDefault();
        this.setButtonPressed(true);
        return;
      }
      if (this.appMode !== 'lessons') return;

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
      if ((this.appMode === 'sandbox' || this.appMode === 'guided') && this.sandboxState.buttonPressed) {
        e.preventDefault();
        this.setButtonPressed(false);
        return;
      }
      if (this.params.topology === 'button-pull' && this.params.buttonPressed) {
        e.preventDefault();
        this.setButtonPressed(false);
      }
    });

    window.addEventListener('blur', () => {
      if (this.params.buttonPressed || this.sandboxState.buttonPressed) {
        this.setButtonPressed(false);
      }
    });
  }

  private loadFunnyIdeaInSandbox(idea: FunnyIdea): void {
    this.params = { ...this.params, boardId: idea.recommendedBoardId };
    this.boardSelectEl.value = idea.recommendedBoardId;
    this.sandboxState = idea.buildPrototype();
    this.wireStart = null;
    this.selectedMovePartId = null;
    this.sandboxTool = 'move';
    this.setAppMode('sandbox');
  }

  private handleToggleFavorite(kind: FavoriteKind, id: string): void {
    this.favorites.toggle(kind, id);
    this.refreshFavoritesUi();
  }

  private refreshFavoritesUi(): void {
    this.favCountBadgeEl.textContent = `(${this.favorites.getTotalCount()})`;
    this.updateLessonFavButtonUi();
    if (this.appMode === 'favorites') {
      this.favoritesView.render();
    } else if (this.appMode === 'funny') {
      this.funnyView.render();
    } else if (this.appMode === 'sandbox' || this.appMode === 'guided') {
      this.stepSimulation(true);
    }
  }

  private updateLessonFavButtonUi(): void {
    const isFav = this.favorites.has('lesson', this.params.topology);
    this.lessonFavBtnEl.textContent = isFav ? '★' : '☆';
    this.lessonFavBtnEl.title = isFav
      ? 'Lektion aus Favoriten entfernen'
      : 'Aktuelle Lektion als Favorit merken';
    this.lessonFavBtnEl.className = isFav
      ? 'px-2 py-1.5 rounded-lg border text-xs cursor-pointer shrink-0 bg-amber-500/20 border-amber-400 text-amber-400 font-bold'
      : 'eng-btn-neutral px-2 py-1.5 rounded-lg border text-xs cursor-pointer shrink-0 hover:text-amber-400';
  }

  private setAppMode(mode: AppMode): void {
    if (this.appMode === mode) return;
    const prevMode = this.appMode;
    this.appMode = mode;
    this.wireStart = null;
    this.selectedMovePartId = null;
    this.hoverTooltipEl.classList.add('hidden');

    if (mode === 'guided' && prevMode !== 'guided') {
      this.sandboxState = createStarterSandboxState();
    }

    this.updateModeUi();

    if (mode === 'funny') {
      this.funnyView.render();
      return;
    }
    if (mode === 'favorites') {
      this.favoritesView.render();
      return;
    }

    if (mode === 'lessons') {
      const lesson = getLessonById(this.params.topology);
      this.sceneManager.focusCamera(lesson.cameraPreset.position, lesson.cameraPreset.target);
    } else {
      this.sceneManager.setSandboxTool(this.sandboxTool);
      this.sceneManager.focusCamera([1.4, 11.4, 10.6], [1.1, 0.35, 0.35]);
    }

    this.oscilloscope.clear();
    this.stepSimulation(true);
  }

  private updateModeUi(): void {
    const isLessons = this.appMode === 'lessons';
    const isFullGallery = this.appMode === 'funny' || this.appMode === 'favorites';

    this.root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
      const m = btn.dataset.mode as AppMode;
      const active = m === this.appMode;
      if (active) {
        const activeStyle =
          m === 'guided'
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.22)]'
            : m === 'sandbox'
              ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.22)]'
              : m === 'funny'
                ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.25)]'
                : m === 'favorites'
                  ? 'bg-amber-500/22 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.28)]'
                  : 'bg-cyan-500/20 border-cyan-500 eng-text-accent shadow-[0_0_12px_rgba(6,182,212,0.22)]';
        btn.className = `px-3 py-1 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeStyle}`;
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.className =
          'eng-btn-neutral px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5';
        btn.setAttribute('aria-selected', 'false');
      }
    });

    this.workspaceMainEl.classList.toggle('hidden', isFullGallery);
    this.funnyMountEl.classList.toggle('hidden', this.appMode !== 'funny');
    this.favoritesMountEl.classList.toggle('hidden', this.appMode !== 'favorites');

    this.lessonPickerWrapEl.classList.toggle('hidden', !isLessons);
    this.noBreadboardBtnEl.classList.toggle('hidden', !isLessons);
    this.controlsMountEl.classList.toggle('hidden', !isLessons);
    this.sandboxMountEl.classList.toggle('hidden', isLessons || isFullGallery);

    if (this.appMode === 'lessons') {
      this.modeSubbarHintEl.textContent =
        '19 fertige Schaltungen mit Live-Physik, Oszilloskop & Code-Generator';
      this.modeLegendEl.innerHTML = `
        <span>Hover: Bauteil-Info</span>
        <span class="opacity-40">•</span>
        <span>Klick auf Bauteil: Entfernen/Einsetzen</span>
        <span class="opacity-40">•</span>
        <span data-hint="interactive" class="eng-text-accent">${getLessonById(this.params.topology).getPrimaryPin(this.params.boardId)} · Live</span>
      `;
    } else if (this.appMode === 'sandbox') {
      this.modeSubbarHintEl.textContent =
        `${SANDBOX_CATALOG.length} Sensoren & Aktoren · Platzieren, ✋ Verschieben, 〰 Verkabeln & 🗑 Löschen direkt in 3D!`;
      this.modeLegendEl.innerHTML = `
        <span>Setzen / ✋ Verschieben: Klick aufs Steckbrett</span>
        <span class="opacity-40">•</span>
        <span>〰 Kabel: 2 Punkte (ESC = Abbruch)</span>
        <span class="opacity-40">•</span>
        <span class="eng-text-accent">Freie Werkbank (${SANDBOX_CATALOG.length} Teile)</span>
      `;
    } else if (this.appMode === 'guided') {
      this.modeSubbarHintEl.textContent =
        `${GUIDED_PROJECTS.length} geführte Projekte — folge den pulsierenden 3D-Markierungen oder klicke „Diesen Schritt für mich stecken“!`;
      this.modeLegendEl.innerHTML = `
        <span>Pulsierende Ringe: Hier klicken!</span>
        <span class="opacity-40">•</span>
        <span>Automatische Schritt-Prüfung</span>
        <span class="opacity-40">•</span>
        <span class="text-emerald-500">🧭 Bau mit mir! (${GUIDED_PROJECTS.length} Projekte)</span>
      `;
    } else if (this.appMode === 'funny') {
      this.modeSubbarHintEl.textContent =
        `${FUNNY_IDEAS.length} witzige Maker-Ideen für ESP32 & Raspberry Pi — jede mit 1-Klick-3D-Prototyp!`;
    } else {
      this.modeSubbarHintEl.textContent =
        'Deine persönliche Sammlung aus Lieblings-Sensoren, Aktoren, Lektionen, Projekten & Funny-Ideen';
    }
  }

  private handleSandboxEndpointClick(endpoint: WireEndpoint): void {
    if (this.appMode === 'guided') {
      const project = getGuidedProjectById(this.guidedProjectId);
      const activeStep = project.steps.find((s) => !s.isCompleted(this.sandboxState));
      if (!activeStep) return;

      if (activeStep.action.kind === 'place-part') {
        if (endpoint.kind !== 'breadboard' || endpoint.col === undefined) return;
        const item = getCatalogItem(activeStep.action.partType);
        const nearTarget = Math.abs(endpoint.col - activeStep.action.col) <= 2;
        const col = nearTarget
          ? activeStep.action.col
          : Math.max(1, Math.min(30 - item.colSpan, endpoint.col));
        const row = nearTarget ? activeStep.action.row : item.preferredRow;
        const newPart: PlacedPart = {
          id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: activeStep.action.partType,
          col,
          row,
        };
        this.sandboxState = {
          ...this.sandboxState,
          parts: [...this.sandboxState.parts, newPart],
        };
        this.stepSimulation(true);
        return;
      }

      // Guided wire step: 2 clicks (start -> end)
      if (!this.wireStart) {
        this.wireStart = endpoint;
        this.stepSimulation(true);
        return;
      }
      if (this.areSameEndpoints(this.wireStart, endpoint)) {
        this.wireStart = null;
        this.stepSimulation(true);
        return;
      }
      const newWire: PlacedWire = {
        id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: this.wireStart,
        to: endpoint,
        colorHex: activeStep.action.colorHex,
      };
      this.wireStart = null;
      this.sandboxState = {
        ...this.sandboxState,
        wires: [...this.sandboxState.wires, newWire],
      };
      this.stepSimulation(true);
      return;
    }

    // Free Sandbox Mode: Move selected part to clicked column
    if (this.sandboxTool === 'move') {
      if (!this.selectedMovePartId || endpoint.kind !== 'breadboard' || endpoint.col === undefined) {
        return;
      }
      const moveId = this.selectedMovePartId;
      this.sandboxState = {
        ...this.sandboxState,
        parts: this.sandboxState.parts.map((p) => {
          if (p.id !== moveId) return p;
          const item = getCatalogItem(p.type);
          const col = Math.max(1, Math.min(30 - item.colSpan, endpoint.col!));
          return { ...p, col };
        }),
      };
      this.selectedMovePartId = null;
      this.stepSimulation(true);
      return;
    }

    // Free Sandbox Mode: Place new part
    if (this.sandboxTool === 'place') {
      if (endpoint.kind !== 'breadboard' || endpoint.col === undefined) return;
      const item = getCatalogItem(this.selectedPartType);
      const col = Math.max(1, Math.min(30 - item.colSpan, endpoint.col));
      const newPart: PlacedPart = {
        id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: this.selectedPartType,
        col,
        row: item.preferredRow,
      };
      this.sandboxState = {
        ...this.sandboxState,
        parts: [...this.sandboxState.parts, newPart],
      };
      this.stepSimulation(true);
      return;
    }

    if (this.sandboxTool === 'wire') {
      if (!this.wireStart) {
        this.wireStart = endpoint;
        this.stepSimulation(true);
        return;
      }
      if (this.areSameEndpoints(this.wireStart, endpoint)) {
        this.wireStart = null;
        this.stepSimulation(true);
        return;
      }
      const newWire: PlacedWire = {
        id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: this.wireStart,
        to: endpoint,
        colorHex: this.wireColorHex,
      };
      this.wireStart = null;
      this.sandboxState = {
        ...this.sandboxState,
        wires: [...this.sandboxState.wires, newWire],
      };
      this.stepSimulation(true);
    }
  }

  private handleSandboxDeleteItem(kind: 'part' | 'wire', id: string): void {
    if (kind === 'part') {
      if (this.selectedMovePartId === id) this.selectedMovePartId = null;
      this.sandboxState = {
        ...this.sandboxState,
        parts: this.sandboxState.parts.filter((p) => p.id !== id),
      };
    } else {
      this.sandboxState = {
        ...this.sandboxState,
        wires: this.sandboxState.wires.filter((w) => w.id !== id),
      };
    }
    this.stepSimulation(true);
  }

  private areSameEndpoints(a: WireEndpoint, b: WireEndpoint): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'board') return a.boardPinRole === b.boardPinRole;
    return a.col === b.col && a.row === b.row;
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

    // Auto-select a recommended Raspberry Pi board when entering a Raspberry Pi lesson from an ESP32
    let nextBoardId = this.params.boardId;
    if (lesson.recommendedBoardId && !this.params.boardId.startsWith('rpi-')) {
      nextBoardId = lesson.recommendedBoardId;
      this.boardSelectEl.value = nextBoardId;
    }

    this.params = {
      ...this.params,
      ...lesson.defaultParams,
      boardId: nextBoardId,
      topology: id,
      removedParts: [],
      buttonPressed: false,
    };

    this.lessonSelectEl.value = id;
    this.updateLessonFavButtonUi();
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
    if (this.appMode !== 'lessons') {
      if (this.sandboxState.buttonPressed === pressed) return;
      this.sandboxState = { ...this.sandboxState, buttonPressed: pressed };
      this.stepSimulation(true);
      return;
    }

    if (this.params.buttonPressed === pressed) return;
    this.params = { ...this.params, buttonPressed: pressed };
    const lesson = getLessonById(this.params.topology);
    this.controlsPanel.render(lesson, this.params);
    this.stepSimulation(true);
  }

  private updateRoomDimToggleUi(dimmed: boolean): void {
    const icon = this.roomDimBtnEl.querySelector('[data-dim-icon]');
    const label = this.roomDimBtnEl.querySelector('[data-dim-label]');
    if (dimmed) {
      this.roomDimBtnEl.className =
        'px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-semibold whitespace-nowrap bg-indigo-500/22 border-indigo-400 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.35)]';
      if (icon) icon.textContent = '🌙';
      if (label) label.textContent = 'Raum abgedunkelt ✓';
    } else {
      this.roomDimBtnEl.className =
        'eng-btn-neutral px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap';
      if (icon) icon.textContent = '💡';
      if (label) label.textContent = 'Raum dunkel';
    }
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

  private buildSandboxSimResult(
    summary: SandboxSimSummary,
    elapsedSeconds: number,
  ): SimulationResult {
    const board = getEspBoardById(this.params.boardId);
    const logicLevel =
      summary.nodeVoltage >= 2.48 ? 'HIGH' : summary.nodeVoltage <= 0.83 ? 'LOW' : 'UNDEFINED';
    const powerMw = 3.3 * summary.totalCurrentMa;

    return {
      timestamp: elapsedSeconds,
      topology: this.params.topology,
      boardId: this.params.boardId,
      probeLabel: summary.probeLabel,
      probePin: board.pins.outA.label,
      nodeVoltage: summary.nodeVoltage,
      currentMa: summary.totalCurrentMa,
      powerMw,
      logicLevel,
      extraTitle: this.appMode === 'guided' ? 'Bau-Assistent' : 'Werkbank-Status',
      extraDisplay: `${summary.activePartsCount} / ${this.sandboxState.parts.length} aktiv`,
      extraPercent:
        this.sandboxState.parts.length > 0
          ? Math.round((summary.activePartsCount / this.sandboxState.parts.length) * 100)
          : 0,
      ledForwardVoltage: 2.0,
      ledVoltageDrop: 0,
      resistorVoltageDrop: 0,
      ledBrightnessPercent: summary.activePartsCount > 0 ? 100 : 0,
      isOvercurrent: summary.overcurrentAlert,
      isCriticalOvercurrent: summary.overcurrentAlert,
      adcRaw: Math.round((summary.nodeVoltage / 3.3) * 4095),
      adcPercent: Math.round((summary.nodeVoltage / 3.3) * 100),
      effectiveR1Ohms: 220,
      effectiveR2Ohms: 10000,
      statusLedOn: summary.activePartsCount > 0,
      rgbHex: '#22d3ee',
      capacitorChargeRatio: 0,
      radarDetected: this.sandboxState.radarPresent,
      radarSignalStrength: this.sandboxState.radarPresent ? 85 : 10,
      relayClosed: false,
      kickbackSpikeActive: false,
      servoAngleDeg: this.sandboxState.servoAngleDeg,
      buzzerActive: false,
      wledEndVoltage: 5,
      wledVoltageDropRatio: 0,
      wledDataGlitch: false,
      wledEffectiveBrightnessPct: 0,
      wledBatteryRuntimeHours: 0,
      piTrafficLeds: { red: false, yellow: false, green: false },
      piFanSpeedPct: 0,
      piOledLines: [],
      explanation: {
        statusBadge: summary.statusBadge,
        statusTone: summary.statusTone,
        whatHappens: summary.whatHappens,
        whyItHappens: summary.whyItHappens,
      },
      warnings: summary.overcurrentAlert
        ? [
            {
              severity: 'danger',
              code: 'SANDBOX_OVERCURRENT',
              title: 'Vorwiderstand fehlt!',
              message: 'Eine LED leitet ohne Vorwiderstand zu viel Strom. Stecke 220 Ω in Reihe!',
            },
          ]
        : [],
    };
  }

  private stepSimulation(forceHudUpdate: boolean): void {
    if (this.appMode === 'funny' || this.appMode === 'favorites') return;

    const nowMs = performance.now();
    const elapsedSeconds = (nowMs - this.startTimeMs) / 1000;

    if (this.appMode === 'lessons') {
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
      return;
    }

    // Freie Werkbank (sandbox) oder Geführter Bau-Assistent (guided)
    const summary = evaluateSandboxCircuit(this.sandboxState, this.params.boardId, elapsedSeconds);
    const guidedProject = getGuidedProjectById(this.guidedProjectId);
    let highlights: HighlightMarker[] = [];

    if (this.appMode === 'guided') {
      const activeStep = guidedProject.steps.find((s) => !s.isCompleted(this.sandboxState));
      if (activeStep) {
        highlights = activeStep.highlights;
        this.sceneManager.setSandboxTool(
          activeStep.action.kind === 'place-part' ? 'place' : 'wire',
        );
      } else {
        this.sceneManager.setSandboxTool('wire');
      }
    } else {
      this.sceneManager.setSandboxTool(this.sandboxTool);
    }

    this.sceneManager.syncSandbox(
      this.params.boardId,
      this.sandboxState,
      summary,
      highlights,
      this.wireStart,
      elapsedSeconds,
      this.selectedMovePartId,
    );

    const sandboxSimResult = this.buildSandboxSimResult(summary, elapsedSeconds);
    this.telemetryHud.update(sandboxSimResult, nowMs, forceHudUpdate);
    this.oscilloscope.pushSample(sandboxSimResult, nowMs);

    if (forceHudUpdate || nowMs - this.lastExplainUpdateMs >= 160) {
      this.lastExplainUpdateMs = nowMs;
      this.sandboxPanel.render({
        mode: this.appMode,
        boardId: this.params.boardId,
        tool: this.sandboxTool,
        selectedPartType: this.selectedPartType,
        selectedMovePartId: this.selectedMovePartId,
        wireColorHex: this.wireColorHex,
        wireStart: this.wireStart,
        state: this.sandboxState,
        summary,
        guidedProject,
        favoritePartIds: this.favorites.getAll().parts,
        isGuidedFavorite: this.favorites.has('guided', guidedProject.id),
      });
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
