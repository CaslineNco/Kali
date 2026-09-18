/**
 * 格子颜色分档：按当天「已确认专注」分钟数落到 0–4 档。
 * 阈值是「达到该档的最低分钟数」，默认值先用一个合理阶梯，
 * 攒到真实数据后在设置页可调（PRD 第 6 节问题 4）。
 */
export type Level = 0 | 1 | 2 | 3 | 4;

export const DEFAULT_THRESHOLDS: readonly [number, number, number, number] = [1, 60, 150, 240];

export function levelOf(
  focusMinutes: number,
  thresholds: readonly [number, number, number, number] = DEFAULT_THRESHOLDS,
): Level {
  let level: Level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (focusMinutes >= thresholds[i]) level = (i + 1) as Level;
  }
  return level;
}
