// src/api/jinjya_register.ts
import { Env } from '../../types/worker-configuration';

export async function handleRegister(request: Request, env: Env): Promise<Response> {
	console.log("🔥 handleRegister invoked");
	console.log("🧪 env.JINJYA_DB =", env.JINJYA_DB);

	if (request.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 });
	}

	const data = await request.json();
	const { id, name, spreadsheet_url, owner } = data;

	if (!id || !name || !spreadsheet_url) {
		return new Response("Missing required fields", { status: 400 });
	}

	// 重複チェック
	const check = await env.JINJYA_DB.prepare(
		`SELECT id FROM jinjya WHERE id = ?`
	).bind(id).first();

	if (check) {
		return new Response("神社IDが既に存在します", { status: 409 });
	}

	// 挿入
	await env.JINJYA_DB.prepare(
		`INSERT INTO jinjya (id, name, spreadsheet_url, owner) VALUES (?, ?, ?, ?)`
	).bind(id, name, spreadsheet_url, owner || null).run();

	return new Response("神社を登録しました", { status: 201 });
}
