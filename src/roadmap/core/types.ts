// The roadmap's data, as stored in the page's database. Every field is defined up front.

/** A calendar month, "YYYY-MM". */
export type YearMonth = string;
/** A calendar day, "YYYY-MM-DD" (local date, never a UTC timestamp). */
export type IsoDate = string;

/** One of the fixed palette colors; the page turns a key into a CSS variable. */
export type PaletteKey =
  | 'clay'
  | 'slate'
  | 'olive'
  | 'rose'
  | 'ochre'
  | 'teal'
  | 'plum'
  | 'sand'
  | 'moss'
  | 'dusk';

export interface Goal {
  readonly id: string;
  readonly title: string;
  /** The date Ben wants it reached by. */
  readonly target: IsoDate;
  /** Picked automatically when the goal is created. */
  readonly color: PaletteKey;
}

export type CardState =
  | { readonly kind: 'open' }
  | { readonly kind: 'done'; readonly doneOn: IsoDate };

export interface Card {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  /** null = the card counts toward no goal. */
  readonly goalId: string | null;
  /** The month the card sits under on the timeline. */
  readonly month: YearMonth;
  readonly state: CardState;
  /** Order among cards of the same month (smaller first). */
  readonly rank: number;
}

/** A lane of time ranges (e.g. 學歷, 工作經歷). */
export interface Track {
  readonly id: string;
  readonly name: string;
}

export interface Segment {
  readonly id: string;
  readonly trackId: string;
  readonly name: string;
  readonly start: YearMonth;
  /** Inclusive last month. */
  readonly end: YearMonth;
  readonly color: PaletteKey;
}

/** The rows around the axis. Built-in layers plus one per track. */
export type LayerId = 'cakes' | 'flags' | `track:${string}`;

export interface Layout {
  /** Top to bottom, above the axis. */
  readonly above: readonly LayerId[];
  /** Top to bottom, below the axis. */
  readonly below: readonly LayerId[];
}

export interface Plan {
  readonly goals: readonly Goal[];
  readonly cards: readonly Card[];
  readonly tracks: readonly Track[];
  readonly segments: readonly Segment[];
  readonly layout: Layout;
}
