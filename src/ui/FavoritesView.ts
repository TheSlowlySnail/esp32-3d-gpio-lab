import type { CircuitTopologyId } from '../engine/types';
import { LESSONS } from '../lessons/lessons';
import { FUNNY_IDEAS, type FunnyIdea } from '../sandbox/FunnyIdeas';
import type { FavoriteKind, FavoritesStore } from '../sandbox/FavoritesStore';
import { GUIDED_PROJECTS } from '../sandbox/GuidedProjects';
import { SANDBOX_CATALOG } from '../sandbox/SandboxEngine';
import type { SandboxPartType } from '../sandbox/SandboxTypes';

export interface FavoritesViewCallbacks {
  onOpenPartInSandbox: (type: SandboxPartType) => void;
  onOpenLesson: (id: CircuitTopologyId) => void;
  onOpenGuidedProject: (projectId: string) => void;
  onLoadFunnyIdea: (idea: FunnyIdea) => void;
  onToggleFavorite: (kind: FavoriteKind, id: string) => void;
  onClearAllFavorites: () => void;
}

export class FavoritesView {
  private readonly container: HTMLElement;
  private readonly store: FavoritesStore;
  private readonly callbacks: FavoritesViewCallbacks;

  constructor(
    container: HTMLElement,
    store: FavoritesStore,
    callbacks: FavoritesViewCallbacks,
  ) {
    this.container = container;
    this.store = store;
    this.callbacks = callbacks;
    this.render();
  }

  public render(): void {
    const favs = this.store.getAll();
    const total = this.store.getTotalCount();

    const favParts = favs.parts
      .map((id) => SANDBOX_CATALOG.find((c) => c.type === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const favLessons = favs.lessons
      .map((id) => LESSONS.find((l) => l.id === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const favGuided = favs.guided
      .map((id) => GUIDED_PROJECTS.find((p) => p.id === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const favFunny = favs.funny
      .map((id) => FUNNY_IDEAS.find((f) => f.id === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const emptyQuickPicks: Array<{
      kind: FavoriteKind;
      id: string;
      emoji: string;
      label: string;
      sub: string;
    }> = [
      { kind: 'part', id: 'scd41-co2', emoji: '🌿', label: 'SCD41 CO₂-Sensor', sub: 'I²C Luftgüte-Sensor' },
      { kind: 'part', id: 'vl53l0x-tof', emoji: '🎯', label: 'VL53L0X Laser-ToF', sub: 'Millimeter-Laserdistanz' },
      { kind: 'part', id: 'nema17-stepper', emoji: '⚙️', label: 'NEMA 17 Schrittmotor', sub: 'Präzisions-Aktor' },
      { kind: 'part', id: 'nixie-tube', emoji: '🟠', label: 'Retro Nixie-Röhre', sub: 'Glimmziffer-Display' },
      { kind: 'guided', id: 'guided-fan-neopixel', emoji: '🧭', label: '5V Lüfter + NeoPixel-Ring', sub: 'Geführtes Bauprojekt' },
      { kind: 'funny', id: 'fridge-midnight-shame', emoji: '🍕', label: 'Mitternachts-Kühlschrank-Pranger', sub: 'Funny Idee (ESP32)' },
    ];

    this.container.innerHTML = `
      <div class="max-w-7xl mx-auto p-5 sm:p-6 flex flex-col gap-5">
        <!-- Hero Header -->
        <div class="eng-card rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="text-xl">⭐</span>
              <h2 class="text-base sm:text-lg font-bold eng-text-main tracking-tight">
                Deine Favoriten — Schnellzugriff
              </h2>
              <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/18 text-amber-400 border border-amber-500/40 font-bold">
                ${total} gespeichert
              </span>
            </div>
            <p class="text-xs sm:text-[13px] eng-text-body max-w-3xl leading-relaxed">
              Markiere deine Lieblings-Sensoren, Aktoren, Lektionen, Bauprojekte und Funny-Ideen überall mit dem
              <strong class="text-amber-400">★ Stern</strong>. Deine Sammlung bleibt lokal im Browser gespeichert!
            </p>
          </div>
          ${
            total > 0
              ? `<button type="button" data-fav-clear class="eng-btn-neutral px-3 py-1.5 rounded-lg border text-xs font-mono hover:border-red-500 hover:text-red-400 cursor-pointer shrink-0">
                  Alle Favoriten leeren
                </button>`
              : ''
          }
        </div>

        ${
          total === 0
            ? `
              <div class="eng-card rounded-2xl border p-6 flex flex-col gap-4 items-start">
                <div class="flex flex-col gap-1">
                  <h3 class="text-sm font-bold eng-text-main">Noch keine Favoriten gemerkt</h3>
                  <p class="text-xs eng-text-muted leading-relaxed">
                    Klicke einfach auf den Stern <span class="text-amber-400 font-bold">☆</span> bei Bauteilen in der Werkbank, bei Lektionen, Bauprojekten oder Funny-Ideen — oder füge hier direkt beliebte Highlights hinzu:
                  </p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full">
                  ${emptyQuickPicks
                    .map(
                      (q) => `
                    <button
                      type="button"
                      data-fav-toggle="${q.kind}:${q.id}"
                      class="eng-card-soft rounded-xl border p-3 text-left hover:border-amber-400/60 transition cursor-pointer flex items-center justify-between gap-2.5"
                    >
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-lg shrink-0">${q.emoji}</span>
                        <div class="min-w-0">
                          <div class="text-xs font-bold eng-text-main truncate">${q.label}</div>
                          <div class="text-[10.5px] eng-text-muted truncate">${q.sub}</div>
                        </div>
                      </div>
                      <span class="text-amber-400 text-xs font-mono font-bold shrink-0">＋ ★</span>
                    </button>
                  `,
                    )
                    .join('')}
                </div>
              </div>
            `
            : ''
        }

        ${
          favParts.length > 0
            ? `
              <section class="flex flex-col gap-2.5">
                <h3 class="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  🔧 Bauteile, Sensoren &amp; Aktoren (${favParts.length})
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  ${favParts
                    .map(
                      (p) => `
                    <div class="eng-card rounded-xl border p-3.5 flex flex-col justify-between gap-2.5">
                      <div class="flex flex-col gap-1.5">
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${p.accentHex}"></span>
                            <span class="text-xs font-bold eng-text-main truncate">${p.name}</span>
                          </div>
                          <button type="button" data-fav-toggle="part:${p.type}" title="Aus Favoriten entfernen" class="text-amber-400 hover:opacity-70 text-sm cursor-pointer shrink-0">★</button>
                        </div>
                        <span class="text-[10px] font-mono uppercase eng-text-accent">${p.category}</span>
                        <p class="text-[11px] eng-text-body leading-relaxed">${p.description}</p>
                      </div>
                      <button type="button" data-fav-open-part="${p.type}" class="w-full py-1.5 px-2.5 rounded-lg border border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 eng-text-accent text-xs font-semibold cursor-pointer">
                        In Werkbank nutzen →
                      </button>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              </section>
            `
            : ''
        }

        ${
          favLessons.length > 0
            ? `
              <section class="flex flex-col gap-2.5">
                <h3 class="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  📚 Lektionen (${favLessons.length})
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  ${favLessons
                    .map(
                      (l) => `
                    <div class="eng-card rounded-xl border p-3.5 flex flex-col justify-between gap-2.5">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-start justify-between gap-2">
                          <span class="text-xs font-bold eng-text-main">${l.number} · ${l.title}</span>
                          <button type="button" data-fav-toggle="lesson:${l.id}" title="Aus Favoriten entfernen" class="text-amber-400 hover:opacity-70 text-sm cursor-pointer shrink-0">★</button>
                        </div>
                        <span class="text-[10px] font-mono uppercase eng-text-accent">${l.category}</span>
                        <p class="text-[11px] eng-text-body leading-relaxed">${l.summary}</p>
                      </div>
                      <button type="button" data-fav-open-lesson="${l.id}" class="w-full py-1.5 px-2.5 rounded-lg border border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 eng-text-accent text-xs font-semibold cursor-pointer">
                        Lektion öffnen →
                      </button>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              </section>
            `
            : ''
        }

        ${
          favGuided.length > 0
            ? `
              <section class="flex flex-col gap-2.5">
                <h3 class="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  🧭 Geführte Bauprojekte (${favGuided.length})
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  ${favGuided
                    .map(
                      (g) => `
                    <div class="eng-card rounded-xl border p-3.5 flex flex-col justify-between gap-2.5">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-start justify-between gap-2">
                          <span class="text-xs font-bold eng-text-main">${g.title}</span>
                          <button type="button" data-fav-toggle="guided:${g.id}" title="Aus Favoriten entfernen" class="text-amber-400 hover:opacity-70 text-sm cursor-pointer shrink-0">★</button>
                        </div>
                        <span class="text-[10px] font-mono text-emerald-400">${g.difficulty} · ${g.durationLabel}</span>
                        <p class="text-[11px] eng-text-body leading-relaxed">${g.summary}</p>
                      </div>
                      <button type="button" data-fav-open-guided="${g.id}" class="w-full py-1.5 px-2.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold cursor-pointer">
                        Schritt-für-Schritt bauen →
                      </button>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              </section>
            `
            : ''
        }

        ${
          favFunny.length > 0
            ? `
              <section class="flex flex-col gap-2.5">
                <h3 class="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  😂 Funny Ideen (${favFunny.length})
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  ${favFunny
                    .map(
                      (f) => `
                    <div class="eng-card rounded-xl border p-3.5 flex flex-col justify-between gap-2.5">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-start justify-between gap-2">
                          <span class="text-xs font-bold eng-text-main">${f.emoji} ${f.title}</span>
                          <button type="button" data-fav-toggle="funny:${f.id}" title="Aus Favoriten entfernen" class="text-amber-400 hover:opacity-70 text-sm cursor-pointer shrink-0">★</button>
                        </div>
                        <p class="text-[11px] eng-text-accent leading-relaxed">${f.tagline}</p>
                      </div>
                      <button type="button" data-fav-open-funny="${f.id}" class="w-full py-1.5 px-2.5 rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 text-xs font-semibold cursor-pointer">
                        ⚡ Prototyp in 3D laden
                      </button>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              </section>
            `
            : ''
        }
      </div>
    `;

    this.container.querySelector('[data-fav-clear]')?.addEventListener('click', () => {
      this.callbacks.onClearAllFavorites();
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-fav-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [kind, ...rest] = (btn.dataset.favToggle ?? '').split(':');
        this.callbacks.onToggleFavorite(kind as FavoriteKind, rest.join(':'));
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-fav-open-part]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onOpenPartInSandbox(btn.dataset.favOpenPart!);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-fav-open-lesson]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onOpenLesson(btn.dataset.favOpenLesson as CircuitTopologyId);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-fav-open-guided]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onOpenGuidedProject(btn.dataset.favOpenGuided!);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-fav-open-funny]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idea = FUNNY_IDEAS.find((i) => i.id === btn.dataset.favOpenFunny);
        if (idea) this.callbacks.onLoadFunnyIdea(idea);
      });
    });
  }
}
