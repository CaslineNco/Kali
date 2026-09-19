import type { ReactNode } from 'react';
import { TodoStatusIcon, type TodoItemStatus } from '@/components/agents/todo-list';
import { AnimatedBadge, type AnimatedBadgeStatus } from '@/components/motion/animated-badge';
import type { DisplayStatus, TimeBlock } from '@/data/types';
import { cn } from '@/lib/utils';

/**
 * 全 App 唯一的一种"时间块长相"（跟悬浮窗的 Swipeable List 行完全一致）：
 *   [40×40 状态标记盒] 标题（14/medium） + 描述（12/muted） ……… 右侧徽章
 * 类型只体现在标记盒的颜色（专注琥珀 / 娱乐青灰），状态只体现在徽章。
 * 表面统一 rounded-xl border-border bg-card；不再有实心/虚线/淡色的变体。
 */

export const kindLabel = (b: Pick<TimeBlock, 'kind'>) => (b.kind === 'focus' ? 'Focus' : 'Leisure');
export const blockTitle = (b: Pick<TimeBlock, 'kind' | 'note'>) => b.note || kindLabel(b);

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  planned: 'Planned',
  pending: 'Confirm?',
  confirmed: 'Confirmed',
  skipped: 'Skipped',
};

export const BADGE_STATUS: Record<DisplayStatus, AnimatedBadgeStatus> = {
  planned: 'neutral',
  pending: 'danger',
  confirmed: 'success',
  skipped: 'neutral',
};

export function markStatus(status: DisplayStatus, running = false): TodoItemStatus {
  if (status === 'confirmed') return 'completed';
  if (status === 'skipped') return 'cancelled';
  return running ? 'in-progress' : 'pending';
}

/** 状态标记盒：Swipeable List 示例的 leading，里面是 Todo List 的状态图标 */
export function MarkBox({
  kind,
  status,
  running,
  progress,
  size = 40,
}: {
  kind: TimeBlock['kind'];
  status: DisplayStatus;
  running?: boolean;
  progress?: number;
  size?: number;
}) {
  const s = markStatus(status, running);
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-xl border border-border bg-background',
        status === 'skipped' ? 'text-muted-foreground' : kind === 'focus' ? 'text-amber' : 'text-teal',
      )}
      style={{ width: size, height: size }}
    >
      <TodoStatusIcon status={s} progress={progress} />
    </div>
  );
}

export function StatusBadge({ status, children }: { status: DisplayStatus; children?: ReactNode }) {
  return (
    <AnimatedBadge status={BADGE_STATUS[status]} size="sm" showIcon={false} contentKey={status}>
      {children ?? STATUS_LABEL[status]}
    </AnimatedBadge>
  );
}

/**
 * 一行。`compact` 去掉标记盒和描述（给 1 小时以内的时间轴块用）。
 */
export function BlockRow({
  block,
  status,
  description,
  running,
  progress,
  trailing,
  compact = false,
  className,
}: {
  block: TimeBlock;
  status: DisplayStatus;
  description: string;
  running?: boolean;
  progress?: number;
  /** 右侧：默认是状态徽章 */
  trailing?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {!compact && <MarkBox kind={block.kind} status={status} running={running} progress={progress} />}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm font-medium text-foreground',
            (status === 'confirmed' || status === 'skipped') && 'text-muted-foreground',
            status === 'skipped' && 'line-through',
          )}
        >
          {blockTitle(block)}
          {compact && <span className="font-normal text-muted-foreground"> · {description}</span>}
        </div>
        {!compact && <div className="mt-0.5 truncate text-xs text-muted-foreground">{description}</div>}
      </div>
      <div className="shrink-0">{trailing ?? <StatusBadge status={status} />}</div>
    </div>
  );
}
