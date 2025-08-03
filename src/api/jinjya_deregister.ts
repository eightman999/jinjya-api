import { Env } from '../../types/worker-configuration';

export async function handleDeregister(request: Request, env: Env): Promise<Response> {
	if (request.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 });
	}

	let data: any;
	try {
		data = await request.json();
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	const { id, owner, spreadsheet_url } = data;

	if (!id || !owner || !spreadsheet_url) {
		return new Response("Missing required fields (id, owner, spreadsheet_url)", { status: 400 });
	}

	const record = await env.JINJYA_DB.prepare(
		`SELECT owner, spreadsheet_url FROM jinjya WHERE id = ? LIMIT 1`
	).bind(id).first<{ owner: string, spreadsheet_url: string }>();

	if (!record) {
		return new Response("神社が見つかりません", { status: 404 });
	}

	if (record.owner !== owner || record.spreadsheet_url !== spreadsheet_url) {
		return new Response("認証エラー：オーナーまたはURLが一致しません", { status: 403 });
	}

	await env.JINJYA_DB.prepare(
		`DELETE FROM jinjya WHERE id = ?`
	).bind(id).run();

	return new Response(`神社「${id}」を削除しました`, { status: 200 });
}
