import { CalendarPlus, Check, PenLine, SkipForward, Timer } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ExpandableActionBar } from '@/components/motion/expandable-action-bar';
import { blocks as store, useBlocksOfDay } from '@/data/store';
import { creditedMinutes, displayStatus, type DisplayStatus, type TimeBlock } from '@/data/types';
import { addDays, fmtDateTitle, fmtHm, fmtMinutes, fmtMonthDay, fromKey, nowMinutes, toKey, type DayKey } from '@/lib/date';
import { AdjustDialog } from './AdjustDialog';
import { BackfillDialog, type BackfillDraft } from './BackfillDialog';
import { NewBlockDialog, type NewBlockDraft } from './NewBlockDialog';
import './day.css';

/* 时间轴尺度：48px/小时 → 1 小时的块 = 44px，正好是 beui 的一行（Todo List h-11） */
const HOUR_PX = 48;
const BLOCK_GAP = 4;
const DEFAULT_START = 7;
const DEFAULT_END = 20;

const STATUS_LABEL: Record<DisplayStatus, string> = {
  planned: 'Planned',
  pending: 'Confirm?',
  confirmed: 'Confirmed',
  skipped: 'Skipped',
};

const kindLabel = (b: TimeBlock) => (b.kind === 'focus' ? 'Focus' : 'Leisure');
const title = (b: TimeBlock) => b.note || kindLabel(b);

/** 每分钟刷一次「现在」，让当前时间线和待确认状态跟着走 */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function DayView({
  date,
  onChangeDate,
  onBack,
}: {
  date: DayKey;
  onChangeDate: (next: DayKey) => void;
  onBack: () => void;
}) {
  const now = useNow();
  const todayKey = toKey(now);
  const nowMin = nowMinutes(now);
  const day = fromKey(date);
  const prevKey = toKey(addDays(day, -1));
  const nextKey = toKey(addDays(day, 1));
  const isPast = date < todayKey;
  const isToday = date === todayKey;

  const blocks = useBlocksOfDay(date);
  const timed = useMemo(() => blocks.filter((b) => b.startMin !== null && b.endMin !== null), [blocks]);
  const [draft, setDraft] = useState<NewBlockDraft | null>(null);
  const [backfill, setBackfill] = useState<BackfillDraft | null>(null);
  const [adjusting, setAdjusting] = useState<TimeBlock | null>(null);

  // 删除 → 底部提示条可撤销
  const [undo, setUndo] = useState<{ block: TimeBlock; timer: number } | null>(null);
  const remove = async (b: TimeBlock) => {
    if (undo) window.clearTimeout(undo.timer);
    await store.remove(b.id);
    const timer = window.setTimeout(() => setUndo(null), 6000);
    setUndo({ block: b, timer });
  };
  const restore = async () => {
    if (!undo) return;
    window.clearTimeout(undo.timer);
    await store.restore(undo.block.id);
    setUndo(null);
  };

  const totals = useMemo(() => {
    let focus = 0;
    let fun = 0;
    for (const b of blocks) {
      const m = creditedMinutes(b);
      if (b.kind === 'focus') focus += m;
      else fun += m;
    }
    return { focus, fun };
  }, [blocks]);
  const pendingCount = blocks.filter((b) => displayStatus(b, todayKey, nowMin) === 'pending').length;

  // 点空白时段：过去的日子只能补记，今天/未来才排计划
  const onSlot = (startMin: number) => {
    if (isPast) setBackfill({ date });
    else setDraft({ date, startMin });
  };
  const open = (b: TimeBlock) => {
    if (b.startMin === null) setBackfill({ date, existing: b });
    else setDraft({ date, existing: b });
  };

  const actions = [
    ...(isPast
      ? []
      : [
          {
            id: 'new',
            label: 'New block',
            icon: <CalendarPlus className="h-4 w-4" />,
            onClick: () => setDraft({ date }),
          },
        ]),
    ...(date > todayKey
      ? []
      : [{ id: 'backfill', label: 'Log time', icon: <PenLine className="h-4 w-4" />, onClick: () => setBackfill({ date }) }]),
  ];

  return (
    <div className="day">
      <header className="day-header">
        <button type="button" className="day-back" onClick={onBack}>
          ‹ Back to the year
        </button>
        <div className="day-title-row">
          <h1 className="day-title">{fmtDateTitle(day)}</h1>
          <span className="day-sum">
            Focus {fmtMinutes(totals.focus)} · Leisure {fmtMinutes(totals.fun)}
            {pendingCount > 0 && <span className="day-sum-pending"> · {pendingCount} to confirm</span>}
          </span>
        </div>
      </header>

      <div className="day-cols">
        <SideDay date={prevKey} todayKey={todayKey} side="prev" onClick={() => onChangeDate(prevKey)} />
        <div className="day-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={date}
              className="day-scroll"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.14 }}
            >
              <Timeline
                blocks={blocks}
                timed={timed}
                isToday={isToday}
                isPast={isPast}
                todayKey={todayKey}
                nowMin={nowMin}
                onSlot={onSlot}
                onOpen={open}
                onAdjust={setAdjusting}
              />
            </motion.div>
          </AnimatePresence>
          {actions.length > 0 && (
            <div className="day-bar">
              <ExpandableActionBar size="md" items={actions} />
            </div>
          )}
        </div>
        <SideDay date={nextKey} todayKey={todayKey} side="next" onClick={() => onChangeDate(nextKey)} />
      </div>

      <NewBlockDialog draft={draft} others={timed} onClose={() => setDraft(null)} onDelete={(b) => void remove(b)} />
      <BackfillDialog draft={backfill} onClose={() => setBackfill(null)} onDelete={(b) => void remove(b)} />
      <AdjustDialog block={adjusting} onClose={() => setAdjusting(null)} />

      <AnimatePresence>
        {undo && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <span>Deleted “{title(undo.block)}”</span>
            <button type="button" className="toast-btn" onClick={() => void restore()}>
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ 时间轴 */

function Timeline({
  blocks,
  timed,
  isToday,
  isPast,
  todayKey,
  nowMin,
  onSlot,
  onOpen,
  onAdjust,
}: {
  blocks: TimeBlock[];
  timed: TimeBlock[];
  isToday: boolean;
  isPast: boolean;
  todayKey: DayKey;
  nowMin: number;
  onSlot: (startMin: number) => void;
  onOpen: (b: TimeBlock) => void;
  onAdjust: (b: TimeBlock) => void;
}) {
  const untimed = blocks.filter((b) => b.startMin === null);

  // 默认 07:00–20:00，有块超出就把轴拉长；今天至少画到"现在"
  const startHour = Math.min(DEFAULT_START, ...timed.map((b) => Math.floor(b.startMin! / 60)));
  const endHour = Math.min(
    24,
    Math.max(DEFAULT_END, isToday ? Math.ceil(nowMin / 60) + 1 : 0, ...timed.map((b) => Math.ceil(b.endMin! / 60))),
  );
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const y = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX;
  const showNow = isToday && nowMin >= startHour * 60 && nowMin <= endHour * 60;
  const lastEnd = timed.reduce((m, b) => Math.max(m, b.endMin!), startHour * 60);

  // 打开今天时把"现在"滚到视野中间；别的日子滚到第一个块
  const nowRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = (nowRef.current ?? axisRef.current?.querySelector<HTMLElement>('.blk')) as HTMLElement | null;
    const scroller = axisRef.current?.closest<HTMLElement>('.day-scroll');
    if (!target || !scroller) return;
    // 只滚中间栏自己，不用 scrollIntoView（它会连外层 overflow:hidden 的页面一起滚）
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday]);

  return (
    <div className="tl">
      <div className="tl-axis" ref={axisRef} style={{ height: (hours.length - 1) * HOUR_PX + 1 }}>
        {hours.map((h, i) => (
          <div key={h} className="tl-hour" style={{ top: i * HOUR_PX }}>
            <span className="tl-hour-label">{String(h).padStart(2, '0')}:00</span>
            {i < hours.length - 1 && (
              <button
                type="button"
                className="tl-slot"
                aria-label={`${h}:00 ${isPast ? 'log time' : 'new block'}`}
                onClick={() => onSlot(h * 60)}
              />
            )}
          </div>
        ))}

        {layoutLanes(timed).map(({ block: b, lane, lanes }) => (
          <Block
            key={b.id}
            block={b}
            status={displayStatus(b, todayKey, nowMin)}
            top={y(b.startMin!) + BLOCK_GAP / 2}
            height={Math.max(20, y(b.endMin!) - y(b.startMin!) - BLOCK_GAP)}
            lane={lane}
            lanes={lanes}
            others={timed}
            onOpen={onOpen}
            onAdjust={onAdjust}
          />
        ))}

        {!isPast && (
          <button type="button" className="tl-empty" style={{ top: y(lastEnd) + 10 }} onClick={() => onSlot(lastEnd)}>
            ＋ Click an empty slot to add a block
          </button>
        )}

        {showNow && (
          <div className="tl-now" ref={nowRef} style={{ top: y(nowMin) }}>
            <span className="tl-now-pill">Now {fmtHm(nowMin)}</span>
          </div>
        )}
      </div>

      {untimed.length > 0 && (
        <div className="tl-untimed">
          <div className="tl-untimed-title">Logged</div>
          {untimed.map((b) => (
            <button
              key={b.id}
              type="button"
              className="blk blk-row"
              data-kind={b.kind}
              data-status={b.status}
              onClick={() => onOpen(b)}
            >
              <span className="blk-title">{title(b)}</span>
              <span className="blk-sub">
                {fmtMinutes(b.actualMin ?? b.plannedMin)} · {kindLabel(b)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 重叠的块并排放：按开始时间排序，每个块占第一条空闲的"泳道"，
 * 同一组互相重叠的块共享泳道总数，宽度按总数均分。（新建已禁止重叠，这里兜底旧数据）
 */
function layoutLanes(blocks: TimeBlock[]) {
  const sorted = [...blocks].sort((a, b) => a.startMin! - b.startMin! || b.endMin! - a.endMin!);
  const out: { block: TimeBlock; lane: number; lanes: number }[] = [];
  let group: typeof out = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const flush = () => {
    for (const g of group) g.lanes = laneEnds.length;
    out.push(...group);
    group = [];
    laneEnds = [];
  };
  for (const b of sorted) {
    if (b.startMin! >= groupEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= b.startMin!);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = b.endMin!;
    groupEnd = Math.max(groupEnd, b.endMin!);
    group.push({ block: b, lane, lanes: 1 });
  }
  flush();
  return out;
}

/**
 * 块的三种密度（照 Figma 02 的块结构 + beui 行高）：
 *   ≥ 52px：标题 14 + 状态 12 一行，下面「09:00–11:00 · 专注」12 一行
 *   32–52px：只有第一行（1 小时块 = 44px 就是这档）
 *   < 32px：紧凑单行 12px「标题 · 09:00–09:30」+ 状态
 */
const DRAG_SNAP = 5; // 拖动吸附 5 分钟，跟排计划的最小单位一致
const DRAG_DEAD = 4; // 指针挪不到 4px 算点击，不算拖

function Block({
  block: b,
  status,
  top,
  height,
  lane,
  lanes,
  others,
  onOpen,
  onAdjust,
}: {
  block: TimeBlock;
  status: DisplayStatus;
  top: number;
  height: number;
  lane: number;
  lanes: number;
  others: TimeBlock[];
  onOpen: (b: TimeBlock) => void;
  onAdjust: (b: TimeBlock) => void;
}) {
  const density = height >= 52 ? 'full' : height >= 32 ? 'one' : 'tight';
  const w = 100 / lanes;
  const duration = b.endMin! - b.startMin!;

  // 拖动整块上下移：按住拖 → 块跟着指针走（吸附 5 分钟）→ 松手落库；跟别的块重叠就弹回去
  const drag = useRef<{ y0: number; pointerId: number } | null>(null);
  const [offset, setOffset] = useState<number | null>(null); // 拖动中相对原位的分钟数
  const clampStart = (start: number) => Math.max(0, Math.min(24 * 60 - duration, start));
  const snapped = (dy: number) => clampStart(b.startMin! + Math.round((dy / HOUR_PX) * 60 / DRAG_SNAP) * DRAG_SNAP) - b.startMin!;
  const clashes = (start: number) =>
    others.some((o) => o.id !== b.id && o.startMin! < start + duration && o.endMin! > start);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    drag.current = { y0: e.clientY, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y0;
    if (offset === null && Math.abs(dy) < DRAG_DEAD) return;
    setOffset(snapped(dy));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (offset === null) {
      onOpen(b); // 没拖动 = 点击
      return;
    }
    const next = b.startMin! + offset;
    setOffset(null);
    if (offset !== 0 && !clashes(next)) {
      void store.patch(b.id, { startMin: next, endMin: next + duration });
    }
  };

  const shownStart = b.startMin! + (offset ?? 0);
  const range = `${fmtHm(shownStart)}–${fmtHm(shownStart + duration)}`;
  const dragging = offset !== null;
  const bad = dragging && clashes(shownStart);
  return (
    <div
      className="blk blk-abs"
      data-kind={b.kind}
      data-status={status}
      data-density={density}
      data-dragging={dragging || undefined}
      data-clash={bad || undefined}
      role="button"
      tabIndex={0}
      style={{
        top: top + ((offset ?? 0) / 60) * HOUR_PX,
        height,
        left: `calc(${lane * w}% + 6px)`,
        width: `calc(${w}% - ${lanes > 1 ? 10 : 6}px)`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
        setOffset(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(b);
      }}
    >
      <div className="blk-line">
        <span className="blk-title">
          {title(b)}
          {density === 'tight' && <span className="blk-sub"> · {range}</span>}
        </span>
        {status === 'pending' ? (
          <PendingActions block={b} onAdjust={onAdjust} />
        ) : (
          <span className="blk-status">
            {STATUS_LABEL[status]}
            {b.kind === 'fun' && status === 'confirmed' ? ' · Leisure' : ''}
          </span>
        )}
      </div>
      {density === 'full' && (
        <div className="blk-sub">
          {range} · {kindLabel(b)}
          {status === 'confirmed' && b.actualMin !== null && b.actualMin !== b.plannedMin
            ? ` · actual ${fmtMinutes(b.actualMin)}`
            : ''}
        </div>
      )}
    </div>
  );
}

/** 待确认块的三个操作：确认（按计划时长计入）/ 改时长 / 跳过（不计入）。常显。 */
function PendingActions({ block: b, onAdjust }: { block: TimeBlock; onAdjust: (b: TimeBlock) => void }) {
  const stop = (e: MouseEvent) => e.stopPropagation();
  return (
    <span className="blk-actions" onClick={stop}>
      <button
        type="button"
        className="blk-act blk-act-ok"
        title={`Confirm — counts the planned ${fmtMinutes(b.plannedMin)}`}
        onClick={() => void store.patch(b.id, { status: 'confirmed', actualMin: b.plannedMin })}
      >
        <Check size={12} />
        Confirm
      </button>
      <button type="button" className="blk-act" title="Set the actual duration" onClick={() => onAdjust(b)}>
        <Timer size={12} />
        Adjust
      </button>
      <button
        type="button"
        className="blk-act blk-act-skip"
        title="Didn’t happen — not counted"
        onClick={() => void store.patch(b.id, { status: 'skipped', actualMin: null })}
      >
        <SkipForward size={12} />
        Skip
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ 侧栏：前一天 / 后一天 */

function SideDay({
  date,
  todayKey,
  side,
  onClick,
}: {
  date: DayKey;
  todayKey: DayKey;
  side: 'prev' | 'next';
  onClick: () => void;
}) {
  const blocks = useBlocksOfDay(date);
  const d = fromKey(date);
  const today = fromKey(todayKey);
  const rel =
    date === toKey(addDays(today, -1))
      ? 'Yesterday'
      : date === todayKey
        ? 'Today'
        : date === toKey(addDays(today, 1))
          ? 'Tomorrow'
          : side === 'prev'
            ? 'Previous day'
            : 'Next day';
  const label = `${rel} · ${fmtMonthDay(d)}`;
  return (
    <button type="button" className="side" data-side={side} onClick={onClick}>
      <div className="side-title">{side === 'prev' ? `‹ ${label}` : `${label} ›`}</div>
      {blocks.length === 0 ? (
        <div className="side-empty">Nothing planned</div>
      ) : (
        <ul className="side-list">
          {blocks.slice(0, 9).map((b) => (
            <li key={b.id} className="side-item" data-kind={b.kind} data-status={b.status}>
              <span className="side-item-title">{title(b)}</span>
              <span className="side-item-sub">
                {b.startMin === null
                  ? `Logged ${fmtMinutes(b.actualMin ?? b.plannedMin)}`
                  : `${fmtHm(b.startMin)}–${fmtHm(b.endMin!)}`}{' '}
                · {kindLabel(b)}
                {b.status === 'planned' ? ' (planned)' : ''}
              </span>
            </li>
          ))}
          {blocks.length > 9 && <li className="side-more">+{blocks.length - 9} more</li>}
        </ul>
      )}
      <div className="side-hint">Click to switch to this day</div>
    </button>
  );
}
