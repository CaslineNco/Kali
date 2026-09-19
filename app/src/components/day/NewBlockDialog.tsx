import { useState } from 'react';
import { Button } from '@/components/motion/button/base';
import { Input } from '@/components/motion/input';
import { Dialog, KindToggle } from '@/components/ui/Dialog';
import { DurationDial, TimeSteppers } from '@/components/ui/DurationDial';
import { blocks } from '@/data/store';
import type { BlockKind, Step, TimeBlock } from '@/data/types';
import { fmtDateShort, fmtHm, fromKey, type DayKey } from '@/lib/date';
import { StepsEditor } from './StepsEditor';

export interface NewBlockDraft {
  date: DayKey;
  /** 点空白时段进来时预填的开始分钟数 */
  startMin?: number;
  /** 编辑已有的块 */
  existing?: TimeBlock;
}

const DAY_END = 24 * 60; // 结束最晚 24:00
const DIAL_MAX = 8 * 60; // 圆盘一圈 = 8 小时
const STEP = 5; // 排计划的最小单位：5 分钟

/** 新建 / 编辑时间块：排一个计划。新建保存后状态「计划中」；编辑不改状态。 */
export function NewBlockDialog({
  draft,
  others,
  onClose,
  onDelete,
}: {
  draft: NewBlockDraft | null;
  /** 当天其它有起止时间的块，用来查重叠 */
  others: TimeBlock[];
  onClose: () => void;
  onDelete?: (b: TimeBlock) => void;
}) {
  return (
    <Dialog open={draft !== null} onClose={onClose} title={draft?.existing ? 'Edit block' : 'New block'}>
      {/* 表单随浮层一起挂载/卸载，每次打开都是干净的初始值 */}
      {draft && <NewBlockForm draft={draft} others={others} onClose={onClose} onDelete={onDelete} />}
    </Dialog>
  );
}

function NewBlockForm({
  draft,
  others,
  onClose,
  onDelete,
}: {
  draft: NewBlockDraft;
  others: TimeBlock[];
  onClose: () => void;
  onDelete?: (b: TimeBlock) => void;
}) {
  const ex = draft.existing;
  const snap = (v: number) => Math.round(v / STEP) * STEP;
  // 新建才吸附到 5 分钟；编辑保留原值，免得只改个备注就把块挪了
  const initStart = ex?.startMin ?? snap(draft.startMin ?? 9 * 60);
  const [kind, setKind] = useState<BlockKind>(ex?.kind ?? 'focus');
  // 只填两样：几点开始、做多久；结束时间算出来给人看
  const [start, setStart] = useState(initStart);
  const [duration, setDuration] = useState(
    ex && ex.endMin !== null && ex.startMin !== null ? Math.max(1, ex.endMin - ex.startMin) : 60,
  );
  const end = start + duration;
  const [note, setNote] = useState(ex?.note ?? '');
  const [steps, setSteps] = useState<Step[]>(ex?.steps ?? []);
  const [saving, setSaving] = useState(false);

  // 时间块不跨天：结束不能超过当天末尾
  const valid = duration > 0 && end <= DAY_END;
  // 不允许跟同一天别的块重叠——重叠的专注时长会被重复计入格子颜色
  const clash = others.find(
    (o) => o.id !== ex?.id && o.startMin !== null && o.endMin !== null && o.startMin < end && o.endMin > start,
  );

  const save = async () => {
    if (!valid || clash) return;
    setSaving(true);
    try {
      if (ex) {
        await blocks.patch(ex.id, { kind, startMin: start, endMin: end, plannedMin: duration, note, steps });
      } else {
        await blocks.add({ date: draft.date, kind, startMin: start, endMin: end, plannedMin: duration, note, steps });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const warning = !valid
    ? 'Runs past midnight — start earlier or shorten it.'
    : clash
      ? `Overlaps “${clash.note || (clash.kind === 'focus' ? 'Focus' : 'Leisure')} ${fmtHm(clash.startMin!)}–${fmtHm(clash.endMin!)}” — adjust the time.`
      : null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        void save();
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{fmtDateShort(fromKey(draft.date))}</span>
        <KindToggle value={kind} onChange={setKind} />
      </div>
      <TimeSteppers label="Start" value={start} step={STEP} onChange={setStart} />
      <DurationDial value={duration} max={DIAL_MAX} step={STEP} size={176} onChange={setDuration} />
      <div className="flex items-baseline gap-2.5">
        <span className="text-xs text-muted-foreground">Ends</span>
        <span className="text-lg font-semibold tabular-nums text-foreground">{fmtHm(Math.min(end, DAY_END))}</span>
      </div>
      {warning && <p className="text-xs text-destructive">{warning}</p>}
      <Input label="What (optional)" placeholder="e.g. Write the proposal" value={note} onChange={setNote} maxLength={80} />
      <StepsEditor steps={steps} onChange={setSteps} />
      {!ex && <p className="text-xs text-muted-foreground">Saved as planned — you’ll be asked to confirm when it ends.</p>}
      <div className="flex items-center gap-2 pt-1">
        {ex && onDelete && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hover:border-destructive hover:text-destructive"
            onClick={() => {
              onDelete(ex);
              onClose();
            }}
          >
            Delete
          </Button>
        )}
        <span className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={!valid || !!clash || saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
