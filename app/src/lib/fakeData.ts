import type { NewBlock } from '@/data/repo';
import { addDays, toKey } from './date';

/** 固定种子的伪随机，保证每次生成的演示数据一样，方便对照验收。 */
function noise(seed: number) {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/**
 * 生成从 `from` 到 `to`（含）的演示时间块（全部已确认），用来一眼看到整面格子墙。
 * 周末更安静，偶尔留几天完全没记录，让 5 档颜色和"0 分钟"都能看到。
 */
export function makeDemoBlocks(from: Date, to: Date): NewBlock[] {
  const out: NewBlock[] = [];
  let i = 0;
  for (let d = from; d <= to; d = addDays(d, 1), i++) {
    const date = toKey(d);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const r = noise(i);
    const skip = noise(i + 1000) < (weekend ? 0.45 : 0.12);
    // r 取 1.6 次方让分布偏低，高档位少一点，更像真实的一年
    const focus = skip ? 0 : Math.round(Math.pow(r, 1.6) * (weekend ? 180 : 360));
    const fun = Math.round(noise(i + 2000) * (weekend ? 180 : 90));

    if (focus > 0) {
      // 拆成上午一段、下午一段
      const morning = Math.min(focus, Math.round(focus * (0.4 + noise(i + 3000) * 0.3)));
      const afternoon = focus - morning;
      out.push({ date, kind: 'focus', startMin: 9 * 60, endMin: 9 * 60 + morning, plannedMin: morning, status: 'confirmed', note: 'Demo' });
      if (afternoon > 0) {
        out.push({ date, kind: 'focus', startMin: 14 * 60, endMin: 14 * 60 + afternoon, plannedMin: afternoon, status: 'confirmed', note: 'Demo' });
      }
    }
    if (fun > 0) {
      out.push({ date, kind: 'fun', startMin: 20 * 60, endMin: 20 * 60 + fun, plannedMin: fun, status: 'confirmed', note: 'Demo' });
    }
  }
  return out;
}

/** 今天的几条测试块：一条已确认专注、一条已确认娱乐、一条还没到点的计划、一条已经过点等待确认的计划。 */
export function makeTodayTestBlocks(today: Date, nowMin: number): NewBlock[] {
  const date = toKey(today);
  const past = Math.max(0, nowMin - 120);
  return [
    { date, kind: 'focus', startMin: past, endMin: past + 90, plannedMin: 90, status: 'confirmed', note: 'Test · confirmed focus 90m' },
    { date, kind: 'fun', startMin: null, endMin: null, plannedMin: 30, status: 'confirmed', note: 'Test · logged leisure 30m' },
    { date, kind: 'focus', startMin: past, endMin: past + 60, plannedMin: 60, status: 'planned', note: 'Test · due, unconfirmed' },
    { date, kind: 'focus', startMin: Math.min(nowMin + 60, 22 * 60), endMin: Math.min(nowMin + 120, 23 * 60), plannedMin: 60, status: 'planned', note: 'Test · planned' },
  ];
}
