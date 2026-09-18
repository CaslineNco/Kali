import type { DayKey } from '@/lib/date';

export type BlockKind = 'focus' | 'fun';

/**
 * 存库里的状态只有三种。
 * 「待确认」不存：计划中的块一到结束时间就算待确认，由 `displayStatus` 现算，
 * 这样不需要后台定时器去改状态。
 */
export type BlockStatus = 'planned' | 'confirmed' | 'skipped';

export type DisplayStatus = BlockStatus | 'pending';

/** 拆解步骤里的一步 */
export interface Step {
  text: string;
  done: boolean;
}

export interface TimeBlock {
  id: string;
  date: DayKey;
  kind: BlockKind;
  /** 距当天 00:00 的分钟数；补记的块没有起止时间 */
  startMin: number | null;
  endMin: number | null;
  plannedMin: number;
  /** 确认时填入，可能跟 plannedMin 不同（改过时长） */
  actualMin: number | null;
  status: BlockStatus;
  note: string;
  /** 拆解步骤（可为空数组）——不影响时长和格子颜色，只是"怎么开始"的清单 */
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}

/** 某一天的汇总：已确认的专注/娱乐各多少分钟。 */
export interface DaySummary {
  focus: number;
  fun: number;
}

/** 已确认的块计入多少分钟 */
export function creditedMinutes(b: TimeBlock): number {
  return b.status === 'confirmed' ? (b.actualMin ?? b.plannedMin) : 0;
}

/** 计划块过了结束时间就是待确认。`nowMin` = 现在距当天 00:00 的分钟数，`todayKey` = 今天。 */
export function displayStatus(b: TimeBlock, todayKey: DayKey, nowMin: number): DisplayStatus {
  if (b.status !== 'planned') return b.status;
  if (b.date < todayKey) return 'pending';
  if (b.date === todayKey && b.endMin !== null && b.endMin <= nowMin) return 'pending';
  return 'planned';
}
