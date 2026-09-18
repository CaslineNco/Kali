import { listen } from '@tauri-apps/api/event';
import { Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { DayView } from './components/day/DayView';
import { DevPanel } from './components/DevPanel';
import { YearWall } from './components/YearWall';
import { useYearSummary } from './data/store';
import { displayStatus } from './data/types';
import { nowMinutes, startOfDay, toKey, type DayKey } from './lib/date';

type View = { kind: 'wall' } | { kind: 'day'; date: DayKey };

function App() {
  // 每分钟看一眼时钟：跨过午夜后"今天"要换、待确认计数要按当前时间算（桌面 App 会一直开着）
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const todayKey = toKey(now);
  const today = useMemo(() => startOfDay(now), [todayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const nowMin = nowMinutes(now);
  const year = today.getFullYear();
  const { summary: data, blocks: all, error } = useYearSummary(year);
  const [view, setView] = useState<View>({ kind: 'wall' });

  // 悬浮窗点了某一行 → 跳到那天的日程视图
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    const un = listen<DayKey>('kali:open-day', (e) => setView({ kind: 'day', date: e.payload }));
    return () => {
      void un.then((f) => f());
    };
  }, []);

  // Ctrl+Shift+D 显示/隐藏开发面板（写演示数据、清空）
  const [dev, setDev] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (import.meta.env.DEV && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') setDev((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 全年还没处理的待确认块（计划块到点没确认的），按日期倒序，点了跳到最近那天
  const pendingDates = useMemo(() => {
    const dates = new Set<DayKey>();
    for (const b of all) if (displayStatus(b, todayKey, nowMin) === 'pending') dates.add(b.date);
    return [...dates].sort().reverse();
  }, [all, todayKey, nowMin]);
  const pendingCount = useMemo(
    () => all.filter((b) => displayStatus(b, todayKey, nowMin) === 'pending').length,
    [all, todayKey, nowMin],
  );

  const totalFocusMin = useMemo(() => {
    let sum = 0;
    for (const v of data.values()) sum += v.focus;
    return sum;
  }, [data]);

  return (
    <main className="app">
      <AnimatePresence mode="wait" initial={false}>
        {view.kind === 'wall' ? (
          <motion.div
            key="wall"
            className="page page-wall"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            <div className="wall">
              <header className="wall-header">
                <h1 className="wall-title">
                  {year}
                  <span className="wall-title-sub">{Math.round(totalFocusMin / 60)}h confirmed focus · leisure tracked separately</span>
                </h1>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    className="pending-chip"
                    title="Go to the latest day with unconfirmed blocks"
                    onClick={() => setView({ kind: 'day', date: pendingDates[0] })}
                  >
                    {pendingCount} to confirm
                  </button>
                )}
              </header>
              <YearWall
                year={year}
                today={today}
                data={data}
                onSelectDay={(d) => setView({ kind: 'day', date: toKey(d) })}
              />
              <p className="wall-hint">Click a day to open it · drag across days to total a span</p>
            </div>
            <button type="button" className="gear" aria-label="Settings" title="Settings (stage 7)">
              <Settings size={16} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="day"
            className="page page-day"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            <DayView
              date={view.date}
              onChangeDate={(date) => setView({ kind: 'day', date })}
              onBack={() => setView({ kind: 'wall' })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="db-error" role="alert">
          Couldn’t open the database: {error}. Fix the problem and restart the app.
        </div>
      )}
      {dev && <DevPanel year={year} all={all} />}
    </main>
  );
}

export default App;
