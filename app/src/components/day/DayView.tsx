import { CalendarPlus, Check, PenLine, Plus, SkipForward, Timer } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatedBadge } from '@/components/motion/animated-badge';
import { AnimatedToastStack, useAnimatedToastStack } from '@/components/motion/animated-toast-stack';
import { Button } from '@/components/motion/button/base';
import { ExpandableActionBar } from '@/components/motion/expandable-action-bar';
import { blocks as store, useBlocksOfDay } from '@/data/store';
import { creditedMinutes, displayStatus, type DisplayStatus, type TimeBlock } from '@/data/types';
import { addDays, fmtDateTitle, fmtHm, fmtMinutes, fmtMonthDay, fromKey, nowMinutes, toKey, type DayKey } from '@/lib/date';
import { cn } from '@/lib/utils';
import { AdjustDialog } from './AdjustDialog';
import { BackfillDialog, type BackfillDraft } from './BackfillDialog';
import { BlockRow, MarkBox, StatusBadge, blockTitle, kindLabel } from './BlockRow';
import { NewBlockDialog, type NewBlockDraft } from './NewBlockDialog';
import './day.css';

/* 时间轴尺度：48px/小时 → 1 小时的块 = 44px，正好是 beui 的一行 */
const HOUR_PX = 48;
const BLOCK_GAP = 4;
const DEFAULT_START = 7;
const DEFAULT_END = 20;

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

  // 删除 → beui toast，带 Undo
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({ defaultDuration: 6000, limit: 3 });
  const remove = async (b: TimeBlock) => {
    await store.remove(b.id);
    showToast({
      title: `Deleted “${blockTitle(b)}”`,
      status: 'neutral',
      action: {
        label: 'Undo',
        onClick: (t) => {
          void store.restore(b.id);
          dismissToast(t.id);
        },
      },
    });
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
      : [{ id: 'new', label: 'New block', icon: <CalendarPlus className="h-4 w-4" />, onClick: () => setDraft({ date }) }]),
    ...(date > todayKey
      ? []
      : [{ id: 'backfill', label: 'Log time', icon: <PenLine className="h-4 w-4" />, onClick: () => setBackfill({ date }) }]),
  ];

  return (
    <div className="day">
      <header className="flex flex-col gap-1">
        <Button variant="ghost" size="sm" className="-ml-2 h-7 w-fit px-2 text-xs" onClick={onBack}>
          ‹ Back to the year
        </Button>
        <div className="flex items-baseline gap-6">
          <h1 className="text-[26px] font-semibold leading-8 tracking-tight text-foreground">{fmtDateTitle(day)}</h1>
          <span className="text-sm text-muted-foreground">
            Focus {fmtMinutes(totals.focus)} · Leisure {fmtMinutes(totals.fun)}
            {pendingCount > 0 && <span className="text-destructive"> · {pendingCount} to confirm</span>}
          </span>
        </div>
      </header>

      <div className="day-cols">
        <SideDay date={prevKey} todayKey={todayKey} nowMin={nowMin} side="prev" onClick={() => onChangeDate(prevKey)} />
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
            <div className="shrink-0 pt-1">
              <ExpandableActionBar size="md" items={actions} />
            </div>
          )}
        </div>
        <SideDay date={nextKey} todayKey={todayKey} nowMin={nowMin} side="next" onClick={() => onChangeDate(nextKey)} />
      </div>

      <NewBlockDialog draft={draft} others={timed} onClose={() => setDraft(null)} onDelete={(b) => void remove(b)} />
      <BackfillDialog draft={backfill} onClose={() => setBackfill(null)} onDelete={(b) => void remove(b)} />
      <AdjustDialog block={adjusting} onClose={() => setAdjusting(null)} />
      <AnimatedToastStack toasts={toasts} onDismiss={dismissToast} position="bottom-center" />
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

  // 打开今天时把"现在"滚到视野中间；别的日子滚到第一个块
  const nowRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = (nowRef.current ?? axisRef.current?.querySelector<HTMLElement>('.blk')) as HTMLElement | null;
    const scroller = axisRef.current?.closest<HTMLElement>('.day-scroll');
    if (!target || !scroller) return;
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday]);

  return (
    <div className="flex flex-col gap-6">
      <div className="tl-axis" ref={axisRef} style={{ height: (hours.length - 1) * HOUR_PX + 1 }}>
        {hours.map((h, i) => (
          <div key={h} className="tl-hour" style={{ top: i * HOUR_PX }}>
            <span className="tl-hour-label">{String(h).padStart(2, '0')}:00</span>
            {i < hours.length - 1 && (
              <button
                type="button"
                className="tl-slot group"
                aria-label={`${h}:00 ${isPast ? 'log time' : 'new block'}`}
                onClick={() => onSlot(h * 60)}
              >
                {/* 悬停空白时段时出现的加号，代替说明文字 */}
                <span className="tl-slot-plus">
                  <Plus size={12} />
                </span>
              </button>
            )}
          </div>
        ))}

        {layoutLanes(timed).map(({ block: b, lane, lanes }) => (
          <Block
            key={b.id}
            block={b}
            status={displayStatus(b, todayKey, nowMin)}
            running={isToday && b.status === 'planned' && b.startMin! <= nowMin && nowMin < b.endMin!}
            nowMin={nowMin}
            top={y(b.startMin!) + BLOCK_GAP / 2}
            height={Math.max(20, y(b.endMin!) - y(b.startMin!) - BLOCK_GAP)}
            lane={lane}
            lanes={lanes}
            others={timed}
            onOpen={onOpen}
            onAdjust={onAdjust}
          />
        ))}

        {showNow && (
          <div className="tl-now" ref={nowRef} style={{ top: y(nowMin) }}>
            <AnimatedBadge
              status="danger"
              size="sm"
              showIcon={false}
              className="tl-now-badge border-destructive bg-destructive font-semibold text-background"
              contentKey={fmtHm(nowMin)}
            >
              Now {fmtHm(nowMin)}
            </AnimatedBadge>
          </div>
        )}
      </div>

      {untimed.length > 0 && (
        <div className="ml-[52px] flex flex-col gap-2">
          {untimed.map((b) => (
            <button
              key={b.id}
              type="button"
              className="blk w-full rounded-xl border border-border bg-card px-4 py-3 text-left"
              onClick={() => onOpen(b)}
            >
              <BlockRow block={b} status={b.status} description={`Logged ${fmtMinutes(b.actualMin ?? b.plannedMin)} · ${kindLabel(b)}`} />
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

const DRAG_SNAP = 5; // 拖动吸附 5 分钟，跟排计划的最小单位一致
const DRAG_DEAD = 4; // 指针挪不到 4px 算点击，不算拖

/**
 * 时间轴上的块 = BlockRow 放进一个绝对定位的卡片。
 * ≥ 64px（≥ 1h20）完整一行（标记盒 + 两行文字）；44px（1h）去掉标记盒和描述；更矮就单行小字。
 * 拖动整块上下移：按住拖 → 跟着指针走（吸附 5 分钟）→ 松手落库；跟别的块重叠就弹回去。
 */
function Block({
  block: b,
  status,
  running,
  nowMin,
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
  running: boolean;
  nowMin: number;
  top: number;
  height: number;
  lane: number;
  lanes: number;
  others: TimeBlock[];
  onOpen: (b: TimeBlock) => void;
  onAdjust: (b: TimeBlock) => void;
}) {
  const density = height >= 64 ? 'full' : height >= 36 ? 'one' : 'tight';
  const w = 100 / lanes;
  const duration = b.endMin! - b.startMin!;
  const progress = running ? Math.round(((nowMin - b.startMin!) / duration) * 100) : undefined;

  const drag = useRef<{ y0: number } | null>(null);
  const [offset, setOffset] = useState<number | null>(null);
  const clampStart = (start: number) => Math.max(0, Math.min(24 * 60 - duration, start));
  const snapped = (dy: number) =>
    clampStart(b.startMin! + Math.round(((dy / HOUR_PX) * 60) / DRAG_SNAP) * DRAG_SNAP) - b.startMin!;
  const clashes = (start: number) =>
    others.some((o) => o.id !== b.id && o.startMin! < start + duration && o.endMin! > start);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    drag.current = { y0: e.clientY };
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
      onOpen(b);
      return;
    }
    const next = b.startMin! + offset;
    setOffset(null);
    if (offset !== 0 && !clashes(next)) void store.patch(b.id, { startMin: next, endMin: next + duration });
  };

  const shownStart = b.startMin! + (offset ?? 0);
  const range = `${fmtHm(shownStart)}–${fmtHm(shownStart + duration)}`;
  const dragging = offset !== null;
  const bad = dragging && clashes(shownStart);

  const trailing =
    status === 'pending' ? (
      <PendingActions block={b} onAdjust={onAdjust} compact={density !== 'full'} />
    ) : running && progress !== undefined ? (
      <AnimatedBadge status="warning" size="sm" showIcon={false} contentKey={progress}>
        Now · {progress}%
      </AnimatedBadge>
    ) : (
      <StatusBadge status={status} />
    );

  return (
    <div
      className={cn(
        'blk absolute z-[2] cursor-grab overflow-hidden rounded-xl border border-border bg-card',
        density === 'full' ? 'px-4 py-3' : density === 'one' ? 'px-4 py-2' : 'px-3 py-0.5',
        dragging && 'z-[5] cursor-grabbing shadow-2xl',
        bad && 'border-destructive bg-destructive/10',
      )}
      role="button"
      tabIndex={0}
      style={{
        top: top + ((offset ?? 0) / 60) * HOUR_PX,
        height,
        left: `calc(${lane * w}% + 6px)`,
        width: `calc(${w}% - ${lanes > 1 ? 10 : 6}px)`,
        touchAction: 'none',
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
      {density === 'tight' ? (
        <div className="flex h-full items-center gap-2 text-xs">
          <span className={cn('truncate', status === 'skipped' && 'line-through text-muted-foreground')}>{blockTitle(b)}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">{range}</span>
        </div>
      ) : (
        <BlockRow
          block={b}
          status={status}
          running={running}
          progress={progress}
          compact={density === 'one'}
          description={`${range} · ${kindLabel(b)}${
            status === 'confirmed' && b.actualMin !== null && b.actualMin !== b.plannedMin ? ` · actual ${fmtMinutes(b.actualMin)}` : ''
          }${b.steps.length ? ` · ${b.steps.filter((s) => s.done).length}/${b.steps.length} steps` : ''}`}
          trailing={trailing}
        />
      )}
    </div>
  );
}

/** 待确认块的三个操作：确认（按计划时长计入）/ 改时长 / 跳过（不计入）。常显；矮块只留图标。 */
function PendingActions({ block: b, onAdjust, compact }: { block: TimeBlock; onAdjust: (b: TimeBlock) => void; compact?: boolean }) {
  const stop = (e: MouseEvent) => e.stopPropagation();
  const cls = compact ? 'h-7 w-7' : 'h-7 px-2.5 text-[11px]';
  const size = compact ? 'icon' : 'sm';
  return (
    <span className="inline-flex gap-1" onClick={stop}>
      <Button
        variant="secondary"
        size={size}
        className={cn(cls, 'rounded-full')}
        title={`Confirm — counts the planned ${fmtMinutes(b.plannedMin)}`}
        aria-label="Confirm"
        onClick={() => void store.patch(b.id, { status: 'confirmed', actualMin: b.plannedMin })}
      >
        <Check size={12} />
        {!compact && 'Confirm'}
      </Button>
      <Button variant="secondary" size={size} className={cn(cls, 'rounded-full')} title="Set the actual duration" aria-label="Adjust" onClick={() => onAdjust(b)}>
        <Timer size={12} />
        {!compact && 'Adjust'}
      </Button>
      <Button
        variant="secondary"
        size={size}
        className={cn(cls, 'rounded-full')}
        title="Didn’t happen — not counted"
        aria-label="Skip"
        onClick={() => void store.patch(b.id, { status: 'skipped', actualMin: null })}
      >
        <SkipForward size={12} />
        {!compact && 'Skip'}
      </Button>
    </span>
  );
}

/* ------------------------------------------------------------------ 侧栏：前一天 / 后一天 */

function SideDay({
  date,
  todayKey,
  nowMin,
  side,
  onClick,
}: {
  date: DayKey;
  todayKey: DayKey;
  nowMin: number;
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
    <button
      type="button"
      className={cn('side group flex min-h-0 flex-col gap-2 overflow-hidden text-left', side === 'prev' ? 'pr-6' : 'pl-6')}
      onClick={onClick}
    >
      <div className={cn('mb-1 text-xs text-muted-foreground group-hover:text-foreground', side === 'next' && 'text-right')}>
        {side === 'prev' ? `‹ ${label}` : `${label} ›`}
      </div>
      {blocks.length === 0 ? (
        <div className={cn('text-xs text-muted-foreground/50', side === 'next' && 'text-right')}>Nothing planned</div>
      ) : (
        <ul className="flex flex-col gap-2 opacity-70 transition-opacity group-hover:opacity-100">
          {blocks.slice(0, 7).map((b) => {
            const st = displayStatus(b, todayKey, nowMin);
            return (
              <li key={b.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2">
                <MarkBox kind={b.kind} status={st} size={28} />
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-sm', (st === 'confirmed' || st === 'skipped') && 'text-muted-foreground', st === 'skipped' && 'line-through')}>
                    {blockTitle(b)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {b.startMin === null ? `Logged ${fmtMinutes(b.actualMin ?? b.plannedMin)}` : `${fmtHm(b.startMin)}–${fmtHm(b.endMin!)}`} · {kindLabel(b)}
                  </div>
                </div>
              </li>
            );
          })}
          {blocks.length > 7 && <li className="px-3 text-xs text-muted-foreground">+{blocks.length - 7} more</li>}
        </ul>
      )}
    </button>
  );
}
