// src/api/draw.ts
import { Env } from '../../types/worker-configuration';
import { json, rateLimited, text } from '../utils/http';

export async function handleDraw(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	const { searchParams } = new URL(request.url);
	const jinjyaId = searchParams.get('jinjya') || 'default';

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

	// ランダムに1つ選ぶ
	const randomKey = keys[Math.floor(Math.random() * keys.length)];
	const omikujiStr = await env.JINJYA_STORE.get(randomKey);

	if (!omikujiStr) {
		return text('おみくじが壊れています…', 500);
	}

	return json(omikujiStr, 200);
}
