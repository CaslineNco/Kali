import { LogicalPosition, currentMonitor, getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 悬浮窗"收边"：平时把窗口推到屏幕右边缘外面，只露一条 TAB 宽的把手；
 * 有事（正在进行 / 到点待确认 / 快开始）或者鼠标碰到把手就弹出来；
 * 没事了、鼠标离开几秒后自动收回。窗口本身尺寸不变，只挪位置。
 */
export const TAB = 28; // 露在外面的把手宽度
const WIN_W = 400;
const WIN_H = 540;
const MARGIN = 16;
const COLLAPSE_AFTER = 4000;

const inTauri = () => '__TAURI_INTERNALS__' in window;

export function useDock(attention: boolean) {
  const [docked, setDocked] = useState(false);
  const [pinned, setPinned] = useState(false);
  const hover = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const edge = useRef<{ right: number; top: number } | null>(null);

  // 屏幕右边缘（逻辑像素）算一次；窗口垂直居中
  useEffect(() => {
    if (!inTauri()) return;
    void currentMonitor().then((m) => {
      if (!m) return;
      const sf = m.scaleFactor;
      const right = (m.position.x + m.size.width) / sf;
      const top = m.position.y / sf + Math.max(MARGIN, ((m.size.height / sf) - WIN_H) / 2);
      edge.current = { right, top };
      void place(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const place = useCallback(async (dock: boolean) => {
    const e = edge.current;
    if (!e || !inTauri()) return;
    const x = dock ? e.right - TAB : e.right - WIN_W - MARGIN;
    await getCurrentWindow().setPosition(new LogicalPosition(Math.round(x), Math.round(e.top)));
    setDocked(dock);
  }, []);

  const clear = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  // 有事就弹出；没事、没钉住、鼠标不在上面 → 几秒后收回
  useEffect(() => {
    if (attention || pinned) {
      clear();
      if (docked) void place(false);
      return;
    }
    if (!docked && !hover.current) {
      clear();
      timer.current = window.setTimeout(() => void place(true), COLLAPSE_AFTER);
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attention, pinned, docked]);

  const onEnter = () => {
    hover.current = true;
    clear();
    if (docked) void place(false);
  };
  const onLeave = () => {
    hover.current = false;
    if (attention || pinned || docked) return;
    clear();
    timer.current = window.setTimeout(() => void place(true), COLLAPSE_AFTER);
  };

  return { docked, pinned, setPinned, onEnter, onLeave, expand: () => void place(false), collapse: () => void place(true) };
}
