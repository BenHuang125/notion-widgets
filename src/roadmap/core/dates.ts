// Calendar arithmetic for the timeline. No clock here: "today" is handed in.

import type { IsoDate, YearMonth } from './types';

export interface Day {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export const BIRTH: Day = { year: 1999, month: 4, day: 20 };
/** The first column of the timeline (Ben started university in September 2017). */
export const FIRST_YEAR = 2017;
/** The last column: the year Ben turns 50. */
const LAST_AGE = 50;
export const LAST_YEAR = BIRTH.year + LAST_AGE;

export const MONTHS_PER_YEAR = 12;
const LONG = 31;
const SHORT = 30;
const COMMON_FEBRUARY = 28;
const DAYS_IN_MONTH = [
  LONG,
  COMMON_FEBRUARY,
  LONG,
  SHORT,
  LONG,
  SHORT,
  LONG,
  LONG,
  SHORT,
  LONG,
  SHORT,
  LONG,
] as const;
const LEAP_FEBRUARY = 29;
const FEBRUARY = 2;
const LEAP_EVERY = 4;
const CENTURY = 100;
const LEAP_CENTURY = 400;
const MONTH_DIGITS = 2;

const YM = /^(\d{4})-(\d{2})$/;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

const isLeap = (year: number): boolean =>
  (year % LEAP_EVERY === 0 && year % CENTURY !== 0) || year % LEAP_CENTURY === 0;

export function daysInMonth(year: number, month: number): number {
  if (month === FEBRUARY && isLeap(year)) return LEAP_FEBRUARY;
  return DAYS_IN_MONTH[month - 1] ?? 0;
}

const pad = (n: number): string => String(n).padStart(MONTH_DIGITS, '0');

export const toYearMonth = (year: number, month: number): YearMonth => `${year}-${pad(month)}`;
export const toIsoDate = (d: Day): IsoDate => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

/** Throws on a malformed value: bad data must be loud, never a silent 0. */
export function parseYearMonth(value: YearMonth): { year: number; month: number } {
  const m = YM.exec(value);
  const month = Number(m?.[2]);
  if (!m || month < 1 || month > MONTHS_PER_YEAR) throw new Error(`not a year-month: ${value}`);
  return { year: Number(m[1]), month };
}

export function parseIsoDate(value: IsoDate): Day {
  const m = YMD.exec(value);
  if (!m) throw new Error(`not a date: ${value}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > MONTHS_PER_YEAR || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`not a date: ${value}`);
  }
  return { year, month, day };
}

/** Months since January of FIRST_YEAR, as a fraction (the middle of the 1st = 0.0x). */
export function monthsFromStart(d: Day): number {
  const whole = (d.year - FIRST_YEAR) * MONTHS_PER_YEAR + (d.month - 1);
  return whole + (d.day - 1) / daysInMonth(d.year, d.month);
}

/** Where a month starts on the timeline, in months since the start. */
export function monthStart(ym: YearMonth): number {
  const { year, month } = parseYearMonth(ym);
  return (year - FIRST_YEAR) * MONTHS_PER_YEAR + (month - 1);
}

/** Age reached on the birthday in `year`. */
export const ageInYear = (year: number): number => year - BIRTH.year;

/** Where each birthday sits, for the cake markers. */
export function birthdays(): { year: number; age: number; at: number }[] {
  const out: { year: number; age: number; at: number }[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    out.push({ year, age: ageInYear(year), at: monthsFromStart({ ...BIRTH, year }) });
  }
  return out;
}

export const yearCount = (): number => LAST_YEAR - FIRST_YEAR + 1;

export const compareDays = (a: IsoDate, b: IsoDate): number => (a < b ? -1 : a > b ? 1 : 0);

/** "2026/9/30": how dates read on the page. */
export function slashDate(iso: IsoDate): string {
  const d = parseIsoDate(iso);
  return `${d.year}/${d.month}/${d.day}`;
}
