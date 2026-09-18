import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { DurationDial } from "@/components/ui/DurationDial";
import { blocks } from "@/data/store";
import type { TimeBlock } from "@/data/types";
import { fmtHm, fmtMinutes } from "@/lib/date";

/** 改时长：到点的计划块实际做了多久，保存即「已确认」并按实际时长计入。 */
export function AdjustDialog({ block, onClose }: { block: TimeBlock | null; onClose: () => void }) {
  return (
    <Dialog open={block !== null} onClose={onClose} title="How long did it actually take?">
      {block && <AdjustForm block={block} onClose={onClose} />}
    </Dialog>
  );
}

function AdjustForm({ block, onClose }: { block: TimeBlock; onClose: () => void }) {
  const [minutes, setMinutes] = useState(block.actualMin ?? block.plannedMin);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await blocks.patch(block.id, { status: "confirmed", actualMin: minutes });
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
      <div className="form-muted">
        {block.startMin !== null && block.endMin !== null
          ? `${fmtHm(block.startMin)}–${fmtHm(block.endMin)} · `
          : ""}
        planned {fmtMinutes(block.plannedMin)}
        {block.note ? ` · ${block.note}` : ""}
      </div>
      <DurationDial value={minutes} onChange={setMinutes} />
      <p className="form-hint">Saves as confirmed and counts this duration.</p>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || minutes < 1}>
          Confirm
        </button>
      </div>
    </form>
  );
}
