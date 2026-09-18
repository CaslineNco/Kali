use tauri::{
  menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_sql::{Migration, MigrationKind};

/// 数据库结构变更全部走这里，按 version 递增追加，永远不要改已经发布过的那条。
fn migrations() -> Vec<Migration> {
  vec![
    Migration {
      version: 1,
      description: "create time_blocks",
      sql: include_str!("../migrations/0001_time_blocks.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "steps column + settings table",
      sql: include_str!("../migrations/0002_steps_settings.sql"),
      kind: MigrationKind::Up,
    },
  ]
}

/// 主窗口：隐藏了就拉出来并聚焦
fn show_main(app: &AppHandle) {
  if let Some(w) = app.get_webview_window("main") {
    let _ = w.show();
    let _ = w.unminimize();
    let _ = w.set_focus();
  }
}

/// 悬浮窗显示/隐藏，并把状态同步给托盘菜单的勾选项和前端
fn set_widget_visible(app: &AppHandle, visible: bool) {
  if let Some(w) = app.get_webview_window("float") {
    let _ = if visible { w.show() } else { w.hide() };
  }
  let _ = app.emit("kali:widget-visible", visible);
}

/// 托盘：左键打开主窗口；右键菜单 = 打开主窗口 / 显示悬浮窗 / 开机自启 / 设置 / 退出
fn build_tray(app: &AppHandle) -> tauri::Result<()> {
  let open = MenuItem::with_id(app, "open", "Open Kali", true, None::<&str>)?;
  let widget = CheckMenuItem::with_id(app, "widget", "Show today widget", true, true, None::<&str>)?;
  let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);
  let autostart = CheckMenuItem::with_id(app, "autostart", "Launch at login", true, autostart_on, None::<&str>)?;
  let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
  let quit = MenuItem::with_id(app, "quit", "Quit Kali", true, None::<&str>)?;
  let menu = Menu::with_items(
    app,
    &[
      &open,
      &widget,
      &PredefinedMenuItem::separator(app)?,
      &autostart,
      &settings,
      &PredefinedMenuItem::separator(app)?,
      &quit,
    ],
  )?;

  let widget_item = widget.clone();
  let autostart_item = autostart.clone();
  TrayIconBuilder::with_id("main")
    .icon(app.default_window_icon().cloned().expect("default icon"))
    .tooltip("Kali — Year of focus")
    .menu(&menu)
    .show_menu_on_left_click(false)
    .on_menu_event(move |app, event| match event.id().as_ref() {
      "open" => show_main(app),
      "widget" => {
        let visible = widget_item.is_checked().unwrap_or(true);
        set_widget_visible(app, visible);
      }
      "autostart" => {
        let want = autostart_item.is_checked().unwrap_or(false);
        let r = if want { app.autolaunch().enable() } else { app.autolaunch().disable() };
        if r.is_err() {
          // 没改成就把勾选项拨回去
          let _ = autostart_item.set_checked(!want);
        }
        let _ = app.emit("kali:autostart", app.autolaunch().is_enabled().unwrap_or(false));
      }
      "settings" => {
        show_main(app);
        let _ = app.emit("kali:open-settings", ());
      }
      "quit" => app.exit(0),
      _ => {}
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
        show_main(tray.app_handle());
      }
    })
    .build(app)?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:kali.db", migrations())
        .build(),
    )
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      build_tray(app.handle())?;
      Ok(())
    })
    // 关主窗口 = 隐藏到托盘，程序继续跑（悬浮窗和到点确认都要靠它活着）；真正退出走托盘的 Quit
    .on_window_event(|window, event| {
      if window.label() == "main" {
        if let WindowEvent::CloseRequested { api, .. } = event {
          api.prevent_close();
          let _ = window.hide();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
