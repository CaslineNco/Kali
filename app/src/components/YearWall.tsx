import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  HeatCalendar,
  HeatCalendarGrid,
  HeatCalendarLegend,
  HeatCalendarTooltip,
  type HeatCalendarCell,
  type HeatCalendarSelection,
} from '@/components/charts/heat-calendar';
import { addDays, mondayOf } from '@/components/charts/heat-calendar/utils';
import type { DaySummary } from '@/data/types';
import { fmtMinutes, type DayKey } from '@/lib/date';
import { intlTag, useT } from '@/lib/i18n';
import { DEFAULT_THRESHOLDS, levelOf } from '@/lib/levels';

/** Heat Calendar 内部按 UTC 日历日算；把本地的年月日原样搬到 UTC 上，两边就是同一个「日子」。 */
const utcDay = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

const keyOfUtc = (d: Date): DayKey =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;


export interface YearWallProps {
  year: number;
  /** 本地「今天」 */
  today: Date;
  data: ReadonlyMap<DayKey, DaySummary>;
  /** 每天排了几个计划块（未来日期的 tooltip 用） */
  planned?: ReadonlyMap<DayKey, number>;
  thresholds?: readonly [number, number, number, number];
  onSelectDay?: (date: Date) => void;
}

/**
 * 一整年的格子墙：beui Heat Calendar + 年份布局。
 * 单击一格 → 进那天；按住拖过几格 → 选一段范围，tooltip 显示这段的专注总时长（Figma 线稿标注的交互）。
 */
export function YearWall({ year, today, data, planned, thresholds = DEFAULT_THRESHOLDS, onSelectDay }: YearWallProps) {
  const { t, locale } = useT();
  const tag = intlTag(locale);
  const fmtDayEn = useMemo(() => new Intl.DateTimeFormat(tag, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }), [tag]);
  const fmtShortEn = useMemo(() => new Intl.DateTimeFormat(tag, { timeZone: 'UTC', month: 'short', day: 'numeric' }), [tag]);
  const endDate = useMemo(() => utcDay(year, 11, 31), [year]);
  const minDate = useMemo(() => utcDay(year, 0, 1), [year]);
  const todayUtc = useMemo(() => utcDay(today.getFullYear(), today.getMonth(), today.getDate()), [today]);

  // 从含 1 月 1 日的那一周（周一）铺到含 12 月 31 日的那一周
  const { weeks, start } = useMemo(() => {
    const start = mondayOf(minDate);
    const days = Math.round((endDate.getTime() - start.getTime()) / 86_400_000) + 1;
    return { weeks: Math.ceil(days / 7), start };
  }, [minDate, endDate]);

  // 每格强度 = 档位 / 4，组件内部再按 5 档切回去
  const values = useMemo(
    () =>
      Array.from({ length: weeks }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => {
          const focus = data.get(keyOfUtc(addDays(start, w * 7 + d)))?.focus ?? 0;
          return levelOf(focus, thresholds) / 4;
        }),
      ),
    [weeks, start, data, thresholds],
  );

  const dateOfCell = (c: HeatCalendarCell) => addDays(start, c.w * 7 + c.d);

  // ---- 拖选：按下记锚点，拖到别的格子就成一段；抬手时没拖过就是单击 → 进那天
  const [selection, setSelection] = useState<HeatCalendarSelection | null>(null);
  const drag = useRef<{ anchor: HeatCalendarCell; moved: boolean } | null>(null);

  const cellAt = (x: number, y: number): HeatCalendarCell | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-heat-cell]');
    if (!el) return null;
    const [w, d] = el.dataset.heatCell!.split('-').map(Number);
    return { w, d };
  };
  const same = (a: HeatCalendarCell, b: HeatCalendarCell) => a.w === b.w && a.d === b.d;

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const c = cellAt(e.clientX, e.clientY);
    if (c) drag.current = { anchor: c, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const g = drag.current;
    if (!g || !(e.buttons & 1)) return;
    const c = cellAt(e.clientX, e.clientY);
    if (!c) return;
    if (!same(c, g.anchor)) {
      g.moved = true;
      setSelection({ start: g.anchor, end: c });
    } else if (g.moved) {
      setSelection({ start: g.anchor, end: c });
    }
  };
  const onPointerUp = () => {
    const g = drag.current;
    drag.current = null;
    // 拖过：选段留着（组件会把其它格子压暗、tooltip 挂在段尾）；没拖：交给组件的 click → onSelectionChange
    if (!g?.moved) return;
  };

  return (
    <HeatCalendar
      weeks={weeks}
      endDate={endDate}
      today={todayUtc}
      minDate={minDate}
      values={values}
      maxCount={4}
      unit=""
      locale={tag}
      labels={{ upcoming: t.legendUpcoming, less: t.legendLess, more: t.legendMore }}
      selection={selection}
      onSelectionChange={(sel) => {
        // 拖选过程中组件自己的 click 逻辑不作数
        if (drag.current?.moved) return;
        if (sel === null) {
          setSelection(null);
          return;
        }
        if (selection) {
          // 已有选段时再点：先清掉（组件已经这么做了），不进那天
          setSelection(null);
          return;
        }
        const d = dateOfCell(sel.start);
        onSelectDay?.(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      }}
    >
      <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <HeatCalendarGrid>
          <HeatCalendarTooltip>
            {(tip) => {
              if (tip.days > 1 && tip.startDate && tip.endDate) {
                let focus = 0;
                for (let d = tip.startDate; d <= tip.endDate; d = addDays(d, 1)) focus += data.get(keyOfUtc(d))?.focus ?? 0;
                return (
                  <>
                    <span className="text-muted-foreground">
                      {fmtShortEn.format(tip.startDate)} – {fmtShortEn.format(tip.endDate)} · {t.days(tip.days)}
                    </span>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--amber)' }}>
                      {t.focus} {fmtMinutes(focus)}
                    </span>
                  </>
                );
              }
              const key = keyOfUtc(tip.date);
              if (tip.date > todayUtc) {
                const n = planned?.get(key) ?? 0;
                return (
                  <>
                    <span className="text-muted-foreground">{fmtDayEn.format(tip.date)}</span>
                    <span>{n === 0 ? t.nothingPlanned : t.nPlanned(n)}</span>
                  </>
                );
              }
              const s = data.get(key);
              return (
                <>
                  <span className="text-muted-foreground">{fmtDayEn.format(tip.date)}</span>
                  <span className="font-mono tabular-nums" style={{ color: 'var(--amber)' }}>
                    {t.focus} {fmtMinutes(s?.focus ?? 0)}
                  </span>
                  <span className="font-mono tabular-nums" style={{ color: 'var(--teal)' }}>
                    {t.leisure} {fmtMinutes(s?.fun ?? 0)}
                  </span>
                </>
              );
            }}
          </HeatCalendarTooltip>
        </HeatCalendarGrid>
      </div>
      <HeatCalendarLegend />
    </HeatCalendar>
  );
}
