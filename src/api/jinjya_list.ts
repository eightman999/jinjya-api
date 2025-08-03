import { Env } from '../../types/worker-configuration';
import { checkRateLimit } from '../utils/checkRateLimit';

export async function handleJinjyaList(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	if (!await checkRateLimit(env, request.headers.get("CF-Connecting-IP") || "unknown")) {
		return new Response("Too Many Requests", { status: 429 });
	}

	const result = await env.JINJYA_DB.prepare(
		`SELECT id, name, owner, created_at FROM jinjya ORDER BY created_at DESC`
	).all();

	return new Response(JSON.stringify(result.results), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}

export async function handleList(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	if (!await checkRateLimit(env, request.headers.get("CF-Connecting-IP") || "unknown")) {
		return new Response("Too Many Requests", { status: 429 });
	}

	const result = await env.JINJYA_DB.prepare(
		`SELECT id, name, owner, created_at FROM jinjya ORDER BY created_at DESC`
	).all();

	return new Response(JSON.stringify(result.results), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}
