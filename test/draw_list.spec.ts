import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

// /api/draw と /api/jinjya/list の D1 プール連携テスト。
// テスト用 D1 は空なので、schema.sql 相当のテーブルをここで作る。
beforeAll(async () => {
	await env.JINJYA_DB.exec(
		`CREATE TABLE IF NOT EXISTS jinjya (id TEXT PRIMARY KEY, name TEXT NOT NULL, spreadsheet_url TEXT NOT NULL, owner TEXT, tags TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now')));`
	);
	await env.JINJYA_DB.exec(
		`CREATE TABLE IF NOT EXISTS omikuji (id INTEGER PRIMARY KEY AUTOINCREMENT, jinjya TEXT NOT NULL, fortune TEXT NOT NULL, message TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '{}', extra TEXT NOT NULL DEFAULT '{}', created_at INTEGER DEFAULT (strftime('%s', 'now')));`
	);
	await env.JINJYA_DB.batch([
		env.JINJYA_DB.prepare(`INSERT INTO jinjya (id, name, spreadsheet_url, owner, tags) VALUES ('joju', '成就神社', 'https://example.com/a', 'eightman', '{"仕事":"仕事運","学業":"学業運"}')`),
		env.JINJYA_DB.prepare(`INSERT INTO jinjya (id, name, spreadsheet_url, owner, tags) VALUES ('furin', '風鈴神社', 'https://example.com/b', 'eightman', NULL)`),
		env.JINJYA_DB.prepare(`INSERT INTO jinjya (id, name, spreadsheet_url, owner, tags) VALUES ('broken', '壊れ神社', 'https://example.com/c', NULL, 'not json')`),
		env.JINJYA_DB.prepare(`INSERT INTO omikuji (jinjya, fortune, message, tags, extra) VALUES ('joju', '大吉', 'joju msg', '{"仕事":"良し"}', '{"ラッキーカラー":"青"}')`),
		env.JINJYA_DB.prepare(`INSERT INTO omikuji (jinjya, fortune, message, tags, extra) VALUES ('furin', '中吉', 'furin msg', '{}', '{}')`),
	]);
});

describe('/api/jinjya/list', () => {
	it('returns shrines with fixed tags expanded to an object', async () => {
		const res = await SELF.fetch('https://example.com/api/jinjya/list');
		expect(res.status).toBe(200);
		const list = (await res.json()) as Array<{ id: string; tags: Record<string, string> }>;
		const byId = Object.fromEntries(list.map((j) => [j.id, j]));
		expect(byId.joju.tags).toEqual({ 仕事: '仕事運', 学業: '学業運' });
		expect(byId.furin.tags).toEqual({});
		expect(byId.broken.tags).toEqual({});
	});
});

// レート制限（IP単位）を避けるため、リクエストごとに別IPを名乗る
let ipCounter = 0;
function draw(query = '') {
	ipCounter += 1;
	return SELF.fetch(`https://example.com/api/draw${query}`, { headers: { 'CF-Connecting-IP': `10.0.0.${ipCounter}` } });
}

describe('/api/draw', () => {
	it('draws from the given shrine only', async () => {
		for (let i = 0; i < 5; i++) {
			const res = await draw('?jinjya=joju');
			expect(res.status).toBe(200);
			const body = (await res.json()) as { jinjya: string; fortune: string; tags: Record<string, string>; extra: Record<string, string> };
			expect(body.jinjya).toBe('joju');
			expect(body.fortune).toBe('大吉');
			expect(body.tags).toEqual({ 仕事: '良し' });
			expect(body.extra).toEqual({ ラッキーカラー: '青' });
		}
	});

	it('draws from all shrines when jinjya is omitted', async () => {
		const seen = new Set<string>();
		for (let i = 0; i < 30; i++) {
			const res = await draw();
			expect(res.status).toBe(200);
			const body = (await res.json()) as { jinjya: string };
			expect(['joju', 'furin']).toContain(body.jinjya);
			seen.add(body.jinjya);
		}
		expect(seen.size).toBe(2);
	});

	it('returns 404 text for a shrine with no omikuji', async () => {
		const res = await draw('?jinjya=nothing');
		expect(res.status).toBe(404);
		expect(await res.text()).toBe('まだ誰も奉納していません🙏');
	});
});
