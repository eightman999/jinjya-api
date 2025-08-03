// src/api/jinjya_register.ts
import { Env } from '../../types/worker-configuration';

export async function handleJinjyaRegister(request: Request, env: Env): Promise<Response> {
	const body = await request.json();
	const { id, name, spreadsheet_url, owner } = body;

	if (!id || !name || !spreadsheet_url) {
		return new Response("Missing fields", { status: 400 });
	}

	try {
		await env.DB.prepare(`
      INSERT INTO jinjya (id, name, spreadsheet_url, owner)
      VALUES (?, ?, ?, ?)
    `).bind(id, name, spreadsheet_url, owner || null).run();

		return new Response("神社を登録しました⛩️", { status: 200 });
	} catch (e) {
		if (e instanceof Error) {
			return new Response("登録失敗：" + e.message, { status: 500 });
		}
		return new Response("登録失敗：不明なエラー", { status: 500 });
	}
}
