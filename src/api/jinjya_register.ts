// src/api/jinjya_register.ts
import { Env } from '../../types/worker-configuration';

export async function handleRegister(request: Request, env: Env): Promise<Response> {
	console.log("🔥 handleRegister invoked");
	console.log("🧪 env.JINJYA_DB =", env.JINJYA_DB);

	if (request.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 });
	}

	const data = await request.json();
	const { id, name, spreadsheet_url, owner, tags } = data;

	if (!id || !name || !spreadsheet_url) {
		return new Response("Missing required fields", { status: 400 });
	}

	// Validate tags if provided
	let tagsJson = null;
	if (tags) {
		if (typeof tags !== 'object' || Array.isArray(tags)) {
			return new Response("Tags must be an object", { status: 400 });
		}
		// Validate that all tag values are strings
		for (const [key, value] of Object.entries(tags)) {
			if (typeof key !== 'string' || typeof value !== 'string') {
				return new Response("All tag keys and values must be strings", { status: 400 });
			}
		}
		tagsJson = JSON.stringify(tags);
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
		`INSERT INTO jinjya (id, name, spreadsheet_url, owner, tags) VALUES (?, ?, ?, ?, ?)`
	).bind(id, name, spreadsheet_url, owner || null, tagsJson).run();

	return new Response("神社を登録しました", { status: 201 });
}
