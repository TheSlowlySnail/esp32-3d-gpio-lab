import { FUNNY_IDEAS, type FunnyIdea, type FunnyPlatform } from '../sandbox/FunnyIdeas';

export class FunnyIdeasView {
  private readonly container: HTMLElement;
  private readonly onLoadIdeaInSandbox: (idea: FunnyIdea) => void;
  private readonly isFavorite: (id: string) => boolean;
  private readonly onToggleFavorite: (id: string) => void;
  private activeFilter: 'all' | FunnyPlatform = 'all';

  constructor(
    container: HTMLElement,
    onLoadIdeaInSandbox: (idea: FunnyIdea) => void,
    isFavorite: (id: string) => boolean,
    onToggleFavorite: (id: string) => void,
  ) {
    this.container = container;
    this.onLoadIdeaInSandbox = onLoadIdeaInSandbox;
    this.isFavorite = isFavorite;
    this.onToggleFavorite = onToggleFavorite;
    this.render();
  }

  public render(): void {
    const filtered = FUNNY_IDEAS.filter((idea) => {
      if (this.activeFilter === 'all') return true;
      return idea.platform === this.activeFilter || idea.platform === 'both';
    });

    const filterBtn = (id: 'all' | FunnyPlatform, label: string, count: number) => {
      const active = this.activeFilter === id;
      const cls = active
        ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-400 font-bold'
        : 'eng-btn-neutral font-medium';
      return `<button type="button" data-funny-filter="${id}" class="px-3 py-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1.5 ${cls}">
        <span>${label}</span>
        <span class="text-[10px] font-mono opacity-80">(${count})</span>
      </button>`;
    };

    const espCount = FUNNY_IDEAS.filter((i) => i.platform === 'esp32' || i.platform === 'both').length;
    const piCount = FUNNY_IDEAS.filter((i) => i.platform === 'raspberry-pi' || i.platform === 'both').length;

    this.container.innerHTML = `
      <div class="max-w-7xl mx-auto p-5 sm:p-6 flex flex-col gap-5">
        <!-- Hero Header -->
        <div class="eng-card rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="text-xl">😂</span>
              <h2 class="text-base sm:text-lg font-bold eng-text-main tracking-tight">
                Funny Maker-Ideen für Raspberry Pi &amp; ESP32
              </h2>
              <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-fuchsia-500/18 text-fuchsia-400 border border-fuchsia-500/40 font-bold">
                ${FUNNY_IDEAS.length} Spaß-Projekte
              </span>
            </div>
            <p class="text-xs sm:text-[13px] eng-text-body max-w-3xl leading-relaxed">
              Elektronik lernen macht am meisten Spaß, wenn am Ende etwas richtig Witziges dabei herauskommt!
              Klicke bei jeder Idee auf <strong class="eng-text-accent">„⚡ In 3D-Werkbank laden“</strong> — dann steckt der Prototyp inklusive passendem ESP32 oder Raspberry Pi sofort live auf deinem 3D-Steckbrett!
            </p>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap shrink-0">
            ${filterBtn('all', 'Alle Ideen', FUNNY_IDEAS.length)}
            ${filterBtn('esp32', 'ESP32', espCount)}
            ${filterBtn('raspberry-pi', 'Raspberry Pi', piCount)}
          </div>
        </div>

        <!-- Ideas Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          ${filtered
            .map((idea) => {
              const platBadge =
                idea.platform === 'raspberry-pi'
                  ? '<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-pink-500/18 text-pink-400 border border-pink-500/40">RASPBERRY PI</span>'
                  : idea.platform === 'esp32'
                    ? '<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/18 eng-text-accent border border-cyan-500/40">ESP32</span>'
                    : '<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/18 text-violet-400 border border-violet-500/40">ESP32 &amp; PI</span>';

              const gagStars = '😂'.repeat(idea.gagRating);
              const diffTone =
                idea.difficulty === 'Einfach'
                  ? 'text-emerald-400'
                  : idea.difficulty === 'Mittel'
                    ? 'text-amber-400'
                    : 'text-rose-400';

              return `
                <article class="eng-card rounded-2xl border p-4 flex flex-col justify-between gap-3.5 hover:border-fuchsia-500/50 transition">
                  <div class="flex flex-col gap-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="w-10 h-10 rounded-xl bg-fuchsia-500/12 border border-fuchsia-500/30 flex items-center justify-center text-xl shrink-0">
                          ${idea.emoji}
                        </span>
                        <div class="min-w-0">
                          <h3 class="text-sm font-bold eng-text-main leading-snug">${idea.title}</h3>
                          <div class="flex items-center gap-2 mt-0.5 text-[10.5px] font-mono">
                            <span class="${diffTone}">${idea.difficulty}</span>
                            <span class="opacity-40">·</span>
                            <span title="Gag-Faktor">${gagStars}</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        ${platBadge}
                        <button
                          type="button"
                          data-funny-fav="${idea.id}"
                          title="${this.isFavorite(idea.id) ? 'Aus Favoriten entfernen' : 'Als Favorit merken'}"
                          class="w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition cursor-pointer ${
                            this.isFavorite(idea.id)
                              ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                              : 'eng-btn-neutral eng-text-muted hover:text-amber-400'
                          }"
                        >${this.isFavorite(idea.id) ? '★' : '☆'}</button>
                      </div>
                    </div>

                    <p class="text-xs font-semibold eng-text-accent leading-relaxed">
                      ${idea.tagline}
                    </p>

                    <p class="text-[11.5px] eng-text-body leading-relaxed">
                      ${idea.howItWorks}
                    </p>

                    <div class="flex flex-wrap gap-1.5 pt-1">
                      ${idea.partsList
                        .map(
                          (p) =>
                            `<span class="text-[10px] font-mono px-2 py-0.5 rounded-md eng-card-soft border eng-text-muted">${p}</span>`,
                        )
                        .join('')}
                    </div>

                    <div class="eng-card-soft rounded-lg border px-2.5 py-2 text-[11px] eng-text-muted leading-relaxed">
                      <span class="font-bold text-amber-400">💡 Bonus-Gag:</span> ${idea.bonusUpgrade}
                    </div>
                  </div>

                  <button
                    type="button"
                    data-load-funny="${idea.id}"
                    class="w-full py-2 px-3 rounded-xl border border-fuchsia-500/55 bg-fuchsia-500/18 hover:bg-fuchsia-500/30 text-fuchsia-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>⚡</span>
                    <span>Prototyp in 3D-Werkbank laden</span>
                  </button>
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll<HTMLButtonElement>('[data-funny-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.dataset.funnyFilter as 'all' | FunnyPlatform;
        this.render();
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-load-funny]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idea = FUNNY_IDEAS.find((i) => i.id === btn.dataset.loadFunny);
        if (idea) this.onLoadIdeaInSandbox(idea);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-funny-fav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onToggleFavorite(btn.dataset.funnyFav!);
        this.render();
      });
    });
  }
}
