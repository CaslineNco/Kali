-- 时间块：一天里的一段计划或一段已经发生的记录。
-- 只有 status = 'confirmed' 的块才计入当天时长（决定格子颜色）。
CREATE TABLE IF NOT EXISTS time_blocks (
  id          TEXT PRIMARY KEY,               -- uuid
  date        TEXT NOT NULL,                  -- 'YYYY-MM-DD'，本地日历日
  kind        TEXT NOT NULL CHECK (kind IN ('focus', 'fun')),
  start_min   INTEGER,                        -- 距当天 00:00 的分钟数；补记的块没有起止时间，为 NULL
  end_min     INTEGER,
  planned_min INTEGER NOT NULL,               -- 计划时长（补记时 = 实际时长）
  actual_min  INTEGER,                        -- 确认时填入；改时长则与 planned_min 不同
  status      TEXT NOT NULL CHECK (status IN ('planned', 'confirmed', 'skipped')),
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,                  -- ISO 8601
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT                            -- 软删除，给将来云同步留的；查询一律过滤掉非 NULL
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks (date) WHERE deleted_at IS NULL;
