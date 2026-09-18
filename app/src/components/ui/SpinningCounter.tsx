import { useEffect, useState } from 'react';
import './spinning-counter.css';

/**
 * Transitions.dev 的 Spinning counter（ref/UI/Spinning Counter.md）改成受控 React 组件：
 * 每个数字是一条 0–9 的卷轴，从 0 转 `spins` 圈后落到目标数字，列与列之间错开一点，
 * 像老式计数器一样从左到右依次停下。value 变了就重新转一次。
 */
const SPINS = 3;
const DUR = 1400;
const STAGGER = 90;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

export function SpinningCounter({ value, cell = 32 }: { value: number; cell?: number }) {
  const text = Math.round(value).toLocaleString('en-US');
  // 先画在 0 的位置（无过渡），下一帧再带过渡转到目标——同一个元素两步走，浏览器才会做动画
  const [spun, setSpun] = useState(false);
  useEffect(() => {
    setSpun(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSpun(true)));
    return () => cancelAnimationFrame(id);
  }, [text]);

  let col = 0;
  return (
    <span className="t-reel" style={{ '--reel-cell': `${cell}px` } as React.CSSProperties} aria-label={text}>
      {[...text].map((ch, i) => {
        if (ch < '0' || ch > '9') {
          return (
            <span key={i} className="t-reel-sep">
              {ch}
            </span>
          );
        }
        const digit = Number(ch);
        const delay = col++ * STAGGER;
        return (
          <span key={i} className="t-reel-col" aria-hidden>
            <span
              className="t-reel-strip"
              style={{
                transition: spun ? `transform ${DUR}ms ${EASE} ${delay}ms` : 'none',
                transform: `translateY(-${(spun ? SPINS * 10 + digit : 0) * cell}px)`,
              }}
            >
              {Array.from({ length: (SPINS + 1) * 10 + 1 }, (_, k) => (
                <span key={k} className="t-reel-digit">
                  {k % 10}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
