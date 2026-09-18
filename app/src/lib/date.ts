/** 本地日期工具：一律用本地时间的「年-月-日」，不用 UTC，避免跨时区偏一天。 */

export type DayKey = string; // "YYYY-MM-DD"

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** 该日期所在周的周一（周一为一周第一天）。 */
export const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

export const toKey = (d: Date): DayKey => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const fmtDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  weekday: 'short',
});

/** 分钟 → "2h30m" / "45m" / "0m" */
export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

/** "YYYY-MM-DD" → 本地日期 */
export const fromKey = (key: DayKey): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** 分钟数（距 00:00）→ "09:30" */
export const fmtHm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** "09:30" → 分钟数；非法返回 null */
export const parseHm = (s: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
};

/** 现在距今天 00:00 的分钟数 */
export const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Saturday, Mar 14 2026" */
export const fmtDateTitle = (d: Date) =>
  `${WEEKDAY_LONG[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Mar 14" */
export const fmtMonthDay = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

/** "Sat, Mar 14" */
export const fmtDateShort = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
