import { Dialog } from '@/components/ui/Dialog';

/** 设置：阶段 7 再填内容（颜色阈值、开机自启、悬浮窗透明度、数据路径）。 */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Settings" width={420}>
      <div className="form">
        <p className="form-hint">Color thresholds, launch at login, widget opacity and the data location will live here.</p>
        <div className="form-actions">
          <span className="form-spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
