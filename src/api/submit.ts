// src/api/submit.ts
import { z } from 'zod';
import { OmikujiSchema } from './schema';
import type { Env } from '../../types/worker-configuration';
import { rateLimited, text } from '../utils/http';
import { getAllowedTagCategories, validateOmikujiContent } from './omikujiContent';

export async function handleSubmit(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	let omikuji: z.infer<typeof OmikujiSchema>;
	try {
		omikuji = OmikujiSchema.parse(await request.json());
	} catch (err) {
		console.error('[Submit Error] invalid payload', err);
		return text('Invalid submission', 400);
	}

	try {
		const jinjyaId = omikuji.jinjya;

		// 神社の固定タグカテゴリに対する検証 + NGワード/文字数検証
		const allowed = await getAllowedTagCategories(env, jinjyaId);
		const validationError = validateOmikujiContent(omikuji, allowed);
		if (validationError) return text(validationError, 400);

		// バッファキーを作成して保存
		const key = `buffer:${jinjyaId}:${Date.now()}`;
		await env.JINJYA_STORE.put(key, JSON.stringify(omikuji));

		return text('奉納を受け付けました🙏', 200);
	} catch (err) {
		console.error('[Submit Error]', err);
		return text('Internal Server Error', 500);
	}
}
