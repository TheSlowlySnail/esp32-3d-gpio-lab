export type FavoriteKind = 'part' | 'lesson' | 'guided' | 'funny';

export interface FavoritesData {
  parts: string[];
  lessons: string[];
  guided: string[];
  funny: string[];
}

const STORAGE_KEY = 'learn-esp32-favorites-v1';

const EMPTY_FAVORITES: FavoritesData = {
  parts: [],
  lessons: [],
  guided: [],
  funny: [],
};

/**
 * Persistenter Favoriten-Speicher (localStorage) für Bauteile, Lektionen,
 * geführte Bauprojekte und Funny-Ideen.
 */
export class FavoritesStore {
  private data: FavoritesData;

  constructor() {
    this.data = this.load();
  }

  private load(): FavoritesData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { parts: [], lessons: [], guided: [], funny: [] };
      const parsed = JSON.parse(raw) as Partial<FavoritesData>;
      return {
        parts: Array.isArray(parsed.parts) ? parsed.parts : [],
        lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
        guided: Array.isArray(parsed.guided) ? parsed.guided : [],
        funny: Array.isArray(parsed.funny) ? parsed.funny : [],
      };
    } catch {
      return { ...EMPTY_FAVORITES, parts: [], lessons: [], guided: [], funny: [] };
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore storage quota / private mode errors
    }
  }

  private listFor(kind: FavoriteKind): string[] {
    if (kind === 'part') return this.data.parts;
    if (kind === 'lesson') return this.data.lessons;
    if (kind === 'guided') return this.data.guided;
    return this.data.funny;
  }

  public has(kind: FavoriteKind, id: string): boolean {
    return this.listFor(kind).includes(id);
  }

  public toggle(kind: FavoriteKind, id: string): boolean {
    const list = this.listFor(kind);
    const idx = list.indexOf(id);
    if (idx >= 0) {
      list.splice(idx, 1);
      this.save();
      return false;
    }
    list.push(id);
    this.save();
    return true;
  }

  public getAll(): FavoritesData {
    return {
      parts: [...this.data.parts],
      lessons: [...this.data.lessons],
      guided: [...this.data.guided],
      funny: [...this.data.funny],
    };
  }

  public getTotalCount(): number {
    return (
      this.data.parts.length +
      this.data.lessons.length +
      this.data.guided.length +
      this.data.funny.length
    );
  }

  public clearAll(): void {
    this.data = { parts: [], lessons: [], guided: [], funny: [] };
    this.save();
  }
}
