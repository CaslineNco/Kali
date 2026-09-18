import Database from '@tauri-apps/plugin-sql';
import type { DayKey } from '@/lib/date';
import { creditedMinutes, type BlockKind, type BlockStatus, type DaySummary, type TimeBlock } from './types';

/** 新建时要填的字段；id / 时间戳由仓库生成。 */
export interface NewBlock {
  date: DayKey;
  kind: BlockKind;
  startMin: number | null;
  endMin: number | null;
  plannedMin: number;
  note?: string;
  /** 补记直接传 'confirmed'；排计划默认 'planned' */
  status?: BlockStatus;
}

export interface BlockPatch {
  startMin?: number | null;
  endMin?: number | null;
  plannedMin?: number;
  actualMin?: number | null;
  status?: BlockStatus;
  note?: string;
  kind?: BlockKind;
  date?: DayKey;
}

export interface Repo {
  listByDate(date: DayKey): Promise<TimeBlock[]>;
  listRange(from: DayKey, to: DayKey): Promise<TimeBlock[]>;
  insert(block: NewBlock): Promise<TimeBlock>;
  update(id: string, patch: BlockPatch): Promise<TimeBlock | null>;
  remove(id: string): Promise<void>;
  /** 撤销软删除 */
  restore(id: string): Promise<TimeBlock | null>;
  /** 开发/测试用：清掉所有数据 */
  clearAll(): Promise<void>;
}

/** 按天汇总已确认时长（格子墙用） */
export function summarize(blocks: Iterable<TimeBlock>): Map<DayKey, DaySummary> {
  const out = new Map<DayKey, DaySummary>();
  for (const b of blocks) {
    const min = creditedMinutes(b);
    if (min === 0) continue;
    const s = out.get(b.date) ?? { focus: 0, fun: 0 };
    s[b.kind] += min;
    out.set(b.date, s);
  }
  return out;
}

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

// ---------------------------------------------------------------- SQLite

interface Row {
  id: string;
  date: string;
  kind: BlockKind;
  start_min: number | null;
  end_min: number | null;
  planned_min: number;
  actual_min: number | null;
  status: BlockStatus;
  note: string;
  created_at: string;
  updated_at: string;
}

const fromRow = (r: Row): TimeBlock => ({
  id: r.id,
  date: r.date,
  kind: r.kind,
  startMin: r.start_min,
  endMin: r.end_min,
  plannedMin: r.planned_min,
  actualMin: r.actual_min,
  status: r.status,
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const COLS =
  'id, date, kind, start_min, end_min, planned_min, actual_min, status, note, created_at, updated_at';

/** 字段名 → 列名，update 拼 SQL 用 */
const COL_OF: Record<keyof BlockPatch, string> = {
  startMin: 'start_min',
  endMin: 'end_min',
  plannedMin: 'planned_min',
  actualMin: 'actual_min',
  status: 'status',
  note: 'note',
  kind: 'kind',
  date: 'date',
};

class SqliteRepo implements Repo {
  private db: Database;
  constructor(db: Database) {
    this.db = db;
  }

  async listByDate(date: DayKey) {
    const rows = await this.db.select<Row[]>(
      `SELECT ${COLS} FROM time_blocks WHERE date = $1 AND deleted_at IS NULL ORDER BY start_min, created_at`,
      [date],
    );
    return rows.map(fromRow);
  }

  async listRange(from: DayKey, to: DayKey) {
    const rows = await this.db.select<Row[]>(
      `SELECT ${COLS} FROM time_blocks WHERE date BETWEEN $1 AND $2 AND deleted_at IS NULL ORDER BY date, start_min, created_at`,
      [from, to],
    );
    return rows.map(fromRow);
  }

  async insert(b: NewBlock) {
    const block: TimeBlock = {
      id: newId(),
      date: b.date,
      kind: b.kind,
      startMin: b.startMin,
      endMin: b.endMin,
      plannedMin: b.plannedMin,
      actualMin: b.status === 'confirmed' ? b.plannedMin : null,
      status: b.status ?? 'planned',
      note: b.note ?? '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.db.execute(
      `INSERT INTO time_blocks (${COLS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        block.id,
        block.date,
        block.kind,
        block.startMin,
        block.endMin,
        block.plannedMin,
        block.actualMin,
        block.status,
        block.note,
        block.createdAt,
        block.updatedAt,
      ],
    );
    return block;
  }

  async update(id: string, patch: BlockPatch) {
    const keys = Object.keys(patch) as (keyof BlockPatch)[];
    if (keys.length === 0) return this.get(id);
    const sets = keys.map((k, i) => `${COL_OF[k]} = $${i + 1}`);
    const vals: unknown[] = keys.map((k) => patch[k]);
    vals.push(nowIso(), id);
    await this.db.execute(
      `UPDATE time_blocks SET ${sets.join(', ')}, updated_at = $${vals.length - 1} WHERE id = $${vals.length} AND deleted_at IS NULL`,
      vals,
    );
    return this.get(id);
  }

  async remove(id: string) {
    await this.db.execute(`UPDATE time_blocks SET deleted_at = $1, updated_at = $1 WHERE id = $2`, [
      nowIso(),
      id,
    ]);
  }

  async restore(id: string) {
    await this.db.execute(`UPDATE time_blocks SET deleted_at = NULL, updated_at = $1 WHERE id = $2`, [nowIso(), id]);
    return this.get(id);
  }

  async clearAll() {
    await this.db.execute(`DELETE FROM time_blocks`);
  }

  private async get(id: string) {
    const rows = await this.db.select<Row[]>(
      `SELECT ${COLS} FROM time_blocks WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }
}

// ---------------------------------------------------------------- 内存版（纯浏览器预览用）

class MemoryRepo implements Repo {
  private rows = new Map<string, TimeBlock>();
  private trash = new Map<string, TimeBlock>();

  private sorted(filter: (b: TimeBlock) => boolean) {
    return [...this.rows.values()]
      .filter(filter)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.startMin ?? 1e9) - (b.startMin ?? 1e9) ||
          a.createdAt.localeCompare(b.createdAt),
      );
  }

  async listByDate(date: DayKey) {
    return this.sorted((b) => b.date === date);
  }

  async listRange(from: DayKey, to: DayKey) {
    return this.sorted((b) => b.date >= from && b.date <= to);
  }

  async insert(b: NewBlock) {
    const block: TimeBlock = {
      id: newId(),
      date: b.date,
      kind: b.kind,
      startMin: b.startMin,
      endMin: b.endMin,
      plannedMin: b.plannedMin,
      actualMin: b.status === 'confirmed' ? b.plannedMin : null,
      status: b.status ?? 'planned',
      note: b.note ?? '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.rows.set(block.id, block);
    return block;
  }

  async update(id: string, patch: BlockPatch) {
    const cur = this.rows.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, updatedAt: nowIso() };
    this.rows.set(id, next);
    return next;
  }

  async remove(id: string) {
    const b = this.rows.get(id);
    if (b) this.trash.set(id, b);
    this.rows.delete(id);
  }

  async restore(id: string) {
    const b = this.trash.get(id);
    if (!b) return null;
    this.trash.delete(id);
    this.rows.set(id, b);
    return b;
  }

  async clearAll() {
    this.rows.clear();
  }
}

// ---------------------------------------------------------------- 入口

const inTauri = () => '__TAURI_INTERNALS__' in window;

let repoPromise: Promise<Repo> | null = null;

/** 拿到仓库单例。在 Tauri 里是 SQLite（文件在 AppConfig 目录下 kali.db），纯浏览器里退化成内存版。 */
export function getRepo(): Promise<Repo> {
  repoPromise ??= inTauri()
    ? Database.load('sqlite:kali.db').then((db) => new SqliteRepo(db))
    : Promise.resolve(new MemoryRepo());
  return repoPromise;
}

/** 打开失败后调用：丢掉缓存的 promise，下一次 getRepo 会重新尝试 */
export function resetRepo() {
  repoPromise = null;
}

export const isPersistent = inTauri;
