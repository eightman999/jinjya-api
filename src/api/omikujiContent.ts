// src/api/omikujiContent.ts
// submit / omikuji_add で共有するおみくじ内容バリデーション。
import { z } from 'zod';
import type { Env } from '../../types/worker-configuration';
import { OmikujiSchema } from './schema';
import { NG_WORDS } from '../constants/ngWords';

const MAX_LENGTH = 200;
type Omikuji = z.infer<typeof OmikujiSchema>;

function containsNGWords(value: string): boolean {
	return NG_WORDS.some((word) => value.includes(word));
}

/** 長さ・NGワード検証。問題があればエラーメッセージ、無ければ null。 */
function validateString(value: string): string | null {
	if (value.length > MAX_LENGTH) return 'Too long input';
	if (containsNGWords(value)) return 'Inappropriate content';
	return null;
}

/** 神社の固定タグカテゴリを返す（未設定なら空配列＝制限なし）。 */
export async function getAllowedTagCategories(env: Env, jinjyaId: string): Promise<string[]> {
	const row = await env.JINJYA_DB.prepare(`SELECT tags FROM jinjya WHERE id = ?`).bind(jinjyaId).first<{ tags: string | null }>();
	if (row && row.tags) {
		try {
			return Object.keys(JSON.parse(row.tags));
		} catch (e) {
			console.warn(`Invalid tags JSON for shrine ${jinjyaId}:`, e);
		}
	}
	return [];
}

/**
 * おみくじ内容を検証する。
 * - 固定タグカテゴリが設定されていれば、tags のキーがその範囲内か確認
 * - すべての文字列（tags/extra のキー・値を含む）の長さ・NGワード検証
 * @returns 問題があればエラーメッセージ、無ければ null
 */
export function validateOmikujiContent(omikuji: Omikuji, allowedTagCategories: string[]): string | null {
	if (allowedTagCategories.length > 0) {
		for (const tagCategory of Object.keys(omikuji.tags)) {
			if (!allowedTagCategories.includes(tagCategory)) {
				return `Invalid tag category "${tagCategory}". Allowed categories for this shrine: ${allowedTagCategories.join(', ')}`;
			}
		}
	}

	for (const value of Object.values(omikuji)) {
		if (typeof value === 'string') {
			const err = validateString(value);
			if (err) return err;
		} else if (typeof value === 'object' && value !== null) {
			for (const [nestedKey, nestedValue] of Object.entries(value)) {
				const keyErr = validateString(nestedKey);
				if (keyErr) return keyErr;
				if (typeof nestedValue === 'string') {
					const valErr = validateString(nestedValue);
					if (valErr) return valErr;
				}
			}
		}
	}

	return null;
}
