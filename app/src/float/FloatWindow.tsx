import { emit } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock3, ExternalLink, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react';
import { TAB, useDock } from './useDock';
import { useEffect, useMemo, useState } from 'react';
import type { TodoItemStatus } from '@/components/agents/todo-list';
import { MarkBox } from '@/components/day/BlockRow';
import { SwipeableList, type SwipeAction, type SwipeableListItem } from '@/components/motion/swipeable-list';
import { blocks as store, useBlocksOfDay } from '@/data/store';
import { displayStatus, type TimeBlock } from '@/data/types';
import { fmtHm, fmtMinutes, nowMinutes, toKey } from '@/lib/date';
import './float.css';

/**
 * Always-on-top desktop widget (PRD 9.3). Built straight on beui's Swipeable List,
 * using its own card / header / footer markup from the component preview, with the
 * Todo List status mark as each row's leading icon. Read + confirm only; no planning here.
 */

const kindLabel = (b: TimeBlock) => (b.kind === 'focus' ? 'Focus' : 'Leisure');

/** Tick every 15s so the clock in the header and the in-progress percentage keep moving. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Same mapping as the beui demo: swipe right reveals the left rail (Done), swipe left reveals the right rail (Later / Trash).
const doneAction: SwipeAction = { id: 'confirm', label: 'Done', icon: <Check className="h-4 w-4" />, tone: 'success' };
const skipAction: SwipeAction = { id: 'skip', label: 'Skip', icon: <Clock3 className="h-4 w-4" />, tone: 'warning' };
const trashAction: SwipeAction = { id: 'trash', label: 'Trash', icon: <Trash2 className="h-4 w-4" />, tone: 'danger' };
const resetAction: SwipeAction = { id: 'reset', label: 'Reset', icon: <RotateCcw className="h-4 w-4" />, tone: 'neutral' };

export function FloatWindow() {
  const now = useNow();
  const todayKey = toKey(now);
  const nowMin = nowMinutes(now);
  const blocks = useBlocksOfDay(todayKey);

  // Only scheduled blocks are listed; backfills are not "plans".
  const rows = useMemo(
    () =>
      blocks
        .filter((b) => b.startMin !== null && b.endMin !== null)
        .map((b) => {
          const st = displayStatus(b, todayKey, nowMin);
          const running = st === 'planned' && b.startMin! <= nowMin && nowMin < b.endMin!;
          const progress = running
            ? Math.round(((nowMin - b.startMin!) / (b.endMin! - b.startMin!)) * 100)
            : undefined;
          const status: TodoItemStatus =
            st === 'confirmed' ? 'completed' : st === 'skipped' ? 'cancelled' : running ? 'in-progress' : 'pending';
          // Every row swipes: open rows get Confirm / Skip, settled rows get Reset (back to planned).
          const actionable = running || st === 'pending';
          return { b, st, running, progress, status, actionable };
        }),
    [blocks, todayKey, nowMin],
  );

  const done = rows.filter((r) => r.st === 'confirmed').length;
  const open = rows.filter((r) => r.st === 'planned' || r.st === 'pending').length;
  const sum = (kind: TimeBlock['kind']) =>
    blocks.reduce((t, b) => t + (b.status === 'confirmed' && b.kind === kind ? (b.actualMin ?? b.plannedMin) : 0), 0);
  const focusMin = sum('focus');
  const funMin = sum('fun');

  const items: SwipeableListItem[] = rows.map(({ b, st, running, progress, status, actionable }) => ({
    id: b.id,
    // Done only once the block has started — crediting focus that hasn't happened is the one thing the wall must never do
    leftActions: st === 'confirmed' || st === 'skipped' ? [resetAction] : actionable ? [doneAction] : [],
    rightActions: st === 'confirmed' || st === 'skipped' ? [trashAction] : [skipAction, trashAction],
    leading: <MarkBox kind={b.kind} status={st} running={running} progress={progress} />,
    title: (
      <span
        className={
          status === 'completed'
            ? 'text-muted-foreground'
            : status === 'cancelled'
              ? 'text-muted-foreground line-through'
              : undefined
        }
      >
        {b.note || kindLabel(b)}
      </span>
    ),
    description: `${fmtHm(b.startMin!)}–${fmtHm(b.endMin!)} · ${kindLabel(b)}${
      running ? ' · In progress' : st === 'pending' ? ' · Due' : st === 'planned' ? ' · Planned' : ''
    }`,
    // meta like the demo: a time on the right; "Now" while running, "Due" once it has ended unconfirmed
    meta:
      running && progress !== undefined ? (
        <span className="text-amber-400 tabular-nums">Now · {progress}%</span>
      ) : st === 'pending' ? (
        <span className="text-destructive">Due</span>
      ) : (
        fmtHm(b.startMin!)
      ),
  }));

  // Trash → 6s undo strip (same rule as the main window: no silent deletes)
  const [undo, setUndo] = useState<{ block: TimeBlock; timer: number } | null>(null);
  const trash = async (b: TimeBlock) => {
    if (undo) window.clearTimeout(undo.timer);
    await store.remove(b.id);
    setUndo({ block: b, timer: window.setTimeout(() => setUndo(null), 6000) });
  };
  const restore = async () => {
    if (!undo) return;
    window.clearTimeout(undo.timer);
    await store.restore(undo.block.id);
    setUndo(null);
  };

  const openDay = async () => {
    await emit('kali:open-day', todayKey);
    const main = await WebviewWindow.getByLabel('main');
    if (main) {
      await main.show();
      await main.unminimize();
      await main.setFocus();
    }
  };

  // Header: "Today · 08:42" and a one-line tally of done / left
  const clock = fmtHm(nowMin);

  // 什么算"有事"：正在进行、到点没处理、或 10 分钟内要开始
  const attention = rows.some(
    (r) => r.actionable || (r.st === 'planned' && r.b.startMin! - nowMin >= 0 && r.b.startMin! - nowMin <= 10),
  );
  const dock = useDock(attention);
  const next = rows.find((r) => r.st === 'planned' && r.b.startMin! > nowMin);
  const tally = rows.length === 0 ? 'Nothing planned yet' : `${done} done · ${open} left`;

  return (
    <div className="flex h-screen w-full items-stretch" onPointerEnter={dock.onEnter} onPointerLeave={dock.onLeave}>
      {/* 收边时只露这条把手：竖排的"Today · 2 left"，有事时变琥珀 */}
      <button
        type="button"
        aria-label="Show today"
        onClick={dock.expand}
        className={`flex shrink-0 items-center justify-center self-center rounded-l-2xl border border-r-0 text-[11px] font-semibold tracking-wide transition-opacity ${
          dock.docked ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${attention ? 'border-amber/60 bg-amber/15 text-amber' : 'border-border bg-card text-muted-foreground'}`}
        style={{ width: TAB, height: 180, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {open > 0 ? `${open} left` : 'Today'}
        {next ? ` · ${fmtHm(next.b.startMin!)}` : ''}
      </button>
      {/* beui preview card, verbatim: rounded-[2rem] shell, header row, list, footer row */}
      <div
        className={`flex min-w-0 flex-1 flex-col rounded-[2rem] border border-border bg-background p-3 shadow-2xl transition-opacity ${
          dock.docked ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="mb-3 flex items-center justify-between px-1" data-tauri-drag-region>
          <div data-tauri-drag-region>
            <p className="text-sm font-semibold text-foreground" data-tauri-drag-region>
              Today · <span className="tabular-nums">{clock}</span>
            </p>
            <p className="text-xs text-muted-foreground" data-tauri-drag-region>
              {tally}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={dock.pinned ? 'Unpin (auto-hide at the edge)' : 'Pin (stay open)'}
              title={dock.pinned ? 'Unpin — hides at the edge when idle' : 'Pin — stays open'}
              onClick={() => dock.setPinned(!dock.pinned)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              {dock.pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => void openDay()}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </button>
          </div>
        </div>

        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-1 py-6 text-xs text-muted-foreground">Plan your day in the main window.</p>
          ) : (
            <SwipeableList
              items={items}
              onAction={({ item, action }) => {
                const b = store.get(item.id);
                if (!b) return;
                if (action.id === 'confirm') void store.patch(b.id, { status: 'confirmed', actualMin: b.plannedMin });
                if (action.id === 'skip') void store.patch(b.id, { status: 'skipped', actualMin: null });
                if (action.id === 'reset') void store.patch(b.id, { status: 'planned', actualMin: null });
                if (action.id === 'trash') void trash(b);
              }}
            />
          )}
        </div>

        <div
          className="mt-3 flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground"
          data-tauri-drag-region
        >
          <AnimatePresence mode="wait" initial={false}>
            {undo ? (
              <motion.span
                key="undo"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                Deleted “{undo.block.note || kindLabel(undo.block)}”
                <button type="button" className="font-semibold text-amber-400" onClick={() => void restore()}>
                  Undo
                </button>
              </motion.span>
            ) : (
              <motion.span key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-tauri-drag-region>
                {rows.some((r) => r.actionable) ? 'Swipe right → done · left → skip' : `${rows.length} planned`}
              </motion.span>
            )}
          </AnimatePresence>
          <span data-tauri-drag-region>
            Focus {fmtMinutes(focusMin)} · Leisure {fmtMinutes(funMin)}
          </span>
        </div>
      </div>
    </div>
  );
}
