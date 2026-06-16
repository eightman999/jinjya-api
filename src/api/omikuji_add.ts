// src/api/omikuji_add.ts
// 神社の永続おみくじプール(D1 omikuji テーブル)へ1件追加する。
// draw はこのプールから抽選するため、ここに入れたおみくじは publish/cron では消えない。
import { z } from 'zod';
import { OmikujiSchema } from './schema';
import type { Env } from '../../types/worker-configuration';
import { rateLimited, text } from '../utils/http';
import { getAllowedTagCategories, validateOmikujiContent } from './omikujiContent';

export async function handleOmikujiAdd(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	let omikuji: z.infer<typeof OmikujiSchema>;
	try {
		omikuji = OmikujiSchema.parse(await request.json());
	} catch (err) {
		console.error('[OmikujiAdd] invalid payload', err);
		return text('Invalid submission', 400);
	}

	try {
		const allowed = await getAllowedTagCategories(env, omikuji.jinjya);
		const validationError = validateOmikujiContent(omikuji, allowed);
		if (validationError) return text(validationError, 400);

		await env.JINJYA_DB.prepare(`INSERT INTO omikuji (jinjya, fortune, message, tags, extra) VALUES (?, ?, ?, ?, ?)`)
			.bind(omikuji.jinjya, omikuji.fortune, omikuji.message, JSON.stringify(omikuji.tags), JSON.stringify(omikuji.extra))
			.run();

		return text('おみくじをプールに追加しました🎋', 201);
	} catch (err) {
		console.error('[OmikujiAdd]', err);
		return text('Internal Server Error', 500);
	}
}
