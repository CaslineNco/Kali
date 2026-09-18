import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { settings } from '@/data/store';
import { API_KEY_SETTING } from '@/lib/ai';

/**
 * 设置（阶段 7 会长成完整页面；现在只有 AI 用的 API key）。
 * key 存本机 SQLite 的 settings 表，明文——只在这台电脑上、只发给 api.anthropic.com。
 */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Settings" width={420}>
      <SettingsForm onClose={onClose} />
    </Dialog>
  );
}

function SettingsForm({ onClose }: { onClose: () => void }) {
  // 表单随浮层挂载：打开时异步读一次已存的 key
  const [key, setKey] = useState(() => settings.peek(API_KEY_SETTING) ?? '');
  const [show, setShow] = useState(false);
  useEffect(() => {
    void settings.get(API_KEY_SETTING).then((v) => setKey((cur) => cur || (v ?? '')));
  }, []);

  const save = async () => {
    await settings.set(API_KEY_SETTING, key.trim());
    onClose();
  };

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="field">
        <span>Anthropic API key</span>
        <div className="form-row" style={{ alignItems: 'center' }}>
          <input
            type={show ? 'text' : 'password'}
            placeholder="sk-ant-…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn" onClick={() => setShow((v) => !v)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>
      <p className="form-hint">
        Enables “Break it down” on a block: the task title, type and duration are sent to Claude to draft the first
        concrete steps. Stored only on this computer. Leave empty to keep everything offline.
      </p>
      <div className="form-actions">
        <span className="form-spacer" />
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  );
}
