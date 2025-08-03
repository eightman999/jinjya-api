import { OmikujiSchema } from "./schema";
import { Env } from '../../types/worker-configuration';
import { checkRateLimit } from '../utils/checkRateLimit';

const BUFFER_PREFIX = "buffer:furin:"; // 現状1神社固定

export async function handleRead(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	if (!await checkRateLimit(env, request.headers.get("CF-Connecting-IP") || "unknown")) {
		return new Response("Too Many Requests", { status: 429 });
	}

	const list = await env.JINJYA_STORE.list({ prefix: BUFFER_PREFIX });

	const entries = [];

	for (const key of list.keys) {
		const raw = await env.JINJYA_STORE.get(key.name);
		if (!raw) continue;

		try {
			const parsed = OmikujiSchema.parse(JSON.parse(raw));
			entries.push(parsed);
		} catch (e) {
			console.warn("Invalid entry in buffer:", key.name);
		}
	}

	return new Response(JSON.stringify(entries, null, 2), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*", // CORS開放（必要に応じて制限）
		},
	});
}
