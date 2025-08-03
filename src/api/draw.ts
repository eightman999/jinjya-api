// src/api/draw.ts
import { Env } from '../../types/worker-configuration';

export async function handleDraw(request: Request, env: Env): Promise<Response> {
	const { searchParams } = new URL(request.url);
	const jinjyaId = searchParams.get("jinjya") || "default";

	const listResponse = await env.JINJYA_STORE.list({ prefix: `buffer:${jinjyaId}:` });
	const keys = listResponse.keys.map((k: { name: string }) => k.name);

	if (keys.length === 0) {
		return new Response("まだ誰も奉納していません🙏", { status: 404 });
	}

	// バッファ上限制御（例：100件超えたら古いもの削除）
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
		return new Response("おみくじが壊れています…", { status: 500 });
	}

	return new Response(omikujiStr, {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}
