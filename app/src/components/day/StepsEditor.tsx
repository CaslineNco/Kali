import { Plus, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useSetting } from '@/data/store';
import type { Step } from '@/data/types';
import { AiError, API_KEY_SETTING, breakDown, type BreakdownInput } from '@/lib/ai';

/**
 * 拆解步骤清单：手写为底线，填了 API key 才出现「Break it down」。
 * 勾选只是给自己看的进度，不影响时长、不影响格子颜色。
 */
export function StepsEditor({
  steps,
  onChange,
  context,
}: {
  steps: Step[];
  onChange: (steps: Step[]) => void;
  /** 给 AI 的上下文：标题、类型、时长 */
  context: Omit<BreakdownInput, 'existing'>;
}) {
  const apiKey = useSetting(API_KEY_SETTING);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...steps, { text, done: false }]);
    setDraft('');
  };
  const update = (i: number, patch: Partial<Step>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(steps.filter((_, j) => j !== i));

  const generate = async () => {
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    try {
      const texts = await breakDown(apiKey, { ...context, existing: steps.map((s) => s.text) });
      // 保留已经勾掉的那几步，其余用新生成的替换
      const kept = steps.filter((s) => s.done);
      onChange([...kept, ...texts.filter((t) => !kept.some((k) => k.text === t)).map((text) => ({ text, done: false }))]);
    } catch (err) {
      setError(err instanceof AiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const done = steps.filter((s) => s.done).length;

  return (
    <div className="steps">
      <div className="steps-head">
        <span className="form-muted">
          Steps{steps.length ? ` · ${done}/${steps.length}` : ''}
        </span>
        {apiKey ? (
          <button type="button" className="steps-ai" disabled={busy || !context.title.trim()} onClick={() => void generate()}>
            <Sparkles size={12} />
            {busy ? 'Thinking…' : steps.length ? 'Refine with AI' : 'Break it down'}
          </button>
        ) : (
          <span className="steps-nokey">Add an API key in Settings to break tasks down with AI</span>
        )}
      </div>
      {!context.title.trim() && apiKey && <p className="form-hint">Give the block a title first so the steps have something to work from.</p>}
      {error && <p className="form-hint form-warn">{error}</p>}
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
