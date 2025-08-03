import { Env } from '../../types/worker-configuration';

export async function handleJinjyaList(env: Env): Promise<Response> {
	const result = await env.JINJYA_DB.prepare(
		`SELECT id, name, owner, created_at FROM jinjya ORDER BY created_at DESC`
	).all();

	return new Response(JSON.stringify(result.results), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}

export async function handleList(env: Env): Promise<Response> {
	const result = await env.JINJYA_DB.prepare(
		`SELECT id, name, owner, created_at FROM jinjya ORDER BY created_at DESC`
	).all();

	return new Response(JSON.stringify(result.results), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}
