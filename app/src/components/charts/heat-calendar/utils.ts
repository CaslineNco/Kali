/** 5 档色阶（PRD 9.9）：同一琥珀色相、亮度递增，不用透明度。变量定义在 index.css。 */
export const STEPS = [0, 1, 2, 3, 4] as const;

export const FILLS = STEPS.map((i) => `var(--level-${i})`);

export const EMPTY = FILLS[0];

/** 未来日期：不填色，只留一圈淡描边，跟"记录了 0 分钟"区分。 */
export const FUTURE = "transparent";

/** Cell size and gap; every position in the grid and the tooltip derive from these. */
export const CELL = 14;

export const GAP = 4;

export const PITCH = CELL + GAP;

export const MONTH_ROW = 12;

export const DAYS = Array.from({ length: 7 }, (_, d) => ({ id: `d${d}`, d }));

/** How far a cell rises when it is the hovered one, its neighbour, or two away. */
export const LIFT = [1.3, 1.08, 1.03];

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

/** Monday on or before `d`, so every column reads Mon to Sun, top to bottom. */
export const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getUTCDay() + 6) % 7));

export const makeFormats = (locale = "en-US") => ({
  day: new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }),
  month: new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short" }),
  range: new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", day: "numeric" }),
});
