import { useState } from 'react';
import { Button } from '@/components/motion/button/base';
import { Input } from '@/components/motion/input';
import { Dialog, Field, KindToggle } from '@/components/ui/Dialog';
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
      className="flex flex-col gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        void save();
      }}
    >
      <div className="flex items-end justify-between gap-3">
        <Field label="Date">
          <input
            type="date"
            className="h-10 rounded-full border border-border bg-card px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [color-scheme:dark]"
            value={day}
            max={today}
            onChange={(ev) => setDay(ev.target.value)}
            required
          />
        </Field>
        <KindToggle value={kind} onChange={setKind} />
      </div>
      <DurationDial value={minutes} onChange={setMinutes} />
      <Input label="What (optional)" placeholder="e.g. Reading" value={note} onChange={setNote} maxLength={80} />
      {!ex && (
        <p className="text-xs text-muted-foreground">Logs time after the fact — skips planning and confirmation, counts immediately.</p>
      )}
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
        <Button type="submit" variant="primary" size="sm" disabled={!valid || saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
