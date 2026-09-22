import { emit, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useEffect, useState } from 'react';
import { Button } from '@/components/motion/button/base';
import { Switch } from '@/components/motion/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/motion/tabs';
import { Dialog } from '@/components/ui/Dialog';
import { settings } from '@/data/store';
import { LOCALE_SETTING, useT, type Locale } from '@/lib/i18n';

const inTauri = () => '__TAURI_INTERNALS__' in window;

/**
 * 设置。阶段 6 先放两项：开机自启（默认关，PRD 4.3）、显示今日悬浮窗。
 * 阶段 7 再加颜色阈值、悬浮窗透明度、数据路径。
 */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <Dialog open={open} onClose={onClose} title={t.settings} width={420}>
      {open && <SettingsForm onClose={onClose} />}
    </Dialog>
  );
}

function SettingsForm({ onClose }: { onClose: () => void }) {
  const { t, locale } = useT();
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
      setError(t.autostartError(e instanceof Error ? e.message : String(e)));
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
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="text-sm text-foreground">{t.language}</span>
          <span className="text-xs text-muted-foreground">{t.languageHint}</span>
        </span>
        <Tabs value={locale} onValueChange={(v) => void settings.set(LOCALE_SETTING, v as Locale)} variant="segment">
          <TabsList>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="zh-TW">繁體中文</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Row
        label={t.launchAtLogin}
        hint={t.launchHint}
        checked={autostart ?? false}
        disabled={autostart === null}
        onChange={(v) => void toggleAutostart(v)}
      />
      <Row
        label={t.showWidget}
        hint={t.showWidgetHint}
        checked={widget ?? true}
        disabled={widget === null}
        onChange={(v) => void toggleWidget(v)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="pt-2 text-xs text-muted-foreground">{t.settingsLater}</p>
      <div className="flex justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t.close}
        </Button>
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
    <div className="flex min-h-11 items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} ariaLabel={label} />
    </div>
  );
}
