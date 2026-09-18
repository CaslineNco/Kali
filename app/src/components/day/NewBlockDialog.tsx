import { useState } from 'react';
import { Dialog, KindToggle } from '@/components/ui/Dialog';
import { DurationDial, TimeSteppers } from '@/components/ui/DurationDial';
import { blocks } from '@/data/store';
import type { BlockKind, TimeBlock } from '@/data/types';
import { fmtDateShort, fmtHm, fromKey, type DayKey } from '@/lib/date';

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
        await blocks.patch(ex.id, { kind, startMin: start, endMin: end, plannedMin: duration, note });
      } else {
        await blocks.add({ date: draft.date, kind, startMin: start, endMin: end, plannedMin: duration, note });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="form"
      onSubmit={(ev) => {
        ev.preventDefault();
        void save();
      }}
    >
      <div className="form-muted">{fmtDateShort(fromKey(draft.date))}</div>
      <KindToggle value={kind} onChange={setKind} />
      <TimeSteppers label="Start" value={start} step={STEP} onChange={setStart} />
      <DurationDial value={duration} max={DIAL_MAX} step={STEP} onChange={setDuration} />
      <div className="form-end">
        <span className="form-muted">Ends</span>
        <span className="form-end-time">{fmtHm(Math.min(end, DAY_END))}</span>
      </div>
      {!valid && <p className="form-hint form-warn">Runs past midnight — start earlier or shorten it.</p>}
      {valid && clash && (
        <p className="form-hint form-warn">
          Overlaps “{clash.note || (clash.kind === 'focus' ? 'Focus' : 'Leisure')} {fmtHm(clash.startMin!)}–{fmtHm(clash.endMin!)}” — adjust the time
        </p>
      )}
      <label className="field">
        <span>What (optional)</span>
        <input
          type="text"
          placeholder="e.g. Write the proposal"
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          maxLength={80}
        />
      </label>
      {!ex && <p className="form-hint">Saved as planned — you’ll be asked to confirm when it ends.</p>}
      <div className="form-actions">
        {ex && onDelete && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onDelete(ex);
              onClose();
            }}
          >
            Delete
          </button>
        )}
        <span className="form-spacer" />
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!valid || !!clash || saving}>
          Save
        </button>
      </div>
    </form>
  );
}
