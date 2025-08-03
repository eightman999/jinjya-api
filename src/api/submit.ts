// src/api/submit.ts
import { z } from "zod";
import { OmikujiSchema } from "./schema";
import type { Env } from '../../types/worker-configuration';
import { NG_WORDS } from "../constants/ngWords";


const MAX_LENGTH = 200;
/**
 * NGワードが含まれているかチェックする関数
 * @param text チェックするテキスト
 * @returns NGワードが含まれていればtrue、そうでなければfalse
 */
function containsNGWords(text: string): boolean {
	return NG_WORDS.some((word) => text.includes(word));
}

export async function handleSubmit(
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = await request.json();

		// ✅ スキーマ検証
		const omikuji = OmikujiSchema.parse(body);

		// ✅ 神社の固定タグカテゴリを取得・検証
		const jinjyaId = body.jinjya ?? "default";
		const jinjyaData = await env.JINJYA_DB.prepare(
			`SELECT tags FROM jinjya WHERE id = ?`
		).bind(jinjyaId).first();

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
		if (allowedTagCategories.length > 0 && omikuji.tags) {
			for (const tagCategory of Object.keys(omikuji.tags)) {
				if (!allowedTagCategories.includes(tagCategory)) {
					return new Response(
						`Invalid tag category "${tagCategory}". Allowed categories for this shrine: ${allowedTagCategories.join(', ')}`, 
						{ status: 400 }
					);
				}
			}
		}

		// ✅ NGワードチェック & 文字数制限
		for (const key of Object.keys(omikuji)) {
			const value = omikuji[key as keyof typeof omikuji];
			if (typeof value === "string") {
				if (value.length > MAX_LENGTH) {
					return new Response("Too long input", { status: 400 });
				}
				if (containsNGWords(value)) {
					return new Response("Inappropriate content", { status: 400 });
				}
			} else if (typeof value === "object" && value !== null) {
				// tags/extraオブジェクトの値をチェック
				for (const nestedValue of Object.values(value)) {
					if (typeof nestedValue === "string") {
						if (nestedValue.length > MAX_LENGTH) {
							return new Response("Too long input", { status: 400 });
						}
						if (containsNGWords(nestedValue)) {
							return new Response("Inappropriate content", { status: 400 });
						}
					}
				}
			}
		}

		// ✅ バッファキーを作成
		// jinjyaIdは既に上で取得済み
		const timestamp = Date.now();
		const key = `buffer:${jinjyaId}:${timestamp}`;

		// ✅ 保存
		await env.JINJYA_STORE.put(key, JSON.stringify(omikuji));

		return new Response("奉納を受け付けました🙏", { status: 200 });
	} catch (err: any) {
		console.error("[Submit Error]", err);
		return new Response("Invalid submission", { status: 400 });
	}
}
