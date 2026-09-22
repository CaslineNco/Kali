import { useState } from 'react';
import { Button } from '@/components/motion/button/base';
import { Dialog } from '@/components/ui/Dialog';
import { DurationDial } from '@/components/ui/DurationDial';
import { blocks } from '@/data/store';
import type { TimeBlock } from '@/data/types';
import { fmtHm, fmtMinutes } from '@/lib/date';
import { useT } from '@/lib/i18n';

/** 改时长：到点的计划块实际做了多久，保存即「已确认」并按实际时长计入。 */
export function AdjustDialog({ block, onClose }: { block: TimeBlock | null; onClose: () => void }) {
  const { t } = useT();
  return (
    <Dialog open={block !== null} onClose={onClose} title={t.howLong}>
      {block && <AdjustForm block={block} onClose={onClose} />}
    </Dialog>
  );
}

function AdjustForm({ block, onClose }: { block: TimeBlock; onClose: () => void }) {
  const { t } = useT();
  const [minutes, setMinutes] = useState(block.actualMin ?? block.plannedMin);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await blocks.patch(block.id, { status: 'confirmed', actualMin: minutes });
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
      <p className="text-xs text-muted-foreground">
        {block.startMin !== null && block.endMin !== null ? `${fmtHm(block.startMin)}–${fmtHm(block.endMin)} · ` : ''}
        {t.plannedFor} {fmtMinutes(block.plannedMin)}
        {block.note ? ` · ${block.note}` : ''}
      </p>
      <DurationDial value={minutes} onChange={setMinutes} />
      <p className="text-xs text-muted-foreground">{t.adjustHint}</p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t.cancel}
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={saving || minutes < 1}>
          {t.confirm}
        </Button>
      </div>
    </form>
  );
}
