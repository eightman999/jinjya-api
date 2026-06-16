// src/api/draw.ts
import { Env } from '../../types/worker-configuration';
import { json, rateLimited, text } from '../utils/http';

function safeParse(value: string | null): Record<string, string> {
	if (!value) return {};
	try {
		return JSON.parse(value);
	} catch {
		return {};
	}
}

export async function handleDraw(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	const { searchParams } = new URL(request.url);
	const jinjyaId = searchParams.get('jinjya') || 'default';

	// 1) 永続プール(D1)から抽選。publish/cron では消えないので常時引ける。
	//    テーブル未作成などで失敗しても、KVバッファへフォールバックする。
	try {
		const row = await env.JINJYA_DB.prepare(
			`SELECT fortune, message, tags, extra FROM omikuji WHERE jinjya = ? ORDER BY RANDOM() LIMIT 1`
		)
			.bind(jinjyaId)
			.first<{ fortune: string; message: string; tags: string | null; extra: string | null }>();

		if (row) {
			return json(
				{
					jinjya: jinjyaId,
					fortune: row.fortune,
					message: row.message,
					tags: safeParse(row.tags),
					extra: safeParse(row.extra),
				},
				200
			);
		}
	} catch (e) {
		console.warn('omikuji pool query failed, falling back to KV buffer:', e);
	}

	// 2) フォールバック: 従来のKVバッファから抽選（投稿バッファ）
	const listResponse = await env.JINJYA_STORE.list({ prefix: `buffer:${jinjyaId}:` });
	const keys = listResponse.keys.map((k: { name: string }) => k.name);

	if (keys.length === 0) {
		return text('まだ誰も奉納していません🙏', 404);
	}

	// バッファ上限制御（上限を超えたら古いものから削除）
	const MAX_BUFFER = 1000;
	if (keys.length > MAX_BUFFER) {
		const sorted = keys.sort(); // timestamp順
		const excess = sorted.slice(0, keys.length - MAX_BUFFER);
		await Promise.all(excess.map((k: string) => env.JINJYA_STORE.delete(k)));
	}

	const randomKey = keys[Math.floor(Math.random() * keys.length)];
	const omikujiStr = await env.JINJYA_STORE.get(randomKey);

	if (!omikujiStr) {
		return text('おみくじが壊れています…', 500);
	}

	return json(omikujiStr, 200);
}
