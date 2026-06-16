// src/api/submit.ts
import { z } from 'zod';
import { OmikujiSchema } from './schema';
import type { Env } from '../../types/worker-configuration';
import { NG_WORDS } from '../constants/ngWords';
import { rateLimited, text } from '../utils/http';

const MAX_LENGTH = 200;

/**
 * NGワードが含まれているかチェックする関数
 * @param value チェックするテキスト
 * @returns NGワードが含まれていればtrue、そうでなければfalse
 */
function containsNGWords(value: string): boolean {
	return NG_WORDS.some((word) => value.includes(word));
}

/**
 * 文字列が長すぎず、NGワードを含まないか検証する。
 * @returns 問題があればエラーメッセージ、なければ null
 */
function validateString(value: string): string | null {
	if (value.length > MAX_LENGTH) return 'Too long input';
	if (containsNGWords(value)) return 'Inappropriate content';
	return null;
}

export async function handleSubmit(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	let omikuji: z.infer<typeof OmikujiSchema>;
	try {
		const body = await request.json();
		// ✅ スキーマ検証
		omikuji = OmikujiSchema.parse(body);
	} catch (err) {
		console.error('[Submit Error] invalid payload', err);
		return text('Invalid submission', 400);
	}

	try {
		const jinjyaId = omikuji.jinjya;

		// ✅ 神社の固定タグカテゴリを取得・検証
		const jinjyaData = await env.JINJYA_DB.prepare(`SELECT tags FROM jinjya WHERE id = ?`).bind(jinjyaId).first();

		// 神社の固定タグカテゴリを取得（なければ制限なし）
		let allowedTagCategories: string[] = [];
		if (jinjyaData && jinjyaData.tags) {
			try {
				const shrineTagConfig = JSON.parse(jinjyaData.tags as string);
				allowedTagCategories = Object.keys(shrineTagConfig);
			} catch (e) {
				console.warn(`Invalid tags JSON for shrine ${jinjyaId}:`, e);
			}
		}

		// ✅ ユーザー入力タグの検証（神社が固定タグを設定している場合のみ）
		if (allowedTagCategories.length > 0) {
			for (const tagCategory of Object.keys(omikuji.tags)) {
				if (!allowedTagCategories.includes(tagCategory)) {
					return text(
						`Invalid tag category "${tagCategory}". Allowed categories for this shrine: ${allowedTagCategories.join(', ')}`,
						400
					);
				}
			}
		}

		// ✅ NGワードチェック & 文字数制限
		for (const value of Object.values(omikuji)) {
			if (typeof value === 'string') {
				const err = validateString(value);
				if (err) return text(err, 400);
			} else if (typeof value === 'object' && value !== null) {
				// tags/extra オブジェクトはキー・値の両方をチェックする
				for (const [nestedKey, nestedValue] of Object.entries(value)) {
					const keyErr = validateString(nestedKey);
					if (keyErr) return text(keyErr, 400);
					if (typeof nestedValue === 'string') {
						const valErr = validateString(nestedValue);
						if (valErr) return text(valErr, 400);
					}
				}
			}
		}

		// ✅ バッファキーを作成して保存
		const timestamp = Date.now();
		const key = `buffer:${jinjyaId}:${timestamp}`;
		await env.JINJYA_STORE.put(key, JSON.stringify(omikuji));

		return text('奉納を受け付けました🙏', 200);
	} catch (err) {
		console.error('[Submit Error]', err);
		return text('Internal Server Error', 500);
	}
}
