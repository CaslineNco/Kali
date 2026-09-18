-- 拆解步骤：每个时间块可以带一份 [{text, done}] 的清单，JSON 存一列
ALTER TABLE time_blocks ADD COLUMN steps TEXT NOT NULL DEFAULT '[]';

-- 本地设置（API key 等）。value 一律存字符串
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
