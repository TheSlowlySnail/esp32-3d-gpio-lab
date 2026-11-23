import type { EspBoardId } from '../engine/types';
import type { FavoriteKind } from '../sandbox/FavoritesStore';
import { GUIDED_PROJECTS, type GuidedProject } from '../sandbox/GuidedProjects';
import {
  formatEndpointLabel,
  getCatalogItem,
  SANDBOX_CATALOG,
  WIRE_COLORS,
} from '../sandbox/SandboxEngine';
import type {
  AppMode,
  SandboxCategory,
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
  onSelectMovePart: (partId: string | null) => void;
  onNudgePart: (partId: string, deltaCol: number) => void;
  onDeletePart: (id: string) => void;
  onDeleteWire: (id: string) => void;
  onClearBoard: () => void;
  onLoadStarterKit: () => void;
  onStatePatch: (patch: Partial<SandboxState>) => void;
  onSelectGuidedProject: (projectId: string) => void;
  onAutoApplyGuidedStep: () => void;
  onRestartGuidedProject: () => void;
  onSwitchToFreeSandbox: () => void;
  onToggleFavorite: (kind: FavoriteKind, id: string) => void;
}

export interface SandboxPanelViewState {
  mode: AppMode;
  boardId: EspBoardId;
  tool: SandboxToolId;
  selectedPartType: SandboxPartType;
  selectedMovePartId: string | null;
  wireColorHex: string;
  wireStart: WireEndpoint | null;
  state: SandboxState;
  summary: SandboxSimSummary;
  guidedProject: GuidedProject;
  favoritePartIds: string[];
  isGuidedFavorite: boolean;
}

export class SandboxPanel {
  private readonly container: HTMLElement;
  private readonly callbacks: SandboxPanelCallbacks;
  private lastKey = '';
  private categoryFilter: 'all' | 'favorites' | SandboxCategory = 'all';
  private searchQuery = '';

  constructor(container: HTMLElement, callbacks: SandboxPanelCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public render(view: SandboxPanelViewState): void {
    const stepCompletionKey = view.guidedProject.steps
      .map((s) => (s.isCompleted(view.state) ? '1' : '0'))
      .join('');
    const partsPosKey = view.state.parts.map((p) => `${p.id}@${p.col}`).join(',');
    const key = [
      view.mode,
      view.boardId,
      view.tool,
      view.selectedPartType,
      view.selectedMovePartId ?? '',
      view.wireColorHex,
      view.wireStart ? formatEndpointLabel(view.wireStart, view.boardId) : '',
      partsPosKey,
      view.state.wires.length,
      view.state.gpioHigh ? '1' : '0',
      view.state.buttonPressed ? '1' : '0',
      view.state.radarPresent ? '1' : '0',
      view.state.sensorTriggered ? '1' : '0',
      view.state.switchClosed ? '1' : '0',
      Math.round(view.state.servoAngleDeg),
      view.summary.statusBadge,
      view.summary.activePartsCount,
      view.guidedProject.id,
      stepCompletionKey,
      view.favoritePartIds.join(','),
      view.isGuidedFavorite ? '1' : '0',
      this.categoryFilter,
      this.searchQuery,
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
            ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
            : 'bg-cyan-500/20 eng-text-accent border-cyan-500/40';

    return `
      <div class="rounded-xl border p-3 flex flex-col gap-1.5 ${toneBorder}">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-mono uppercase tracking-wider font-bold eng-text-muted">Live-Schaltungs-Check</span>
          <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeTone}">${summary.statusBadge}</span>
        </div>
        <p class="text-xs font-semibold eng-text-main leading-relaxed">${summary.whatHappens}</p>
        <p class="text-[11px] eng-text-body leading-relaxed">${summary.whyItHappens}</p>
      </div>
    `;
  }

  private renderSandbox(view: SandboxPanelViewState): void {
    const selectedDef = getCatalogItem(view.selectedPartType);
    const selectedMovePart = view.selectedMovePartId
      ? view.state.parts.find((p) => p.id === view.selectedMovePartId) ?? null
      : null;

    const favSet = new Set(view.favoritePartIds);
    const categories: Array<{ id: 'all' | 'favorites' | SandboxCategory; label: string }> = [
      { id: 'all', label: `Alle (${SANDBOX_CATALOG.length})` },
      { id: 'favorites', label: `★ Fav (${favSet.size})` },
      {
        id: 'Sensoren',
        label: `Sensoren (${SANDBOX_CATALOG.filter((i) => i.category === 'Sensoren').length})`,
      },
      {
        id: 'Aktoren & Displays',
        label: `Aktoren (${SANDBOX_CATALOG.filter((i) => i.category === 'Aktoren & Displays').length})`,
      },
      {
        id: 'LEDs & Ausgabe',
        label: `LEDs (${SANDBOX_CATALOG.filter((i) => i.category === 'LEDs & Ausgabe').length})`,
      },
      {
        id: 'Passiv & Schalter',
        label: `Passiv (${SANDBOX_CATALOG.filter((i) => i.category === 'Passiv & Schalter').length})`,
      },
    ];

    const q = this.searchQuery.trim().toLowerCase();
    const filteredCatalog = SANDBOX_CATALOG.filter((item) => {
      if (this.categoryFilter === 'favorites' && !favSet.has(item.type)) return false;
      if (
        this.categoryFilter !== 'all' &&
        this.categoryFilter !== 'favorites' &&
        item.category !== this.categoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.shortName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });

    const groupedCategories: SandboxCategory[] = [
      'LEDs & Ausgabe',
      'Passiv & Schalter',
      'Sensoren',
      'Aktoren & Displays',
    ];

    const catalogHtml = groupedCategories
      .map((cat) => {
        const items = filteredCatalog.filter((c) => c.category === cat);
        if (items.length === 0) return '';
        return `
          <div class="flex flex-col gap-1.5">
            <div class="text-[10px] font-mono uppercase tracking-wider eng-text-muted">${cat} (${items.length})</div>
            <div class="grid grid-cols-2 gap-1.5">
              ${items
                .map((item) => {
                  const active = view.tool === 'place' && view.selectedPartType === item.type;
                  const isFav = favSet.has(item.type);
                  const cls = active
                    ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent font-semibold'
                    : 'eng-btn-neutral';
                  return `
                    <div class="rounded-lg border flex items-center transition overflow-hidden ${cls}">
                      <button
                        type="button"
                        data-sb-part="${item.type}"
                        title="${item.description}"
                        class="flex-1 min-w-0 px-2 py-1.5 text-left text-[11px] cursor-pointer flex items-center gap-1.5"
                      >
                        <span class="w-2 h-2 rounded-full shrink-0" style="background:${item.accentHex}"></span>
                        <span class="truncate">${item.shortName}</span>
                      </button>
                      <button
                        type="button"
                        data-sb-fav-part="${item.type}"
                        title="${isFav ? 'Aus Favoriten entfernen' : 'Als Favorit merken'}"
                        class="px-1.5 py-1.5 text-[11px] cursor-pointer shrink-0 ${isFav ? 'text-amber-400' : 'opacity-40 hover:opacity-100 hover:text-amber-400'}"
                      >${isFav ? '★' : '☆'}</button>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      })
      .join('');

    const toolBtn = (id: SandboxToolId, icon: string, label: string) => {
      const active = view.tool === id;
      const cls =
        active && id === 'delete'
          ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
          : active && id === 'move'
            ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
            : active
              ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent font-bold'
              : 'eng-btn-neutral font-medium';
      return `<button type="button" data-sb-tool="${id}" class="py-1.5 px-1.5 rounded-lg border text-[11px] transition cursor-pointer flex items-center justify-center gap-1 ${cls}"><span>${icon}</span><span>${label}</span></button>`;
    };

    const partsListHtml =
      view.state.parts.length === 0
        ? `<p class="text-[11px] eng-text-muted italic">Noch keine Bauteile platziert. Wähle oben ein Bauteil und klicke aufs 3D-Steckbrett!</p>`
        : view.state.parts
            .map((p) => {
              const def = getCatalogItem(p.type);
              const st = view.summary.partStates.get(p.id);
              const isSelectedMove = view.selectedMovePartId === p.id;
              const statusColor = st?.overcurrent
                ? 'text-red-400'
                : st?.active
                  ? 'text-emerald-400'
                  : 'eng-text-muted';
              return `
                <div class="eng-card-soft rounded-lg border px-2 py-1.5 flex items-center justify-between gap-1.5 ${isSelectedMove ? 'border-amber-400 bg-amber-500/12' : ''}">
                  <div class="min-w-0 flex-1">
                    <div class="text-[11px] font-semibold eng-text-main truncate">${def.shortName} <span class="font-mono text-[10px] eng-text-muted">@ Sp.${p.col}</span></div>
                    <div class="text-[10px] ${statusColor} truncate">${st?.statusText ?? ''}</div>
                  </div>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <button type="button" data-nudge-left="${p.id}" title="1 Spalte nach links verschieben" class="eng-btn-neutral px-1.5 py-0.5 rounded border text-[10px] cursor-pointer">◀</button>
                    <button type="button" data-nudge-right="${p.id}" title="1 Spalte nach rechts verschieben" class="eng-btn-neutral px-1.5 py-0.5 rounded border text-[10px] cursor-pointer">▶</button>
                    <button type="button" data-pick-move="${p.id}" title="In 3D auf neue Spalte klicken" class="px-1.5 py-0.5 rounded border text-[10px] cursor-pointer ${isSelectedMove ? 'bg-amber-500/25 border-amber-400 text-amber-300' : 'eng-btn-neutral'}">✋</button>
                    <button type="button" data-del-part="${p.id}" title="Bauteil löschen" class="eng-btn-neutral px-1.5 py-0.5 rounded border text-[10px] hover:border-red-500 hover:text-red-400 cursor-pointer">×</button>
                  </div>
                </div>
              `;
            })
            .join('');

    const wiresListHtml =
      view.state.wires.length === 0
        ? ''
        : `
          <div class="flex flex-col gap-1 mt-1">
            <div class="text-[10px] font-mono uppercase tracking-wider eng-text-muted">Jumperkabel (${view.state.wires.length})</div>
            <div class="flex flex-col gap-1 max-h-32 overflow-y-auto pr-0.5">
              ${view.state.wires
                .map(
                  (w) => `
                  <div class="eng-card-soft rounded-md border px-2 py-1 flex items-center justify-between gap-2 text-[10.5px]">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="w-2 h-2 rounded-full shrink-0" style="background:${w.colorHex}"></span>
                      <span class="font-mono eng-text-body truncate">${formatEndpointLabel(w.from, view.boardId)} → ${formatEndpointLabel(w.to, view.boardId)}</span>
                    </div>
                    <button type="button" data-del-wire="${w.id}" title="Kabel entfernen" class="eng-btn-neutral px-1.5 py-0.5 rounded border text-[10px] hover:border-red-500 hover:text-red-400 cursor-pointer shrink-0">×</button>
                  </div>
                `,
                )
                .join('')}
            </div>
          </div>
        `;

    this.container.innerHTML = `
      <div class="flex flex-col gap-3.5 pb-6">
        <div>
          <span class="text-[10px] font-mono uppercase tracking-wider eng-text-accent font-bold">Freie 3D-Werkbank · ${SANDBOX_CATALOG.length} Teile</span>
          <h2 class="text-sm font-bold eng-text-main mt-0.5">Selbst bauen, verschieben &amp; verkabeln</h2>
        </div>

        ${this.renderStatusCard(view.summary)}

        <!-- 4 Werkzeuge: Bauteil | Bewegen | Kabel | Löschen -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-mono uppercase tracking-wider eng-text-muted font-bold">Werkzeug</span>
            <div class="flex items-center gap-1">
              <button type="button" data-sb-starter class="eng-btn-neutral px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer" title="Fertige Demo-Schaltung laden">Demo laden</button>
              <button type="button" data-sb-clear class="eng-btn-neutral px-2 py-0.5 rounded border text-[10px] font-mono hover:border-red-500 hover:text-red-400 cursor-pointer" title="Alle Teile &amp; Kabel löschen">Leeren</button>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1">
            ${toolBtn('place', '＋', 'Teil')}
            ${toolBtn('move', '✋', 'Bewegen')}
            ${toolBtn('wire', '〰', 'Kabel')}
            ${toolBtn('delete', '🗑', 'Löschen')}
          </div>

          ${
            view.tool === 'wire'
              ? `
                <div class="flex flex-col gap-1.5 pt-1 border-t border-slate-500/20">
                  <div class="flex items-center justify-between text-[10.5px]">
                    <span class="eng-text-muted font-mono">Kabelfarbe:</span>
                    ${
                      view.wireStart
                        ? `<button type="button" data-sb-cancel-wire class="text-amber-400 font-mono text-[10px] underline cursor-pointer">Start abbrechen</button>`
                        : `<span class="eng-text-accent font-mono">2 Punkte anklicken</span>`
                    }
                  </div>
                  <div class="grid grid-cols-6 gap-1.5">
                    ${WIRE_COLORS.map(
                      (c) => `
                      <button
                        type="button"
                        data-sb-color="${c.hex}"
                        title="${c.label}"
                        class="h-6 rounded-md border-2 transition cursor-pointer ${view.wireColorHex === c.hex ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'}"
                        style="background:${c.hex}"
                      ></button>
                    `,
                    ).join('')}
                  </div>
                  ${
                    view.wireStart
                      ? `<div class="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/35 rounded-md px-2 py-1">Startpunkt: <strong>${formatEndpointLabel(view.wireStart, view.boardId)}</strong> → Ziel anklicken!</div>`
                      : ''
                  }
                </div>
              `
              : view.tool === 'move'
                ? selectedMovePart
                  ? `<div class="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/40 rounded-md px-2 py-1.5 flex items-center justify-between gap-2">
                      <span>Gewählt: <strong>${getCatalogItem(selectedMovePart.type).shortName}</strong> → klicke auf neue Spalte!</span>
                      <button type="button" data-cancel-move class="underline text-[10px] font-mono cursor-pointer shrink-0">Abbr.</button>
                    </div>`
                  : `<p class="text-[11px] text-amber-400">Klicke ein Bauteil in 3D an (oder ✋ in der Liste unten) und danach die neue Ziel-Spalte am Steckbrett!</p>`
                : view.tool === 'delete'
                  ? `<p class="text-[11px] text-red-400">Klicke in 3D direkt auf ein Bauteil oder Jumperkabel, um es sofort zu entfernen.</p>`
                  : `<p class="text-[11px] eng-text-muted">Gewählt: <strong class="eng-text-main">${selectedDef.name}</strong> — klicke auf das Steckbrett zum Platzieren!</p>`
          }
        </div>

        <!-- 36-Teile Bauteil- & Sensor-Katalog mit Filter & Suche -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-mono uppercase tracking-wider eng-text-muted font-bold">Bauteil- &amp; Sensor-Set (${SANDBOX_CATALOG.length})</span>
            <span class="text-[10px] font-mono eng-text-accent">Klick → Brett</span>
          </div>

          <input
            type="search"
            data-sb-search
            value="${this.searchQuery.replace(/"/g, '&quot;')}"
            placeholder="Suchen (z. B. PIR, Gas, Laser, Servo, RFID…)"
            class="eng-input w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-cyan-500"
          />

          <div class="flex flex-wrap gap-1">
            ${categories
              .map((cat) => {
                const active = this.categoryFilter === cat.id;
                const cls = active
                  ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent font-bold'
                  : 'eng-btn-neutral';
                return `<button type="button" data-sb-cat="${cat.id}" class="px-2 py-0.5 rounded-md border text-[10px] font-mono cursor-pointer transition ${cls}">${cat.label}</button>`;
              })
              .join('')}
          </div>

          <div class="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
            ${
              catalogHtml ||
              (this.categoryFilter === 'favorites'
                ? `<p class="text-[11px] eng-text-muted italic">Noch keine Bauteile als Favorit markiert — klicke auf ☆ neben einem Sensor oder Aktor!</p>`
                : `<p class="text-[11px] eng-text-muted italic">Kein Bauteil für „${this.searchQuery}“ gefunden.</p>`)
            }
          </div>
        </div>

        <!-- Live Test-Signale für alle Sensoren & Aktoren -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-2">
          <span class="text-[10px] font-mono uppercase tracking-wider eng-text-muted font-bold">Live testen &amp; simulieren</span>
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" data-sb-toggle-gpio class="py-1.5 px-2 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer ${view.state.gpioHigh ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'eng-btn-neutral'}">
              GPIO: ${view.state.gpioHigh ? 'HIGH (3,3V)' : 'LOW (0V)'}
            </button>
            <button type="button" data-sb-toggle-sensor class="py-1.5 px-2 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer ${view.state.sensorTriggered ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-400' : 'eng-btn-neutral'}">
              Sensoren: ${view.state.sensorTriggered ? 'AUSGELÖST' : 'Ruhe'}
            </button>
            <button type="button" data-sb-toggle-switch class="py-1.5 px-2 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer ${view.state.switchClosed ? 'bg-cyan-500/20 border-cyan-500 eng-text-accent' : 'eng-btn-neutral'}">
              Schalter: ${view.state.switchClosed ? 'EIN' : 'AUS'}
            </button>
            <button type="button" data-sb-hold-btn class="py-1.5 px-2 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer ${view.state.buttonPressed ? 'bg-amber-500/25 border-amber-500 text-amber-400' : 'eng-btn-neutral'}">
              ${view.state.buttonPressed ? 'Taster GEDRÜCKT' : 'Taster halten'}
            </button>
          </div>
          <label class="flex flex-col gap-1 text-[10.5px] font-mono eng-text-muted pt-1">
            <div class="flex justify-between">
              <span>Servo-Winkel (SG90)</span>
              <span class="eng-text-accent">${Math.round(view.state.servoAngleDeg)}°</span>
            </div>
            <input type="range" data-sb-servo min="0" max="180" step="5" value="${Math.round(view.state.servoAngleDeg)}" class="w-full accent-cyan-500 cursor-pointer" />
          </label>
        </div>

        <!-- Platzierte Teile (mit Verschieben & Löschen) + Kabel -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono uppercase tracking-wider eng-text-muted font-bold">
              Auf dem Steckbrett (${view.state.parts.length} Teile · ${view.state.wires.length} Kabel)
            </span>
          </div>
          <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">${partsListHtml}</div>
          ${wiresListHtml}
        </div>
      </div>
    `;

    this.bindSandboxEvents(view);
  }

  private renderGuided(view: SandboxPanelViewState): void {
    const project = view.guidedProject;
    const completedFlags = project.steps.map((s) => s.isCompleted(view.state));
    const completedCount = completedFlags.filter(Boolean).length;
    const activeIndex = completedFlags.findIndex((done) => !done);
    const allDone = activeIndex === -1;
    const activeStep = allDone ? null : project.steps[activeIndex];
    const progressPct = Math.round((completedCount / project.steps.length) * 100);

    const projectOptions = GUIDED_PROJECTS.map(
      (p, idx) =>
        `<option value="${p.id}" ${p.id === project.id ? 'selected' : ''}>${String(idx + 1).padStart(2, '0')} · ${p.title} (${p.difficulty})</option>`,
    ).join('');

    const stepsHtml = project.steps
      .map((step, i) => {
        const done = completedFlags[i];
        const isCurrent = i === activeIndex;
        const cls = done
          ? 'border-emerald-500/35 bg-emerald-500/8 opacity-85'
          : isCurrent
            ? 'border-cyan-500 bg-cyan-500/12 shadow-[0_0_14px_rgba(6,182,212,0.16)]'
            : 'eng-card-soft opacity-65';
        return `
          <div class="rounded-lg border px-2.5 py-2 flex items-start gap-2 ${cls}">
            <span class="w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
              done
                ? 'bg-emerald-500 text-white'
                : isCurrent
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-600/40 eng-text-muted'
            }">${done ? '✓' : i + 1}</span>
            <div class="min-w-0">
              <div class="text-[11.5px] font-semibold eng-text-main leading-snug">${step.title}</div>
              ${isCurrent ? `<div class="text-[10.5px] eng-text-accent mt-0.5">Aktiv — siehe pulsierende 3D-Markierung!</div>` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="flex flex-col gap-3.5 pb-6">
        <div>
          <span class="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Geführter Bau-Assistent · ${GUIDED_PROJECTS.length} Projekte</span>
          <h2 class="text-sm font-bold eng-text-main mt-0.5">Bau mit mir! — Schritt für Schritt</h2>
          <p class="text-[11px] eng-text-muted mt-0.5 leading-relaxed">
            Folge den pulsierenden 3D-Ringen auf Board &amp; Steckbrett oder lass dir einzelne Schritte direkt stecken.
          </p>
        </div>

        <!-- Projekt-Auswahl (alle 10 geführten Bauprojekte) -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-mono uppercase tracking-wider eng-text-muted font-bold">Projekt wählen (${GUIDED_PROJECTS.length})</span>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-mono eng-text-accent">${project.durationLabel}</span>
              <button
                type="button"
                data-guided-fav="${project.id}"
                title="${view.isGuidedFavorite ? 'Aus Favoriten entfernen' : 'Projekt als Favorit merken'}"
                class="px-1.5 py-0.5 rounded border text-[11px] cursor-pointer transition ${
                  view.isGuidedFavorite
                    ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                    : 'eng-btn-neutral eng-text-muted hover:text-amber-400'
                }"
              >${view.isGuidedFavorite ? '★' : '☆'}</button>
            </div>
          </div>
          <select data-guided-select class="eng-select eng-input w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer focus:outline-none focus:border-cyan-500">
            ${projectOptions}
          </select>
          <p class="text-[11px] eng-text-body leading-relaxed">${project.summary}</p>
        </div>

        <!-- Fortschrittsbalken -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between text-[11px] font-mono">
            <span class="eng-text-muted">Fortschritt</span>
            <span class="font-bold ${allDone ? 'text-emerald-400' : 'eng-text-accent'}">${completedCount} / ${project.steps.length} Schritte</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-700/40 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300 ${allDone ? 'bg-emerald-500' : 'bg-cyan-500'}" style="width:${progressPct}%"></div>
          </div>
        </div>

        <!-- Aktiver Schritt ODER Erfolgs-Karte -->
        ${
          allDone
            ? `
              <div class="rounded-xl border border-emerald-500/60 bg-emerald-500/12 p-3.5 flex flex-col gap-2.5">
                <div class="text-xs font-bold text-emerald-400 uppercase font-mono">🎉 Projekt erfolgreich gebaut!</div>
                <p class="text-xs eng-text-main leading-relaxed">${project.completionMessage}</p>
                <div class="grid grid-cols-2 gap-1.5 pt-1">
                  <button type="button" data-guided-to-sandbox class="py-1.5 px-2.5 rounded-lg border border-cyan-500/60 bg-cyan-500/18 eng-text-accent text-xs font-semibold cursor-pointer">
                    In Werkbank weiterbauen →
                  </button>
                  <button type="button" data-guided-restart class="eng-btn-neutral py-1.5 px-2.5 rounded-lg border text-xs font-medium cursor-pointer">
                    Nochmal bauen
                  </button>
                </div>
              </div>
            `
            : activeStep
              ? `
                <div class="rounded-xl border border-cyan-500/60 bg-cyan-500/10 p-3.5 flex flex-col gap-2.5">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-mono uppercase tracking-wider eng-text-accent font-bold">
                      Schritt ${activeIndex + 1} von ${project.steps.length}
                    </span>
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 eng-text-accent">
                      ${activeStep.action.kind === 'place-part' ? 'Bauteil stecken' : 'Jumperkabel ziehen'}
                    </span>
                  </div>
                  <div class="text-xs font-bold eng-text-main leading-snug">${activeStep.title}</div>
                  <p class="text-[11.5px] eng-text-body leading-relaxed">${activeStep.instruction}</p>
                  <div class="eng-card-soft rounded-lg border px-2.5 py-2 text-[11px] eng-text-muted leading-relaxed">
                    <span class="font-bold eng-text-main">Warum?</span> ${activeStep.whyText}
                  </div>
                  ${
                    view.wireStart
                      ? `<div class="text-[11px] font-mono text-amber-400 bg-amber-500/12 border border-amber-500/40 rounded-md px-2 py-1">Start gesetzt: <strong>${formatEndpointLabel(view.wireStart, view.boardId)}</strong> → jetzt grünen Zielring anklicken!</div>`
                      : ''
                  }
                  <div class="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      data-guided-auto
                      class="flex-1 py-2 px-3 rounded-lg border border-emerald-500/60 bg-emerald-500/18 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition cursor-pointer"
                    >
                      ✨ Diesen Schritt für mich stecken
                    </button>
                    <button
                      type="button"
                      data-guided-restart
                      title="Projekt neu starten"
                      class="eng-btn-neutral py-2 px-2.5 rounded-lg border text-xs cursor-pointer"
                    >
                      ↺
                    </button>
                  </div>
                </div>
              `
              : ''
        }

        ${this.renderStatusCard(view.summary)}

        <!-- Live Test für Taster / Servo / Sensoren auch im Guided Mode -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-2">
          <span class="text-[10px] font-mono uppercase tracking-wider eng-text-muted font-bold">Schaltung testen</span>
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" data-sb-toggle-gpio class="py-1.5 px-2 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer ${view.state.gpioHigh ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'eng-btn-neutral'}">
              GPIO: ${view.state.gpioHigh ? 'HIGH (3,3V)' : 'LOW (0V)'}
            </button>
            <button type="button" data-sb-hold-btn class="py-1.5 px-2 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer ${view.state.buttonPressed ? 'bg-amber-500/25 border-amber-500 text-amber-400' : 'eng-btn-neutral'}">
              ${view.state.buttonPressed ? 'Taster GEDRÜCKT' : 'Taster halten'}
            </button>
          </div>
        </div>

        <!-- Checkliste aller Schritte -->
        <div class="eng-card rounded-xl border p-3 flex flex-col gap-1.5">
          <span class="text-[10px] font-mono uppercase tracking-wider eng-text-muted font-bold">Bauschritte</span>
          <div class="flex flex-col gap-1.5">${stepsHtml}</div>
        </div>
      </div>
    `;

    this.bindGuidedEvents(view);
  }

  private bindSandboxEvents(view: SandboxPanelViewState): void {
    this.container.querySelectorAll<HTMLButtonElement>('[data-sb-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onSelectTool(btn.dataset.sbTool as SandboxToolId);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-sb-part]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onSelectPartType(btn.dataset.sbPart as SandboxPartType);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-sb-fav-part]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onToggleFavorite('part', btn.dataset.sbFavPart!);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-sb-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onSelectWireColor(btn.dataset.sbColor!);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-sb-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.categoryFilter = btn.dataset.sbCat as 'all' | 'favorites' | SandboxCategory;
        this.lastKey = '';
        this.render(view);
      });
    });

    const searchInput = this.container.querySelector<HTMLInputElement>('[data-sb-search]');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value;
        const caretPos = searchInput.selectionStart ?? this.searchQuery.length;
        this.lastKey = '';
        this.render(view);
        const nextInput = this.container.querySelector<HTMLInputElement>('[data-sb-search]');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(caretPos, caretPos);
        }
      });
    }

    this.container.querySelector('[data-sb-cancel-wire]')?.addEventListener('click', () => {
      this.callbacks.onCancelWire();
    });
    this.container.querySelector('[data-cancel-move]')?.addEventListener('click', () => {
      this.callbacks.onSelectMovePart(null);
    });
    this.container.querySelector('[data-sb-clear]')?.addEventListener('click', () => {
      this.callbacks.onClearBoard();
    });
    this.container.querySelector('[data-sb-starter]')?.addEventListener('click', () => {
      this.callbacks.onLoadStarterKit();
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-nudge-left]').forEach((btn) => {
      btn.addEventListener('click', () => this.callbacks.onNudgePart(btn.dataset.nudgeLeft!, -1));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-nudge-right]').forEach((btn) => {
      btn.addEventListener('click', () => this.callbacks.onNudgePart(btn.dataset.nudgeRight!, 1));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-pick-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pickMove!;
        this.callbacks.onSelectTool('move');
        this.callbacks.onSelectMovePart(view.selectedMovePartId === id ? null : id);
      });
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-del-part]').forEach((btn) => {
      btn.addEventListener('click', () => this.callbacks.onDeletePart(btn.dataset.delPart!));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-del-wire]').forEach((btn) => {
      btn.addEventListener('click', () => this.callbacks.onDeleteWire(btn.dataset.delWire!));
    });

    this.container.querySelector('[data-sb-toggle-gpio]')?.addEventListener('click', () => {
      this.callbacks.onStatePatch({ gpioHigh: !view.state.gpioHigh });
    });
    this.container.querySelector('[data-sb-toggle-sensor]')?.addEventListener('click', () => {
      const next = !view.state.sensorTriggered;
      this.callbacks.onStatePatch({ sensorTriggered: next, radarPresent: next });
    });
    this.container.querySelector('[data-sb-toggle-switch]')?.addEventListener('click', () => {
      this.callbacks.onStatePatch({ switchClosed: !view.state.switchClosed });
    });
    const servoInput = this.container.querySelector<HTMLInputElement>('[data-sb-servo]');
    servoInput?.addEventListener('input', () => {
      this.callbacks.onStatePatch({ servoAngleDeg: Number(servoInput.value) });
    });

    const holdBtn = this.container.querySelector('[data-sb-hold-btn]');
    if (holdBtn) {
      holdBtn.addEventListener('pointerdown', () =>
        this.callbacks.onStatePatch({ buttonPressed: true }),
      );
      holdBtn.addEventListener('pointerup', () =>
        this.callbacks.onStatePatch({ buttonPressed: false }),
      );
      holdBtn.addEventListener('pointerleave', () => {
        if (view.state.buttonPressed) this.callbacks.onStatePatch({ buttonPressed: false });
      });
    }
  }

  private bindGuidedEvents(view: SandboxPanelViewState): void {
    const sel = this.container.querySelector<HTMLSelectElement>('[data-guided-select]');
    sel?.addEventListener('change', () => {
      this.callbacks.onSelectGuidedProject(sel.value);
    });
    this.container.querySelector<HTMLButtonElement>('[data-guided-fav]')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.guidedFav!;
      this.callbacks.onToggleFavorite('guided', id);
    });
    this.container.querySelector('[data-guided-auto]')?.addEventListener('click', () => {
      this.callbacks.onAutoApplyGuidedStep();
    });
    this.container.querySelector('[data-guided-restart]')?.addEventListener('click', () => {
      this.callbacks.onRestartGuidedProject();
    });
    this.container.querySelector('[data-guided-to-sandbox]')?.addEventListener('click', () => {
      this.callbacks.onSwitchToFreeSandbox();
    });
    this.container.querySelector('[data-sb-toggle-gpio]')?.addEventListener('click', () => {
      this.callbacks.onStatePatch({ gpioHigh: !view.state.gpioHigh });
    });
    const holdBtn = this.container.querySelector('[data-sb-hold-btn]');
    if (holdBtn) {
      holdBtn.addEventListener('pointerdown', () =>
        this.callbacks.onStatePatch({ buttonPressed: true }),
      );
      holdBtn.addEventListener('pointerup', () =>
        this.callbacks.onStatePatch({ buttonPressed: false }),
      );
      holdBtn.addEventListener('pointerleave', () => {
        if (view.state.buttonPressed) this.callbacks.onStatePatch({ buttonPressed: false });
      });
    }
  }
}
