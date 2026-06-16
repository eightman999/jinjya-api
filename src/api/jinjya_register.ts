// src/api/jinjya_register.ts
import { Env } from '../../types/worker-configuration';
import { rateLimited, text } from '../utils/http';

export async function handleRegister(request: Request, env: Env): Promise<Response> {
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

	const { id, name, spreadsheet_url, owner, tags } = data;

	if (!id || !name || !spreadsheet_url) {
		return text('Missing required fields', 400);
	}

	// Validate tags if provided
	if (tags && typeof tags !== 'string') {
		if (typeof tags !== 'object' || Array.isArray(tags)) {
			return text('Tags must be an object', 400);
		}
		// Validate that all tag values are strings
		for (const [key, value] of Object.entries(tags)) {
			if (typeof key !== 'string' || typeof value !== 'string') {
				return text('All tag keys and values must be strings', 400);
			}
		}
	}

	// 重複チェック
	const check = await env.JINJYA_DB.prepare(`SELECT id FROM jinjya WHERE id = ?`).bind(id).first();
	if (check) {
		return text('神社IDが既に存在します', 409);
	}

	// 挿入
	try {
		await env.JINJYA_DB.prepare(`INSERT INTO jinjya (id, name, spreadsheet_url, owner, tags) VALUES (?, ?, ?, ?, ?)`)
			.bind(id, name, spreadsheet_url, owner || null, typeof tags === 'string' ? tags : JSON.stringify(tags || {}))
			.run();
	} catch (e) {
		// UNIQUE(owner, name) 制約違反など
		console.error('[Register Error]', e);
		return text('登録に失敗しました（同名・同オーナーの神社が既に存在する可能性があります）', 409);
	}

	return text('神社を登録しました', 201);
}
