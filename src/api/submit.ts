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
			}
		}

		// ✅ バッファキーを作成
		const jinjyaId = body.jinjya ?? "default";
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
