import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const inTauri = () => '__TAURI_INTERNALS__' in window;

/**
 * 自绘标题栏（Obsidian 那种）：窗口本身无边框，标题栏跟 App 同色，不跟 Windows 的强调色走。
 * 整条可拖，双击最大化，右侧三个键。关闭 = 交给 Rust 的 CloseRequested（隐藏到托盘）。
 */
export function TitleBar({ title }: { title: string }) {
  const [maximized, setMaximized] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (!inTauri()) return;
    const w = getCurrentWindow();
    void w.isMaximized().then(setMaximized);
    const un = w.onResized(() => void w.isMaximized().then(setMaximized));
    return () => {
      void un.then((f) => f());
    };
  }, []);

  const win = () => (inTauri() ? getCurrentWindow() : null);

  return (
    <div
      className="flex h-9 shrink-0 select-none items-center justify-between border-b border-border/60 bg-background"
      data-tauri-drag-region
      onDoubleClick={() => void win()?.toggleMaximize()}
    >
      <span className="pl-4 text-xs text-muted-foreground" data-tauri-drag-region>
        {title}
      </span>
      <div className="flex h-full">
        <Ctl label={t.minimize} onClick={() => void win()?.minimize()}>
          <Minus size={14} />
        </Ctl>
        <Ctl label={maximized ? t.restore : t.maximize} onClick={() => void win()?.toggleMaximize()}>
          {maximized ? <RestoreIcon /> : <Square size={11} />}
        </Ctl>
        <Ctl label={t.closeWindow} danger onClick={() => void win()?.close()}>
          <X size={14} />
        </Ctl>
      </div>
    </div>
  );
}

function Ctl({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'grid h-full w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground',
        danger ? 'hover:bg-destructive hover:text-background' : 'hover:bg-card',
      )}
    >
      {children}
    </button>
  );
}

/** 两个错开的小方块 = Windows 的"还原" */
function RestoreIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="3.5" y="1.5" width="7" height="7" rx="1" />
      <path d="M1.5 3.5v6a1 1 0 0 0 1 1h6" />
    </svg>
  );
}
