import { emit, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';

const inTauri = () => '__TAURI_INTERNALS__' in window;

/**
 * 设置。阶段 6 先放两项：开机自启（默认关，PRD 4.3）、显示今日悬浮窗。
 * 阶段 7 再加颜色阈值、悬浮窗透明度、数据路径。
 */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Settings" width={420}>
      {open && <SettingsForm onClose={onClose} />}
    </Dialog>
  );
}

function SettingsForm({ onClose }: { onClose: () => void }) {
  // 纯浏览器预览没有托盘和自启，直接给定值；Tauri 里异步读真实状态
  const [autostart, setAutostart] = useState<boolean | null>(() => (inTauri() ? null : false));
  const [widget, setWidget] = useState<boolean | null>(() => (inTauri() ? null : true));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inTauri()) return;
    void isEnabled().then(setAutostart).catch(() => setAutostart(false));
    void WebviewWindow.getByLabel('float')
      .then((w) => w?.isVisible() ?? false)
      .then(setWidget);
    // 托盘菜单改了也要跟着变
    const un = Promise.all([
      listen<boolean>('kali:autostart', (e) => setAutostart(e.payload)),
      listen<boolean>('kali:widget-visible', (e) => setWidget(e.payload)),
    ]);
    return () => {
      void un.then((fs) => fs.forEach((f) => f()));
    };
  }, []);

  const toggleAutostart = async (want: boolean) => {
    setError(null);
    try {
      if (inTauri()) await (want ? enable() : disable());
      setAutostart(want);
    } catch (e) {
      setError(`Couldn’t change launch at login: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const toggleWidget = async (want: boolean) => {
    setWidget(want);
    if (!inTauri()) return;
    const w = await WebviewWindow.getByLabel('float');
    if (w) await (want ? w.show() : w.hide());
    await emit('kali:widget-visible', want);
  };

  return (
    <div className="form">
      <Row
        label="Launch at login"
        hint="Off by default. Kali starts in the tray with the widget on screen."
        checked={autostart ?? false}
        disabled={autostart === null}
        onChange={(v) => void toggleAutostart(v)}
      />
      <Row
        label="Show today widget"
        hint="The always-on-top card. Also in the tray menu."
        checked={widget ?? true}
        disabled={widget === null}
        onChange={(v) => void toggleWidget(v)}
      />
      {error && <p className="form-hint form-warn">{error}</p>}
      <p className="form-hint">Color thresholds, widget opacity and the data location come in a later stage.</p>
      <div className="form-actions">
        <span className="form-spacer" />
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        <span className="setting-hint">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
