import { OmikujiSchema } from './schema';
import { Env } from '../../types/worker-configuration';
import { json, rateLimited } from '../utils/http';

export async function handleRead(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	// ?jinjya= 指定があればその神社のみ、なければバッファ全体を読む
	const jinjyaId = new URL(request.url).searchParams.get('jinjya');
	const prefix = jinjyaId ? `buffer:${jinjyaId}:` : 'buffer:';

	const list = await env.JINJYA_STORE.list({ prefix });

	const entries = [];
	for (const key of list.keys) {
		const raw = await env.JINJYA_STORE.get(key.name);
		if (!raw) continue;

		try {
			const parsed = OmikujiSchema.parse(JSON.parse(raw));
			entries.push(parsed);
		} catch (e) {
			console.warn('Invalid entry in buffer:', key.name);
		}
	}

	return json(JSON.stringify(entries, null, 2), 200);
}
