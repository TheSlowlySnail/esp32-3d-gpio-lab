import type { EspBoardId } from '../engine/types';
import { GUIDED_PROJECTS, type GuidedProject } from '../sandbox/GuidedProjects';
import {
  formatEndpointLabel,
  getCatalogItem,
  SANDBOX_CATALOG,
  WIRE_COLORS,
} from '../sandbox/SandboxEngine';
import type {
  AppMode,
  SandboxPartType,
  SandboxSimSummary,
  SandboxState,
  SandboxToolId,
  WireEndpoint,
} from '../sandbox/SandboxTypes';

export interface SandboxPanelCallbacks {
  onSelectTool: (tool: SandboxToolId) => void;
  onSelectPartType: (type: SandboxPartType) => void;
  onSelectWireColor: (hex: string) => void;
  onCancelWire: () => void;
  onDeletePart: (id: string) => void;
  onDeleteWire: (id: string) => void;
  onClearBoard: () => void;
  onLoadStarterKit: () => void;
  onStatePatch: (patch: Partial<SandboxState>) => void;
  onSelectGuidedProject: (projectId: string) => void;
  onAutoApplyGuidedStep: () => void;
  onRestartGuidedProject: () => void;
  onSwitchToFreeSandbox: () => void;
}

export interface SandboxPanelViewState {
  mode: AppMode;
  boardId: EspBoardId;
  tool: SandboxToolId;
  selectedPartType: SandboxPartType;
  wireColorHex: string;
  wireStart: WireEndpoint | null;
  state: SandboxState;
  summary: SandboxSimSummary;
  guidedProject: GuidedProject;
}

export class SandboxPanel {
  private readonly container: HTMLElement;
  private readonly callbacks: SandboxPanelCallbacks;
  private lastKey = '';

  constructor(container: HTMLElement, callbacks: SandboxPanelCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public render(view: SandboxPanelViewState): void {
    const stepCompletionKey = view.guidedProject.steps
      .map((s) => (s.isCompleted(view.state) ? '1' : '0'))
      .join('');
    const key = [
      view.mode,
      view.boardId,
      view.tool,
      view.selectedPartType,
      view.wireColorHex,
      view.wireStart ? formatEndpointLabel(view.wireStart, view.boardId) : '',
      view.state.parts.length,
      view.state.wires.length,
      view.state.gpioHigh ? '1' : '0',
      view.state.buttonPressed ? '1' : '0',
      view.state.radarPresent ? '1' : '0',
      view.summary.statusBadge,
      view.summary.activePartsCount,
      view.guidedProject.id,
      stepCompletionKey,
    ].join('|');

    if (key === this.lastKey) return;
    this.lastKey = key;

    if (view.mode === 'guided') {
      this.renderGuided(view);
    } else {
      this.renderSandbox(view);
    }
  }

  private renderStatusCard(summary: SandboxSimSummary): string {
    const toneBorder =
      summary.statusTone === 'danger'
        ? 'border-red-500/60 bg-red-500/8'
        : summary.statusTone === 'warning'
          ? 'border-amber-500/55 bg-amber-500/8'
          : summary.statusTone === 'ok'
            ? 'border-emerald-500/45 bg-emerald-500/8'
            : 'border-cyan-500/40 bg-cyan-500/6';
    const badgeTone =
      summary.statusTone === 'danger'
        ? 'bg-red-500/20 text-red-500 border-red-500/50'
        : summary.statusTone === 'warning'
          ? 'bg-amber-500/20 text-amber-500 border-amber-500/50'
          : summary.statusTone === 'ok'
            ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/45'
            : 'bg-cyan-500/15 eng-text-accent border-cyan-500/40';

    return `
      <div class="rounded-xl border p-3.5 flex flex-col gap-1.5 ${toneBorder}">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-bold uppercase tracking-wider eng-text-main">Live-Schaltungs-Check</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeTone}">${summary.statusBadge}</span>
        </div>
        <p class="text-xs font-medium eng-text-main leading-relaxed">${summary.whatHappens}</p>
        <p class="text-[11px] eng-text-body leading-relaxed">${summary.whyItHappens}</p>
      </div>
    `;
  }

  private renderSandbox(view: SandboxPanelViewState): void {
    const { tool, selectedPartType, wireColorHex, wireStart, state, summary, boardId } = view;

    const categories: Array<(typeof SANDBOX_CATALOG)[number]['category']> = [
      'LEDs & Ausgabe',
      'Passiv & Taster',
      'Sensoren',
      'Aktoren & Display',
    ];

    const catalogHtml = categories
      .map((cat) => {
        const items = SANDBOX_CATALOG.filter((i) => i.category === cat)
          .map((item) => {
            const active = tool === 'place' && selectedPartType === item.type;
            return `
              <button
                type="button"
                data-sb-part="${item.type}"
                title="${item.description}"
                class="text-left px-2.5 py-2 rounded-lg border text-xs transition cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-cyan-500/18 border-cyan-500 eng-text-main font-semibold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'eng-card-soft hover:border-cyan-500/50 eng-text-body'
                }"
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${item.accentHex}"></span>
                <span class="truncate">${item.shortName}</span>
              </button>
            `;
          })
          .join('');
        return `
          <div>
            <div class="text-[10px] font-mono uppercase tracking-wider eng-text-muted mb-1.5">${cat}</div>
            <div class="grid grid-cols-2 gap-1.5">${items}</div>
          </div>
        `;
      })
      .join('');

    const wireColorButtons = WIRE_COLORS.map(
      (c) => `
      <button
        type="button"
        data-sb-wire-color="${c.hex}"
        title="${c.label}"
        class="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] cursor-pointer transition ${
          wireColorHex === c.hex
            ? 'bg-cyan-500/15 border-cyan-500 eng-text-main font-semibold'
            : 'eng-btn-neutral'
        }"
      >
        <span class="w-2.5 h-2.5 rounded-full border border-white/25" style="background:${c.hex}"></span>
        <span>${c.label.split(' ')[0]}</span>
      </button>
    `,
    ).join('');

    const placedPartsHtml =
      state.parts.length === 0
        ? `<div class="text-[11px] eng-text-muted italic py-1">Noch keine Bauteile gesteckt.</div>`
        : state.parts
            .map((p) => {
              const def = getCatalogItem(p.type);
              const rt = summary.partStates.get(p.id);
              return `
                <div class="eng-card-soft rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs">
                  <div class="min-w-0">
                    <div class="font-semibold eng-text-main truncate">${def.shortName} <span class="font-mono text-[10px] eng-text-muted">@ Spalte ${p.col}</span></div>
                    <div class="text-[10.5px] ${rt?.overcurrent ? 'text-red-500 font-semibold' : rt?.active ? 'text-emerald-500' : 'eng-text-muted'} truncate">${rt?.statusText ?? ''}</div>
                  </div>
                  <button type="button" data-del-part="${p.id}" title="Bauteil entfernen" class="eng-btn-neutral px-1.5 py-0.5 rounded border text-[10px] cursor-pointer shrink-0">✕</button>
                </div>
              `;
            })
            .join('');

    const placedWiresHtml =
      state.wires.length === 0
        ? ''
        : `
          <div class="mt-2 pt-2 border-t border-slate-500/20 flex flex-col gap-1">
            <div class="text-[10px] font-mono uppercase eng-text-muted">Jumperkabel (${state.wires.length})</div>
            ${state.wires
              .map(
                (w) => `
              <div class="eng-card-soft rounded px-2 py-1 border flex items-center justify-between gap-1.5 text-[10.5px] font-mono">
                <span class="flex items-center gap-1.5 min-w-0 truncate eng-text-body">
                  <span class="w-2 h-2 rounded-full shrink-0" style="background:${w.colorHex}"></span>
                  <span class="truncate">${formatEndpointLabel(w.from, boardId)} → ${formatEndpointLabel(w.to, boardId)}</span>
                </span>
                <button type="button" data-del-wire="${w.id}" class="eng-btn-neutral px-1.5 rounded border text-[10px] cursor-pointer shrink-0">✕</button>
              </div>
            `,
              )
              .join('')}
          </div>
        `;

    this.container.innerHTML = `
      <div class="flex flex-col gap-3.5 pb-6">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-wider eng-text-accent">Freie 3D-Werkbank</div>
          <h2 class="text-base font-bold eng-text-main mt-0.5">Selbst bauen &amp; verkabeln</h2>
          <p class="text-xs eng-text-muted mt-0.5">Wähle ein Bauteil oder Sensor aus dem Set und klicke ins 3D-Steckbrett — oder ziehe farbige Jumperkabel zwischen Board-Pins und Löchern!</p>
        </div>

        ${this.renderStatusCard(summary)}

        <!-- Werkzeug-Umschalter -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted">Werkzeug</span>
            <div class="flex gap-1">
              <button type="button" data-sb-starter class="eng-btn-neutral px-2 py-0.5 rounded border text-[10.5px] font-mono cursor-pointer">Demo laden</button>
              <button type="button" data-sb-clear class="eng-btn-neutral px-2 py-0.5 rounded border text-[10.5px] font-mono cursor-pointer">Leeren</button>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <button type="button" data-sb-tool="place" class="py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
              tool === 'place' ? 'bg-cyan-500/18 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
            }">＋ Bauteil</button>
            <button type="button" data-sb-tool="wire" class="py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
              tool === 'wire' ? 'bg-emerald-500/18 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
            }">〰 Kabel</button>
            <button type="button" data-sb-tool="delete" class="py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
              tool === 'delete' ? 'bg-red-500/18 border-red-500 text-red-500' : 'eng-btn-neutral'
            }">🗑 Löschen</button>
          </div>

          ${
            tool === 'wire'
              ? `
            <div class="pt-1 border-t border-slate-500/20 flex flex-col gap-2">
              <div class="text-[11px] eng-text-body">
                ${
                  wireStart
                    ? `<span class="text-amber-500 font-semibold">Start: ${formatEndpointLabel(wireStart, boardId)}</span> → Klicke jetzt Ziel-Pin/Loch! <button type="button" data-sb-cancel-wire class="underline ml-1 cursor-pointer">Abbruch</button>`
                    : 'Klicke erst einen leuchtenden Board-Pin oder ein Steckloch, dann das Ziel!'
                }
              </div>
              <div class="flex flex-wrap gap-1.5">${wireColorButtons}</div>
            </div>
          `
              : tool === 'delete'
                ? `<div class="text-[11px] text-red-400">Klicke ein beliebiges Bauteil oder Kabel in der 3D-Szene an, um es zu entfernen.</div>`
                : `<div class="text-[11px] eng-text-muted">Gewählt: <strong class="eng-text-main">${getCatalogItem(selectedPartType).name}</strong> — klicke auf das Steckbrett zum Platzieren!</div>`
          }
        </div>

        <!-- Bauteil- & Sensor-Set (14 Teile) -->
        <div class="eng-card rounded-xl border p-3.5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted">Bauteil- &amp; Sensor-Set (14)</span>
            <span class="text-[10px] font-mono eng-text-accent">Klick → Brett</span>
          </div>
          ${catalogHtml}
        </div>

        <!-- Live-Test-Steuerung für eigene Schaltung -->
        <div class="eng-card rounded-xl border p-3.5 flex flex-col gap-2.5">
          <span class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted">Live testen</span>
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" data-sb-gpio class="py-1.5 px-2 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
              state.gpioHigh ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
            }">GPIO: ${state.gpioHigh ? 'HIGH (3,3V)' : 'LOW (0V)'}</button>
            <button type="button" data-sb-radar class="py-1.5 px-2 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
              state.radarPresent ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'
            }">Radar: ${state.radarPresent ? 'Präsenz' : 'Frei'}</button>
          </div>
          <button type="button" data-sb-hold-btn class="w-full py-2 rounded-lg border text-xs font-semibold cursor-pointer select-none ${
            state.buttonPressed ? 'bg-sky-500 text-white border-sky-400' : 'bg-sky-500/15 text-sky-500 border-sky-500/45'
          }">${state.buttonPressed ? '● TASTER GEDRÜCKT' : 'Taster halten (3D-Klick / Leertaste)'}</button>
        </div>

        <!-- Stückliste -->
        <div class="eng-card rounded-xl border p-3.5 flex flex-col gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted">Auf dem Steckbrett (${state.parts.length} Teile · ${state.wires.length} Kabel)</span>
          <div class="flex flex-col gap-1.5">${placedPartsHtml}</div>
          ${placedWiresHtml}
        </div>
      </div>
    `;

    this.bindSandboxEvents(view);
  }

  private renderGuided(view: SandboxPanelViewState): void {
    const { guidedProject, state, summary, wireStart, boardId } = view;

    const totalSteps = guidedProject.steps.length;
    const completedCount = guidedProject.steps.filter((s) => s.isCompleted(state)).length;
    const currentStepIdx = guidedProject.steps.findIndex((s) => !s.isCompleted(state));
    const allDone = currentStepIdx === -1;
    const currentStep = allDone ? null : guidedProject.steps[currentStepIdx];
    const progressPct = Math.round((completedCount / totalSteps) * 100);

    const projectTabsHtml = GUIDED_PROJECTS.map((proj) => {
      const active = proj.id === guidedProject.id;
      return `
        <button
          type="button"
          data-guided-proj="${proj.id}"
          class="w-full text-left px-3 py-2 rounded-lg border transition cursor-pointer ${
            active
              ? 'bg-cyan-500/15 border-cyan-500 eng-text-main'
              : 'eng-card-soft hover:border-cyan-500/40 eng-text-body'
          }"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold">${proj.title}</span>
            <span class="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-500/15 eng-text-muted">${proj.difficulty}</span>
          </div>
          <div class="text-[10.5px] eng-text-muted mt-0.5">${proj.durationLabel}</div>
        </button>
      `;
    }).join('');

    const stepsChecklistHtml = guidedProject.steps
      .map((step, idx) => {
        const done = step.isCompleted(state);
        const active = idx === currentStepIdx;
        return `
          <div class="rounded-lg border px-2.5 py-2 text-xs flex items-start gap-2 ${
            done
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : active
                ? 'bg-cyan-500/15 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                : 'eng-card-soft opacity-65'
          }">
            <span class="font-mono font-bold mt-0.5 ${
              done ? 'text-emerald-500' : active ? 'eng-text-accent' : 'eng-text-muted'
            }">${done ? '✓' : active ? '▸' : `${idx + 1}`}</span>
            <div class="min-w-0">
              <div class="font-semibold eng-text-main ${done ? 'line-through opacity-80' : ''}">${step.title}</div>
            </div>
          </div>
        `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="flex flex-col gap-3.5 pb-6">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-wider eng-text-accent">Geführter Bau-Assistent</div>
          <h2 class="text-base font-bold eng-text-main mt-0.5">Bau mit mir! — Schritt für Schritt</h2>
          <p class="text-xs eng-text-muted mt-0.5">Wähle ein Projekt aus und folge einfach den leuchtenden Ringen direkt auf dem 3D-Steckbrett!</p>
        </div>

        <!-- Projekt-Auswahl -->
        <div class="flex flex-col gap-1.5">${projectTabsHtml}</div>

        <!-- Fortschritt -->
        <div class="eng-card rounded-xl border p-3.5 flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold eng-text-main">Fortschritt</span>
            <span class="font-mono eng-text-accent font-bold">${completedCount} / ${totalSteps} Schritte</span>
          </div>
          <div class="h-2 rounded-full bg-slate-500/20 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300" style="width: ${progressPct}%"></div>
          </div>
        </div>

        <!-- Aktiver Schritt oder Abschluss-Karte -->
        ${
          allDone
            ? `
          <div class="rounded-xl border border-emerald-500/60 bg-emerald-500/12 p-4 flex flex-col gap-2.5">
            <div class="text-sm font-bold text-emerald-500">🎉 Projekt erfolgreich gebaut!</div>
            <p class="text-xs eng-text-main leading-relaxed">${guidedProject.completionMessage}</p>
            <div class="grid grid-cols-2 gap-1.5 pt-1">
              <button type="button" data-sb-gpio class="py-1.5 px-2 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
                state.gpioHigh ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'eng-btn-neutral'
              }">GPIO: ${state.gpioHigh ? 'HIGH' : 'LOW'}</button>
              <button type="button" data-sb-hold-btn class="py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer select-none ${
                state.buttonPressed ? 'bg-sky-500 text-white border-sky-400' : 'bg-sky-500/15 text-sky-500 border-sky-500/45'
              }">Taster testen</button>
            </div>
            <div class="flex gap-1.5 pt-1">
              <button type="button" data-guided-to-sandbox class="flex-1 py-2 px-3 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer">In Werkbank weiterbauen →</button>
              <button type="button" data-guided-restart class="eng-btn-neutral py-2 px-2.5 rounded-lg border text-xs cursor-pointer">↺</button>
            </div>
          </div>
        `
            : currentStep
              ? `
          <div class="rounded-xl border-2 border-cyan-500/70 bg-cyan-500/8 p-3.5 flex flex-col gap-2.5 shadow-lg">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10.5px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/20 eng-text-accent">Schritt ${currentStepIdx + 1} von ${totalSteps}</span>
              <span class="text-[10.5px] font-mono eng-text-muted">${currentStep.action.kind === 'place-part' ? 'Bauteil stecken' : 'Jumperkabel ziehen'}</span>
            </div>
            <div class="text-sm font-bold eng-text-main">${currentStep.title}</div>
            <p class="text-xs eng-text-main leading-relaxed">${currentStep.instruction}</p>
            ${
              wireStart
                ? `<div class="text-[11px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/40 rounded px-2 py-1">Startpunkt gesetzt: ${formatEndpointLabel(wireStart, boardId)} → klicke jetzt auf den grünen Ziel-Ring!</div>`
                : ''
            }
            <div class="pt-2 border-t border-slate-500/20">
              <div class="text-[10px] font-mono uppercase eng-text-muted">Warum machen wir das?</div>
              <p class="text-[11.5px] eng-text-body leading-relaxed mt-0.5">${currentStep.whyText}</p>
            </div>
            <div class="flex gap-1.5 pt-1">
              <button type="button" data-guided-auto class="flex-1 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/60 eng-text-accent font-semibold text-xs cursor-pointer transition">
                ✨ Diesen Schritt für mich stecken
              </button>
              <button type="button" data-guided-restart title="Projekt von vorn starten" class="eng-btn-neutral py-2 px-2.5 rounded-lg border text-xs cursor-pointer">↺</button>
            </div>
          </div>
        `
              : ''
        }

        ${this.renderStatusCard(summary)}

        <!-- Schritt-Checkliste -->
        <div class="eng-card rounded-xl border p-3.5 flex flex-col gap-1.5">
          <div class="text-[11px] font-semibold uppercase tracking-wider eng-text-muted mb-1">Bauplan-Schritte</div>
          ${stepsChecklistHtml}
        </div>
      </div>
    `;

    this.bindGuidedEvents(view);
  }

  private bindSandboxEvents(view: SandboxPanelViewState): void {
    const q = <T extends Element>(sel: string) => this.container.querySelector<T>(sel);
    const qAll = <T extends Element>(sel: string) => this.container.querySelectorAll<T>(sel);

    qAll<HTMLButtonElement>('[data-sb-tool]').forEach((b) =>
      b.addEventListener('click', () =>
        this.callbacks.onSelectTool(b.dataset.sbTool as SandboxToolId),
      ),
    );
    qAll<HTMLButtonElement>('[data-sb-part]').forEach((b) =>
      b.addEventListener('click', () => {
        this.callbacks.onSelectPartType(b.dataset.sbPart as SandboxPartType);
        this.callbacks.onSelectTool('place');
      }),
    );
    qAll<HTMLButtonElement>('[data-sb-wire-color]').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.sbWireColor) this.callbacks.onSelectWireColor(b.dataset.sbWireColor);
      }),
    );
    q('[data-sb-cancel-wire]')?.addEventListener('click', () => this.callbacks.onCancelWire());
    q('[data-sb-clear]')?.addEventListener('click', () => this.callbacks.onClearBoard());
    q('[data-sb-starter]')?.addEventListener('click', () => this.callbacks.onLoadStarterKit());

    qAll<HTMLButtonElement>('[data-del-part]').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.delPart) this.callbacks.onDeletePart(b.dataset.delPart);
      }),
    );
    qAll<HTMLButtonElement>('[data-del-wire]').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.delWire) this.callbacks.onDeleteWire(b.dataset.delWire);
      }),
    );

    this.bindLiveTestControls(view);
  }

  private bindGuidedEvents(view: SandboxPanelViewState): void {
    const q = <T extends Element>(sel: string) => this.container.querySelector<T>(sel);
    const qAll = <T extends Element>(sel: string) => this.container.querySelectorAll<T>(sel);

    qAll<HTMLButtonElement>('[data-guided-proj]').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.guidedProj) this.callbacks.onSelectGuidedProject(b.dataset.guidedProj);
      }),
    );
    q('[data-guided-auto]')?.addEventListener('click', () =>
      this.callbacks.onAutoApplyGuidedStep(),
    );
    q('[data-guided-restart]')?.addEventListener('click', () =>
      this.callbacks.onRestartGuidedProject(),
    );
    q('[data-guided-to-sandbox]')?.addEventListener('click', () =>
      this.callbacks.onSwitchToFreeSandbox(),
    );

    this.bindLiveTestControls(view);
  }

  private bindLiveTestControls(view: SandboxPanelViewState): void {
    const q = <T extends Element>(sel: string) => this.container.querySelector<T>(sel);
    q('[data-sb-gpio]')?.addEventListener('click', () =>
      this.callbacks.onStatePatch({ gpioHigh: !view.state.gpioHigh }),
    );
    q('[data-sb-radar]')?.addEventListener('click', () =>
      this.callbacks.onStatePatch({ radarPresent: !view.state.radarPresent }),
    );
    const holdBtn = q<HTMLButtonElement>('[data-sb-hold-btn]');
    if (holdBtn) {
      const down = (e: Event) => {
        e.preventDefault();
        this.callbacks.onStatePatch({ buttonPressed: true });
      };
      const up = () => this.callbacks.onStatePatch({ buttonPressed: false });
      holdBtn.addEventListener('pointerdown', down);
      holdBtn.addEventListener('pointerup', up);
      holdBtn.addEventListener('pointerleave', up);
      holdBtn.addEventListener('pointercancel', up);
    }
  }
}
