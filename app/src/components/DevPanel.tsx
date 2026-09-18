import { useState } from 'react';
import { isPersistent } from '@/data/repo';
import { blocks } from '@/data/store';
import type { TimeBlock } from '@/data/types';
import { fmtMinutes, startOfDay, toKey } from '@/lib/date';
import { makeDemoBlocks, makeTodayTestBlocks } from '@/lib/fakeData';

/**
 * 阶段 2 的验收面板：让不看代码的人也能确认"数据真的存进去、读出来了"。
 * 后面阶段接上真实界面后删掉。
 */
export function DevPanel({ year, all }: { year: number; all: TimeBlock[] }) {
  const [busy, setBusy] = useState(false);
  const today = startOfDay(new Date());
  const todayKey = toKey(today);
  const todays = all.filter((b) => b.date === todayKey);

  const run = (fn: () => Promise<unknown>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dev">
      <div className="dev-row">
        <span className="dev-tag">Dev · data</span>
        <span className="dev-muted">
          Storage: {isPersistent() ? 'SQLite (kali.db, persists)' : 'memory (browser preview, lost on reload)'} · {all.length} blocks
        </span>
      </div>
      <div className="dev-row">
        <button
          type="button"
          className="dev-btn"
          disabled={busy}
          onClick={run(() => {
            const now = new Date();
            return blocks.addMany(makeTodayTestBlocks(today, now.getHours() * 60 + now.getMinutes()));
          })}
        >
          Seed 4 test blocks today
        </button>
        <button
          type="button"
          className="dev-btn"
          disabled={busy}
          onClick={run(() => blocks.addMany(makeDemoBlocks(new Date(year, 0, 1), today)))}
        >
          Seed demo year
        </button>
        <button type="button" className="dev-btn dev-btn-danger" disabled={busy} onClick={run(() => blocks.clearAll())}>
          Clear all
        </button>
      </div>
      {todays.length > 0 && (
        <ul className="dev-list">
          {todays.map((b) => (
            <li key={b.id}>
              <span className={b.kind === 'focus' ? 'dev-focus' : 'dev-fun'}>{b.kind === 'focus' ? 'Focus' : 'Leisure'}</span>
              <span>{b.startMin === null ? 'logged' : `${hm(b.startMin)}–${hm(b.endMin ?? b.startMin)}`}</span>
              <span>{fmtMinutes(b.actualMin ?? b.plannedMin)}</span>
              <span className="dev-muted">{STATUS[b.status]}</span>
              <span className="dev-muted">{b.note}</span>
              <button type="button" className="dev-link" onClick={run(() => blocks.remove(b.id))}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const STATUS = { planned: 'planned', confirmed: 'confirmed', skipped: 'skipped' } as const;

const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
