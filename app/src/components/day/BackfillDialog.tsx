import { useState } from 'react';
import { Dialog, KindToggle } from '@/components/ui/Dialog';
import { DurationDial } from '@/components/ui/DurationDial';
import { blocks } from '@/data/store';
import type { BlockKind, TimeBlock } from '@/data/types';
import { toKey, type DayKey } from '@/lib/date';

export interface BackfillDraft {
  date: DayKey;
  /** 编辑已有的补记 */
  existing?: TimeBlock;
}

/** 补记：事后直接记一段已经发生的时长，保存即「已确认」。 */
export function BackfillDialog({
  draft,
  onClose,
  onDelete,
}: {
  draft: BackfillDraft | null;
  onClose: () => void;
  onDelete?: (b: TimeBlock) => void;
}) {
  return (
    <Dialog open={draft !== null} onClose={onClose} title={draft?.existing ? 'Edit log' : 'Log time'}>
      {draft && <BackfillForm draft={draft} onClose={onClose} onDelete={onDelete} />}
    </Dialog>
  );
}

function BackfillForm({
  draft,
  onClose,
  onDelete,
}: {
  draft: BackfillDraft;
  onClose: () => void;
  onDelete?: (b: TimeBlock) => void;
}) {
  const ex = draft.existing;
  const [day, setDay] = useState<DayKey>(ex?.date ?? draft.date);
  const [kind, setKind] = useState<BlockKind>(ex?.kind ?? 'focus');
  const [minutes, setMinutes] = useState(ex?.actualMin ?? ex?.plannedMin ?? 45);
  const [note, setNote] = useState(ex?.note ?? '');
  const [saving, setSaving] = useState(false);

  const today = toKey(new Date());
  const valid = day <= today && minutes > 0;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      if (ex) {
        await blocks.patch(ex.id, { date: day, kind, plannedMin: minutes, actualMin: minutes, note });
      } else {
        await blocks.add({ date: day, kind, startMin: null, endMin: null, plannedMin: minutes, status: 'confirmed', note });
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
      <div className="form-row">
        <label className="field">
          <span>Date</span>
          <input type="date" value={day} max={today} onChange={(ev) => setDay(ev.target.value)} required />
        </label>
        <KindToggle value={kind} onChange={setKind} />
      </div>
      <DurationDial value={minutes} onChange={setMinutes} />
      <label className="field">
        <span>What (optional)</span>
        <input
          type="text"
          placeholder="e.g. Reading"
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          maxLength={80}
        />
      </label>
      {!ex && <p className="form-hint">Logs time after the fact — skips planning and confirmation, counts immediately.</p>}
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
        <button type="submit" className="btn btn-primary" disabled={!valid || saving}>
          Save
        </button>
      </div>
    </form>
  );
}
