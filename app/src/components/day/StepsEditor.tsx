import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/motion/button/base';
import { Checkbox } from '@/components/motion/checkbox';
import { Input } from '@/components/motion/input';
import type { Step } from '@/data/types';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * 拆解步骤清单：手写"第一步做什么"，勾一步是一步。
 * 只是给自己看的进度，不影响时长、不影响格子颜色。
 */
export function StepsEditor({ steps, onChange }: { steps: Step[]; onChange: (steps: Step[]) => void }) {
  const { t } = useT();
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
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{t.stepsLabel}{steps.length ? ` · ${done}/${steps.length}` : ''}</span>
      {steps.length > 0 && (
        <ol className="flex flex-col gap-1">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <Checkbox checked={s.done} onCheckedChange={(v) => update(i, { done: v })} aria-label={`Step ${i + 1} done`} />
              <input
                type="text"
                className={cn(
                  'min-w-0 flex-1 border-0 border-b border-transparent bg-transparent py-1 text-sm text-foreground outline-none focus:border-border',
                  s.done && 'text-muted-foreground line-through',
                )}
                value={s.text}
                onChange={(e) => update(i, { text: e.target.value })}
                maxLength={120}
              />
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={t.removeStep} onClick={() => remove(i)}>
                <X size={12} />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-center gap-2">
        <Input
          placeholder={steps.length ? t.stepAnother : t.stepFirst}
          value={draft}
          onChange={setDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          maxLength={120}
          className="flex-1"
        />
        <Button type="button" variant="secondary" size="icon" aria-label={t.addStep} onClick={add} disabled={!draft.trim()}>
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}
