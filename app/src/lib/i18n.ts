import { useSetting } from '@/data/store';

/**
 * 两种语言：英文（默认）、繁體中文。文案全在这一张表里；日期格式按语言走。
 * 语言存在 settings 表（key = "locale"），主窗口和悬浮窗共用。
 */
export type Locale = 'en' | 'zh-TW';
export const LOCALE_SETTING = 'locale';

const en = {
  // 通用
  focus: 'Focus',
  leisure: 'Leisure',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  close: 'Close',
  confirm: 'Confirm',
  undo: 'Undo',
  settings: 'Settings',
  today: 'Today',
  // 状态
  planned: 'Planned',
  pending: 'Confirm?',
  confirmed: 'Confirmed',
  skipped: 'Skipped',
  // 格子墙
  focused: 'focused',
  leisureTotal: 'leisure',
  toConfirm: (n: number) => `${n} to confirm`,
  toConfirmTitle: 'Go to the latest day with unconfirmed blocks',
  nothingLogged: 'Nothing logged yet.',
  openToday: 'Open today',
  planFirst: 'and plan the first block.',
  legendUpcoming: 'upcoming',
  legendLess: 'less',
  legendMore: 'more',
  nothingPlanned: 'Nothing planned',
  nPlanned: (n: number) => `${n} planned`,
  days: (n: number) => `${n} days`,
  // 日程视图
  backToYear: '‹ Back to the year',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  previousDay: 'Previous day',
  nextDay: 'Next day',
  more: (n: number) => `+${n} more`,
  newBlock: 'New block',
  logTime: 'Log time',
  newBlockAt: 'new block',
  logTimeAt: 'log time',
  now: 'Now',
  logged: 'Logged',
  actual: 'actual',
  steps: 'steps',
  adjust: 'Adjust',
  skip: 'Skip',
  confirmTitle: (m: string) => `Confirm — counts the planned ${m}`,
  adjustTitle: 'Set the actual duration',
  skipTitle: 'Didn’t happen — not counted',
  deleted: (t: string) => `Deleted “${t}”`,
  // 浮层
  editBlock: 'Edit block',
  editLog: 'Edit log',
  start: 'Start',
  ends: 'Ends',
  what: 'What (optional)',
  whatPlaceholder: 'e.g. Write the proposal',
  logPlaceholder: 'e.g. Reading',
  date: 'Date',
  savedAsPlanned: 'Saved as planned — you’ll be asked to confirm when it ends.',
  logHint: 'Logs time after the fact — skips planning and confirmation, counts immediately.',
  pastMidnight: 'Runs past midnight — start earlier or shorten it.',
  overlaps: (t: string, r: string) => `Overlaps “${t} ${r}” — adjust the time.`,
  howLong: 'How long did it actually take?',
  plannedFor: 'planned',
  adjustHint: 'Saves as confirmed and counts this duration.',
  stepsLabel: 'Steps',
  stepFirst: 'First concrete action, e.g. “Open last week’s draft”',
  stepAnother: 'Another step…',
  addStep: 'Add step',
  removeStep: 'Remove step',
  // 设置
  language: 'Language',
  languageHint: 'Interface text and date format.',
  launchAtLogin: 'Launch at login',
  launchHint: 'Off by default. Kali starts in the tray with the widget on screen.',
  showWidget: 'Show today widget',
  showWidgetHint: 'The always-on-top card. Also in the tray menu.',
  settingsLater: 'Color thresholds, widget opacity and the data location come in a later stage.',
  autostartError: (m: string) => `Couldn’t change launch at login: ${m}`,
  // 悬浮窗
  done: 'Done',
  trash: 'Trash',
  reset: 'Reset',
  open: 'Open',
  due: 'Due',
  inProgress: 'In progress',
  plannedTag: 'Planned',
  tally: (done: number, left: number) => `${done} done · ${left} left`,
  nothingPlannedYet: 'Nothing planned yet',
  planInMain: 'Plan your day in the main window.',
  swipeHint: 'Swipe right → done · left → skip',
  nPlannedFooter: (n: number) => `${n} planned`,
  // 标题栏
  minimize: 'Minimize',
  maximize: 'Maximize',
  restore: 'Restore',
  closeWindow: 'Close',
  // 数据库
  dbError: (m: string) => `Couldn’t open the database: ${m}. Fix the problem and restart the app.`,
};

export type Dict = typeof en;

const zhTW: Dict = {
  focus: '專注',
  leisure: '娛樂',
  cancel: '取消',
  save: '儲存',
  delete: '刪除',
  close: '關閉',
  confirm: '確認',
  undo: '復原',
  settings: '設定',
  today: '今天',
  planned: '計畫中',
  pending: '待確認',
  confirmed: '已確認',
  skipped: '已跳過',
  focused: '專注',
  leisureTotal: '娛樂',
  toConfirm: (n) => `${n} 項待確認`,
  toConfirmTitle: '前往最近一個有待確認的日子',
  nothingLogged: '還沒有任何記錄。',
  openToday: '打開今天',
  planFirst: '排第一個時間塊。',
  legendUpcoming: '未來',
  legendLess: '少',
  legendMore: '多',
  nothingPlanned: '沒有安排',
  nPlanned: (n) => `${n} 項計畫`,
  days: (n) => `${n} 天`,
  backToYear: '‹ 回到整年',
  yesterday: '昨天',
  tomorrow: '明天',
  previousDay: '前一天',
  nextDay: '後一天',
  more: (n) => `還有 ${n} 項`,
  newBlock: '新增時間塊',
  logTime: '補記',
  newBlockAt: '新增時間塊',
  logTimeAt: '補記',
  now: '現在',
  logged: '補記',
  actual: '實際',
  steps: '步',
  adjust: '改時長',
  skip: '跳過',
  confirmTitle: (m) => `確認——按計畫的 ${m} 計入`,
  adjustTitle: '填實際做了多久',
  skipTitle: '沒做——不計入',
  deleted: (t) => `已刪除「${t}」`,
  editBlock: '編輯時間塊',
  editLog: '編輯補記',
  start: '開始',
  ends: '結束',
  what: '內容（選填）',
  whatPlaceholder: '例如：寫方案',
  logPlaceholder: '例如：讀書',
  date: '日期',
  savedAsPlanned: '儲存後為「計畫中」，結束時會提醒你確認。',
  logHint: '事後直接記一段——跳過計畫與確認，立即計入。',
  pastMidnight: '超過當天末尾了——開始早一點或縮短。',
  overlaps: (t, r) => `跟「${t} ${r}」重疊了——改一下時間。`,
  howLong: '實際做了多久？',
  plannedFor: '計畫',
  adjustHint: '儲存後為已確認，按這個時長計入。',
  stepsLabel: '步驟',
  stepFirst: '第一個具體動作，例如「打開上週的草稿」',
  stepAnother: '再加一步…',
  addStep: '新增步驟',
  removeStep: '移除步驟',
  language: '語言',
  languageHint: '介面文字與日期格式。',
  launchAtLogin: '開機自動啟動',
  launchHint: '預設關閉。開啟後 Kali 會在系統匣啟動，桌面上顯示小卡。',
  showWidget: '顯示今日小卡',
  showWidgetHint: '常駐最上層的卡片。系統匣選單裡也有。',
  settingsLater: '顏色門檻、小卡透明度與資料位置會在後續階段加入。',
  autostartError: (m) => `無法變更開機自啟：${m}`,
  done: '完成',
  trash: '刪除',
  reset: '重設',
  open: '打開',
  due: '到點',
  inProgress: '進行中',
  plannedTag: '計畫',
  tally: (done, left) => `完成 ${done} · 剩 ${left}`,
  nothingPlannedYet: '今天還沒有安排',
  planInMain: '到主視窗排今天的計畫。',
  swipeHint: '右滑 → 完成 · 左滑 → 跳過',
  nPlannedFooter: (n) => `${n} 項計畫`,
  minimize: '最小化',
  maximize: '最大化',
  restore: '還原',
  closeWindow: '關閉',
  dbError: (m) => `無法打開資料庫：${m}。修好後重新啟動。`,
};

const DICTS: Record<Locale, Dict> = { en, 'zh-TW': zhTW };

export function normalizeLocale(v: string | null | undefined): Locale {
  return v === 'zh-TW' ? 'zh-TW' : 'en';
}

/** 当前语言 + 文案表。语言变了所有用到它的组件都会重画。 */
export function useT() {
  const locale = normalizeLocale(useSetting(LOCALE_SETTING));
  return { t: DICTS[locale], locale };
}

/* ---------- 日期：按语言格式化 ---------- */

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_ZH = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

/** "Saturday, Mar 14, 2026" / "2026年3月14日 週六" */
export function fmtDateTitle(d: Date, locale: Locale) {
  return locale === 'zh-TW'
    ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_ZH[d.getDay()]}`
    : `${WEEKDAY_LONG_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Sat, Mar 14" / "3月14日 週六" */
export function fmtDateShort(d: Date, locale: Locale) {
  return locale === 'zh-TW'
    ? `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_ZH[d.getDay()]}`
    : `${WEEKDAY_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`;
}

/** "Mar 14" / "3月14日" */
export function fmtMonthDay(d: Date, locale: Locale) {
  return locale === 'zh-TW' ? `${d.getMonth() + 1}月${d.getDate()}日` : `${MONTHS_EN[d.getMonth()]} ${d.getDate()}`;
}

/** Intl 用的 BCP 47 tag */
export const intlTag = (locale: Locale) => (locale === 'zh-TW' ? 'zh-TW' : 'en-US');
