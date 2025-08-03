import { OmikujiSchema } from "./schema";
import { Env } from '../../types/worker-configuration';

const BUFFER_PREFIX = "buffer:furin:"; // 現状1神社固定

export async function handleRead(env: Env): Promise<Response> {
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
