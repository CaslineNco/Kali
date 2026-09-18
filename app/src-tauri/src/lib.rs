use tauri_plugin_sql::{Migration, MigrationKind};

/// 数据库结构变更全部走这里，按 version 递增追加，永远不要改已经发布过的那条。
fn migrations() -> Vec<Migration> {
  vec![Migration {
    version: 1,
    description: "create time_blocks",
    sql: include_str!("../migrations/0001_time_blocks.sql"),
    kind: MigrationKind::Up,
  }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
