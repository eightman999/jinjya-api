-- 0001_add_omikuji.sql
-- 既存の本番DBに「永続おみくじプール」を追加する非破壊マイグレーション。
-- jinjya テーブルや既存データには一切触れない（DROP しない）。
--
-- 適用例:
--   wrangler d1 execute jinjya-db --remote --file=migrations/0001_add_omikuji.sql

CREATE TABLE IF NOT EXISTS omikuji (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	jinjya TEXT NOT NULL,
	fortune TEXT NOT NULL,
	message TEXT NOT NULL,
	tags TEXT NOT NULL DEFAULT '{}',
	extra TEXT NOT NULL DEFAULT '{}',
	created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_omikuji_jinjya ON omikuji(jinjya);
