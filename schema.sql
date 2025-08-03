-- schema.sql（本番用、常に実行できるように）
DROP TABLE IF EXISTS jinjya;

CREATE TABLE jinjya (
						id TEXT PRIMARY KEY,
						name TEXT NOT NULL,
						spreadsheet_url TEXT NOT NULL,
						owner TEXT NOT NULL,
						tags TEXT, -- JSON string of fixed tag categories for this shrine
						created_at INTEGER DEFAULT (strftime('%s', 'now')),
						CONSTRAINT unique_owner_name UNIQUE(owner, name)
);
