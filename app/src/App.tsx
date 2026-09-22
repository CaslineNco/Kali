import { listen } from '@tauri-apps/api/event';
import { Settings } from 'lucide-react';
import { Button } from './components/motion/button/base';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { DayView } from './components/day/DayView';
import { DevPanel } from './components/DevPanel';
import { SettingsDialog } from './components/SettingsDialog';
import { SpinningCounter } from './components/ui/SpinningCounter';
import { TitleBar } from './components/TitleBar';
import { YearWall } from './components/YearWall';
import { useYearSummary } from './data/store';
import { displayStatus } from './data/types';
import { nowMinutes, startOfDay, toKey, type DayKey } from './lib/date';
import { useT } from './lib/i18n';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t, locale } = useT();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // 悬浮窗点了某一行 → 跳到那天的日程视图
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    const un = Promise.all([
      listen<DayKey>('kali:open-day', (e) => setView({ kind: 'day', date: e.payload })),
      // 托盘菜单的「Settings…」
      listen('kali:open-settings', () => setSettingsOpen(true)),
    ]);
    return () => {
      void un.then((fs) => fs.forEach((f) => f()));
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

  // 每天排了几个计划块，给格子墙上未来日期的 tooltip
  const plannedByDay = useMemo(() => {
    const m = new Map<DayKey, number>();
    for (const b of all) if (b.status === 'planned' && b.startMin !== null) m.set(b.date, (m.get(b.date) ?? 0) + 1);
    return m;
  }, [all]);

  const totals = useMemo(() => {
    let focus = 0;
    let fun = 0;
    for (const v of data.values()) {
      focus += v.focus;
      fun += v.fun;
    }
    return { focus, fun };
  }, [data]);
  const totalFocusMin = totals.focus;

  return (
    <main className="app">
      <TitleBar title="Kali" />
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
                  <span className="wall-title-sub">
                    <span className="wall-hours">
                      <SpinningCounter value={totalFocusMin / 60} cell={28} />h
                    </span>{' '}
                    {t.focused} · <span className="wall-leisure">{Math.round(totals.fun / 60)}h</span> {t.leisureTotal}
                  </span>
                </h1>
                {pendingCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    title={t.toConfirmTitle}
                    onClick={() => setView({ kind: 'day', date: pendingDates[0] })}
                  >
                    {t.toConfirm(pendingCount)}
                  </Button>
                )}
              </header>
              <YearWall
                year={year}
                today={today}
                data={data}
                planned={plannedByDay}
                onSelectDay={(d) => setView({ kind: 'day', date: toKey(d) })}
              />
              {all.length === 0 && !error && (
                <p className="wall-empty">
                  {t.nothingLogged}{' '}
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-amber underline underline-offset-4"
                    onClick={() => setView({ kind: 'day', date: todayKey })}
                  >
                    {t.openToday}
                  </button>{' '}
                  {t.planFirst}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="fixed bottom-6 right-6 text-muted-foreground hover:text-foreground"
              aria-label={t.settings}
              title={t.settings}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings size={16} />
            </Button>
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

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {error && (
        <div className="db-error" role="alert">
          {t.dbError(error)}
        </div>
      )}
      {dev && <DevPanel year={year} all={all} />}
    </main>
  );
}

export default App;
