import { Minus, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import './duration-dial.css';

/* ---------------------------------------------------------------------------
 * 时长圆盘 + 拖拽步进器
 * 照 bencho.dev 的 Range dial（?c=sleep）和 Drag stepper（?c=stepper）改的，
 * 两个都是 MIT。改动：Range dial 原本是两个把手选一段睡眠区间，这里固定起点在 12 点方向、
 * 只留一个把手拖时长；Drag stepper 原本 0–100，这里步进 1 分钟做精调。
 * 圆盘吸附 5 分钟（粗调），步进器 ±1 分钟（精调），合起来满足"精确到分钟"。
 * ------------------------------------------------------------------------- */

const SIZE = 216; // 渲染尺寸
const VB = 200; // viewBox
const C = VB / 2;
const DENSITY = 48; // 刻度根数
const REACH = 56; // 刻度起点半径（viewBox 单位）
const SNAP = 5;

export function DurationDial({
  value,
  onChange,
  max = 480,
  stepper = true,
  step = 1,
}: {
  value: number;
  onChange: (min: number) => void;
  max?: number;
  /** 圆盘下面要不要带步进器 */
  stepper?: boolean;
  /** 最小单位：圆盘吸附和步进器都按它走。排计划 5，记实际 1 */
  step?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [held, setHeld] = useState(false);
  const clamp = (v: number) => Math.max(step, Math.min(max, Math.round(v / step) * step));

  // 指针 → 角度（12 点为 0，顺时针）→ 分钟，吸附到 5 分钟
  const minutesAt = (e: ReactPointerEvent) => {
    const el = svgRef.current;
    if (!el) return value;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VB - C;
    const y = ((e.clientY - r.top) / r.height) * VB - C;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    const snap = Math.max(SNAP, step);
    const snapped = Math.round((deg / 360) * (max / snap)) * snap;
    return clamp(snapped === 0 ? snap : snapped);
  };

  const rad = (min: number) => ((min / max) * 360 - 90) * (Math.PI / 180);
  const handleIdx = (value / max) * DENSITY; // 把手落在第几根刻度附近

  const knobR = (REACH + 11) * (SIZE / VB);
  const knob = { x: Math.cos(rad(value)) * knobR, y: Math.sin(rad(value)) * knobR };
  const h = Math.floor(value / 60);
  const m = value % 60;

  return (
    <div className="dd">
      <div className="dd-dial">
        <svg
          ref={svgRef}
          className="dd-arc"
          viewBox={`0 0 ${VB} ${VB}`}
          data-dragging={held || undefined}
          role="slider"
          aria-label="Duration"
          aria-valuenow={value}
          aria-valuemin={1}
          aria-valuemax={max}
          tabIndex={0}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setHeld(true);
            onChange(minutesAt(e));
          }}
          onPointerMove={(e) => {
            if (held) onChange(minutesAt(e));
          }}
          onPointerUp={() => setHeld(false)}
          onPointerCancel={() => setHeld(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(clamp(value + Math.max(SNAP, step)));
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(clamp(value - Math.max(SNAP, step)));
          }}
        >
          {Array.from({ length: DENSITY }, (_, i) => {
            const min = (max / DENSITY) * i;
            const on = min <= value;
            const major = i % 12 === 0;
            const len = major ? (on ? 19 : 17) : on ? 15 : 9;
            // 离把手几根刻度：点亮动画按这个错开，拖的时候像一圈涟漪跟着走
            const d = Math.round(Math.abs(handleIdx - i));
            const a = rad(min);
            const cx = Math.cos(a);
            const cy = Math.sin(a);
            return (
              <line
                key={on ? `${i}+` : i}
                data-on={on || undefined}
                style={{ '--d': d } as React.CSSProperties}
                x1={C + cx * REACH}
                y1={C + cy * REACH}
                x2={C + cx * (REACH + len)}
                y2={C + cy * (REACH + len)}
                pathLength={1}
                strokeDasharray={1}
                strokeOpacity={on ? 0.9 : 0.24}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="dd-knobs">
          <motion.span
            className="dd-knob"
            data-held={held || undefined}
            animate={{ x: knob.x, y: knob.y, scale: held ? 1.22 : 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.6 }}
          />
        </div>

        <div className="dd-mid" aria-hidden>
          <span className="dd-figure">
            {h > 0 && (
              <>
                {h}
                <span className="dd-unit" data-pair>
                  h
                </span>
              </>
            )}
            {h > 0 ? String(m).padStart(2, '0') : m}
            <span className="dd-unit">m</span>
          </span>
        </div>
      </div>

      {stepper && <DragStepper value={value} onChange={(v) => onChange(clamp(v))} max={max} min={step} step={step} />}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Drag stepper：点一下 ±1，按住 260ms 进入"扫动"模式，左右拖连续改值。
 * 粗调靠圆盘，这里只负责最后几分钟的精确。
 * ------------------------------------------------------------------------- */

const HOLD_MS = 260;

export function DragStepper({
  value,
  onChange,
  max,
  min = 0,
  format,
  label,
  sweepSpan = 120,
  step = 1,
  unit = 'min',
}: {
  value: number;
  onChange: (min: number) => void;
  max: number;
  min?: number;
  /** 一步多少；扫动时也吸附到这个倍数 */
  step?: number;
  /** 无障碍标签里的单位 */
  unit?: string;
  /** 横向拖满整条药丸改多少；默认 120 */
  sweepSpan?: number;
  /** 显示成什么样，默认就是数字本身；时间用 "09:30" */
  format?: (v: number) => string;
  /** 药丸左边的小标签，如「开始」 */
  label?: string;
}) {
  const [sweep, setSweep] = useState(false);
  const pill = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const origin = useRef({ x: 0, v: 0, dir: 1, stepped: false });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const press = (dir: 1 | -1) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    origin.current = { x: e.clientX, v: value, dir, stepped: false };
    timer.current = window.setTimeout(() => setSweep(true), HOLD_MS);
  };

  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!sweep) return;
    const w = pill.current?.offsetWidth ?? 200;
    const raw = origin.current.v + ((e.clientX - origin.current.x) / w) * sweepSpan;
    const next = Math.round(raw / step) * step;
    if (next !== value) onChange(next);
  };

  const lift = () => {
    window.clearTimeout(timer.current);
    if (!sweep && !origin.current.stepped) {
      origin.current.stepped = true;
      onChange(value + origin.current.dir * step); // 只是点了一下
    }
    setSweep(false);
  };

  return (
    <div className="dd-pill" data-sweep={sweep || undefined} ref={pill}>
      {label && <span className="dd-label">{label}</span>}
      <button
        type="button"
        className="dd-side"
        aria-label={`minus ${step} ${unit}`}
        onPointerDown={press(-1)}
        onPointerMove={move}
        onPointerUp={lift}
        onPointerCancel={lift}
      >
        <Minus size={16} strokeWidth={2} />
      </button>
      <span className="dd-value">{format ? format(value) : value}</span>
      <button
        type="button"
        className="dd-side"
        aria-label={`plus ${step} ${unit}`}
        onPointerDown={press(1)}
        onPointerMove={move}
        onPointerUp={lift}
        onPointerCancel={lift}
      >
        <Plus size={16} strokeWidth={2} />
      </button>
      <i className="dd-fill" style={{ transform: `scaleX(${(value - min) / (max - min)})` }} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * 时刻步进器：小时、分钟各一条 Drag stepper。分钟从 59 往上会进位到小时，反之退位。
 * ------------------------------------------------------------------------- */

export function TimeSteppers({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  /** 距 00:00 的分钟数 */
  value: number;
  onChange: (min: number) => void;
  /** 分钟步进：排计划用 5，记实际用 1 */
  step?: number;
}) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const max = DAY_MAX - ((DAY_MAX + 1) % step); // 步进 5 时最晚 23:55，不落到格子外
  const set = (hh: number, mm: number) => onChange(Math.max(0, Math.min(max, hh * 60 + mm)));
  const pad = (v: number) => String(v).padStart(2, '0');
  return (
    <div className="ts">
      <span className="ts-label">{label}</span>
      <DragStepper value={h} min={0} max={23} sweepSpan={24} format={pad} unit="h" onChange={(v) => set(v, m)} />
      <span className="ts-unit">h</span>
      <DragStepper value={m} min={-step} max={60} step={step} sweepSpan={60} format={pad} onChange={(v) => set(h, v)} />
      <span className="ts-unit">m</span>
    </div>
  );
}

const DAY_MAX = 23 * 60 + 59;
