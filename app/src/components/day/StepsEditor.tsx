import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { Step } from '@/data/types';

/**
 * 拆解步骤清单：手写"第一步做什么"，勾一步是一步。
 * 只是给自己看的进度，不影响时长、不影响格子颜色。（AI 生成先不做）
 */
export function StepsEditor({ steps, onChange }: { steps: Step[]; onChange: (steps: Step[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...steps, { text, done: false }]);
    setDraft('');
  };
  const update = (i: number, patch: Partial<Step>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(steps.filter((_, j) => j !== i));

  const done = steps.filter((s) => s.done).length;

  return (
    <div className="steps">
      <div className="steps-head">
        <span className="form-muted">
          Steps{steps.length ? ` · ${done}/${steps.length}` : ''}
        </span>
      </div>
      {steps.length > 0 && (
        <ol className="steps-list">
          {steps.map((s, i) => (
            <li key={i} className="steps-item" data-done={s.done || undefined}>
              <input type="checkbox" checked={s.done} onChange={(e) => update(i, { done: e.target.checked })} aria-label={`Step ${i + 1} done`} />
              <input
                type="text"
                className="steps-text"
                value={s.text}
                onChange={(e) => update(i, { text: e.target.value })}
                maxLength={120}
              />
              <button type="button" className="steps-x" aria-label="Remove step" onClick={() => remove(i)}>
                <X size={12} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="steps-add">
        <input
          type="text"
          placeholder={steps.length ? 'Another step…' : 'First concrete action, e.g. “Open last week’s draft”'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          maxLength={120}
        />
        <button type="button" className="steps-x" aria-label="Add step" onClick={add} disabled={!draft.trim()}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
