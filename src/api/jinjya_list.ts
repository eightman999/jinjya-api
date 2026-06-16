import { Env } from '../../types/worker-configuration';
import { json, rateLimited } from '../utils/http';

export async function handleList(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	const result = await env.JINJYA_DB.prepare(`SELECT id, name, owner, created_at FROM jinjya ORDER BY created_at DESC`).all();

	return json(result.results, 200);
}
