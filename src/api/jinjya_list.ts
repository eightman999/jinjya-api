import { Env } from '../../types/worker-configuration';

export async function handleJinjyaList(env: Env): Promise<Response> {
	const result = await env.DB.prepare(`SELECT id, name FROM jinjya`).all();

	return new Response(JSON.stringify(result.results), {
		headers: { "Content-Type": "application/json" },
	});
}
