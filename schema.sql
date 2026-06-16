-- schema.sql（本番用、常に実行できるように）
DROP TABLE IF EXISTS jinjya;

CREATE TABLE jinjya (
						id TEXT PRIMARY KEY,
						name TEXT NOT NULL,
						spreadsheet_url TEXT NOT NULL,
						owner TEXT, -- 任意（ownerなしでも登録可能なオープン運用）
						tags TEXT, -- JSON string of fixed tag categories for this shrine
						created_at INTEGER DEFAULT (strftime('%s', 'now')),
						CONSTRAINT unique_owner_name UNIQUE(owner, name)
);

-- 各神社の永続おみくじプール。/api/draw はここから抽選する。
-- publish/cron では削除されない（KVバッファ buffer: とは別物）。
-- IF NOT EXISTS なのでプールのデータを保持したまま安全に再実行できる。
CREATE TABLE IF NOT EXISTS omikuji (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						jinjya TEXT NOT NULL,        -- 神社ID
						fortune TEXT NOT NULL,       -- 運勢（大吉など）
						message TEXT NOT NULL,       -- メッセージ
						tags TEXT NOT NULL DEFAULT '{}',  -- JSON
						extra TEXT NOT NULL DEFAULT '{}', -- JSON
						created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_omikuji_jinjya ON omikuji(jinjya);
