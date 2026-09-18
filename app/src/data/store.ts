import { emit, listen } from '@tauri-apps/api/event';
import { useEffect, useMemo, useState } from 'react';
import type { DayKey } from '@/lib/date';
import { getRepo, resetRepo, summarize, type BlockPatch, type NewBlock } from './repo';
import type { DaySummary, TimeBlock } from './types';

/**
 * 按年加载一次、按天缓存在内存里的数据层。
 * 写操作先落库，再就地改缓存并通知订阅者——不重拉，视图只重算受影响的那一天。
 * 数据量小（一年几千条），整年常驻内存没有压力；悬浮窗常驻刷新也不会每分钟打一次库。
 */

const byDay = new Map<DayKey, TimeBlock[]>();
const loadedYears = new Set<number>();
const loading = new Map<number, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;
/** 打开数据库 / 读年失败时的错误文案；成功后清空。失败的 promise 不缓存，下次调用会重试。 */
let lastError: string | null = null;

function notify() {
  version++;
  for (const l of listeners) l();
}

/**
 * 主窗口和悬浮窗各有一份缓存，但共用一个 SQLite。
 * 任一窗口写完就广播一声，别的窗口收到后整个缓存作废、重新拉——数据量小，简单可靠。
 */
const CHANGED = 'kali:blocks-changed';
const WIN_ID = Math.random().toString(36).slice(2);
const inTauri = '__TAURI_INTERNALS__' in window;

type Changed = { from: string; dates: DayKey[] };

/** 只广播动过的日期；对方窗口只重拉这几天，不清整年缓存（避免时间轴闪一下空白） */
function broadcast(dates: DayKey[]) {
  if (inTauri) void emit(CHANGED, { from: WIN_ID, dates } satisfies Changed);
}

if (inTauri) {
  void listen<Changed>(CHANGED, async (e) => {
    if (e.payload.from === WIN_ID) return;
    const dates = e.payload.dates.length ? e.payload.dates : [...byDay.keys()];
    const repo = await getRepo();
    for (const date of dates) {
      const list = await repo.listByDate(date);
      if (list.length) byDay.set(date, sortDay(list));
      else byDay.delete(date);
    }
    notify();
  });
}

const yearOf = (date: DayKey) => Number(date.slice(0, 4));

const sortDay = (list: TimeBlock[]) =>
  list.sort((a, b) => (a.startMin ?? 1e9) - (b.startMin ?? 1e9) || a.createdAt.localeCompare(b.createdAt));

// 每次写都换一个新数组，不原地改：视图靠数组引用判断"这一天变没变"
function put(b: TimeBlock) {
  const list = (byDay.get(b.date) ?? []).filter((x) => x.id !== b.id);
  byDay.set(b.date, sortDay([...list, b]));
}

function drop(id: string): TimeBlock | null {
  for (const [date, list] of byDay) {
    const removed = list.find((x) => x.id === id);
    if (removed) {
      const rest = list.filter((x) => x.id !== id);
      if (rest.length === 0) byDay.delete(date);
      else byDay.set(date, rest);
      return removed;
    }
  }
  return null;
}

/** 确保某一年已经进缓存 */
export function ensureYear(year: number): Promise<void> {
  if (loadedYears.has(year)) return Promise.resolve();
  let p = loading.get(year);
  if (!p) {
    p = getRepo()
      .then((repo) => repo.listRange(`${year}-01-01`, `${year}-12-31`))
      .then((list) => {
        for (const b of list) put(b);
        loadedYears.add(year);
        lastError = null;
      })
      .catch((err: unknown) => {
        lastError = err instanceof Error ? err.message : String(err);
        resetRepo();
      })
      .finally(() => {
        loading.delete(year);
        notify();
      });
    loading.set(year, p);
  }
  return p;
}

const findById = (id: string) => {
  for (const list of byDay.values()) {
    const b = list.find((x) => x.id === id);
    if (b) return b;
  }
  return null;
};

/** 写操作统一从这里走：落库 → 改缓存 → 通知。 */
export const blocks = {
  async add(b: NewBlock) {
    const r = await (await getRepo()).insert(b);
    put(r);
    notify();
    broadcast([r.date]);
    return r;
  },
  async patch(id: string, p: BlockPatch) {
    const before = findById(id);
    const r = await (await getRepo()).update(id, p);
    if (r) {
      drop(id); // 日期可能变了，先摘再放
      put(r);
    }
    notify();
    broadcast([...new Set([before?.date, r?.date].filter((d): d is DayKey => !!d))]);
    return r;
  },
  /** 删除；返回被删的块，配合 restore 做撤销 */
  async remove(id: string) {
    await (await getRepo()).remove(id);
    const removed = drop(id);
    notify();
    broadcast(removed ? [removed.date] : []);
    return removed;
  },
  /** 撤销删除 */
  async restore(id: string) {
    const r = await (await getRepo()).restore(id);
    if (r) put(r);
    notify();
    broadcast(r ? [r.date] : []);
    return r;
  },
  async clearAll() {
    await (await getRepo()).clearAll();
    byDay.clear();
    notify();
    broadcast([]);
  },
  /** 批量写（导入演示数据等），只通知一次 */
  async addMany(list: NewBlock[]) {
    const repo = await getRepo();
    const dates = new Set<DayKey>();
    for (const b of list) {
      const r = await repo.insert(b);
      put(r);
      dates.add(r.date);
    }
    notify();
    broadcast([...dates]);
  },
  get: findById,
};

/** 本地设置（API key 等）：读一次进内存，写了就通知 */
const settingsCache = new Map<string, string | null>();
export const settings = {
  async get(key: string) {
    if (!settingsCache.has(key)) settingsCache.set(key, await (await getRepo()).getSetting(key));
    return settingsCache.get(key) ?? null;
  },
  async set(key: string, value: string) {
    await (await getRepo()).setSetting(key, value);
    settingsCache.set(key, value);
    notify();
  },
  peek(key: string) {
    return settingsCache.get(key) ?? null;
  },
};

export function useSetting(key: string) {
  const v = useVersion();
  const [value, setValue] = useState<string | null>(() => settings.peek(key));
  useEffect(() => {
    let alive = true;
    void settings.get(key).then((x) => {
      if (alive) setValue(x);
    });
    return () => {
      alive = false;
    };
  }, [key, v]);
  return value;
}

function useVersion() {
  const [v, setV] = useState(version);
  useEffect(() => {
    const l = () => setV(version);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return v;
}

const EMPTY: TimeBlock[] = [];

/** 某一天的块（日程视图、悬浮窗用）。同一天没变化时返回同一个数组引用。 */
export function useBlocksOfDay(date: DayKey): TimeBlock[] {
  const v = useVersion();
  const year = yearOf(date);
  useEffect(() => {
    void ensureYear(year);
  }, [year]);
  return useMemo(() => byDay.get(date) ?? EMPTY, [date, v]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** 一整年的块 + 按天汇总的已确认时长（格子墙用） */
export function useYearSummary(year: number) {
  const v = useVersion();
  const [ready, setReady] = useState(loadedYears.has(year));
  useEffect(() => {
    void ensureYear(year).then(() => setReady(true));
  }, [year]);
  const all = useMemo(() => {
    const out: TimeBlock[] = [];
    for (const [date, list] of byDay) if (yearOf(date) === year) out.push(...list);
    return out;
  }, [year, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo<Map<DayKey, DaySummary>>(() => summarize(all), [all]);
  return { summary, blocks: all, loading: !ready, error: lastError };
}
