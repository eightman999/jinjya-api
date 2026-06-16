import { Env } from '../../types/worker-configuration';
import { rateLimited, text } from '../utils/http';

export async function handleDeregister(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	if (request.method !== 'POST') {
		return text('Method Not Allowed', 405);
	}

	let data: any;
	try {
		data = await request.json();
	} catch {
		return text('Invalid JSON', 400);
	}

	const { id, owner, spreadsheet_url } = data;

	if (!id || !owner || !spreadsheet_url) {
		return text('Missing required fields (id, owner, spreadsheet_url)', 400);
	}

	const record = await env.JINJYA_DB.prepare(`SELECT owner, spreadsheet_url FROM jinjya WHERE id = ? LIMIT 1`)
		.bind(id)
		.first<{ owner: string; spreadsheet_url: string }>();

	if (!record) {
		return text('神社が見つかりません', 404);
	}

	if (record.owner !== owner || record.spreadsheet_url !== spreadsheet_url) {
		return text('認証エラー：オーナーまたはURLが一致しません', 403);
	}

	await env.JINJYA_DB.prepare(`DELETE FROM jinjya WHERE id = ?`).bind(id).run();

	return text(`神社「${id}」を削除しました`, 200);
}
