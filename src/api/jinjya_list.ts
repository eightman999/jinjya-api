import { Env } from '../../types/worker-configuration';
import { json, rateLimited } from '../utils/http';

export async function handleList(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	const result = await env.JINJYA_DB.prepare(`SELECT id, name, owner, tags, created_at FROM jinjya ORDER BY created_at DESC`).all<{
		id: string;
		name: string;
		owner: string | null;
		tags: string | null;
		created_at: number;
	}>();

	// tags は固定タグカテゴリ（JSON文字列）。クライアントが奉納フォームを組み立てられるよう
	// オブジェクトに展開して返す。未設定・壊れている場合は {} （制限なし）。
	const list = result.results.map((row) => ({
		id: row.id,
		name: row.name,
		owner: row.owner,
		tags: parseTags(row.tags),
		created_at: row.created_at,
	}));

	return json(list, 200);
}

function parseTags(value: string | null): Record<string, string> {
	if (!value) return {};
	try {
		const parsed = JSON.parse(value);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
