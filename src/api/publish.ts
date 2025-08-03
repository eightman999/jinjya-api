import { OmikujiSchema } from "./schema";
import type { Env } from "../../types/worker-configuration";
import { z } from "zod";

const BUFFER_PREFIX = "buffer:"; // 例: buffer:furin:123456789
const BUFFER_DURATION_MS = 60 * 60 * 1000;

export async function handlePublish(env: Env): Promise<Response> {
	const now = Date.now();
	const cutoff = now - BUFFER_DURATION_MS;

	const list = await env.JINJYA_STORE.list({ prefix: BUFFER_PREFIX });

	// 神社ごとにデータを分ける: Map<string, z.infer<typeof OmikujiSchema>[]>
	const grouped: Record<string, z.infer<typeof OmikujiSchema>[]> = {};

	for (const key of list.keys) {
		const [_, jinjyaId, timestampStr] = key.name.split(":");
		const timestamp = parseInt(timestampStr);
		if (timestamp < cutoff) continue;

		const raw = await env.JINJYA_STORE.get(key.name);
		if (!raw) continue;

		try {
			const parsed = OmikujiSchema.parse(JSON.parse(raw));
			if (!grouped[jinjyaId]) grouped[jinjyaId] = [];
			grouped[jinjyaId].push(parsed);
		} catch (e) {
			console.warn("Invalid buffer data:", e);
		}
	}

	let successCount = 0;
	let errorMessages: string[] = [];

	for (const jinjyaId of Object.keys(grouped)) {
		// ① 神社URL取得（D1）
		const result = await env.JINJYA_DB.prepare(
			`SELECT spreadsheet_url FROM jinjya WHERE id = ? LIMIT 1`
		).bind(jinjyaId).first<string>("spreadsheet_url");

		if (!result) {
			errorMessages.push(`神社ID "${jinjyaId}" のURLが見つかりません`);
			continue;
		}

		// ② POST送信
		const response = await fetch(result, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(grouped[jinjyaId]),
		});

		if (!response.ok) {
			const text = await response.text();
			errorMessages.push(`"${jinjyaId}" 投稿失敗: ${text}`);
			continue;
		}

		// ③ 成功したバッファを削除
		for (const entry of grouped[jinjyaId]) {
			const timeKey = Object.keys(list.keys).find(k => k.startsWith(`buffer:${jinjyaId}:`) && k.includes(entry.message));
			if (timeKey) {
				await env.JINJYA_STORE.delete(timeKey);
			}
		}

		successCount++;
	}

	if (successCount === 0) {
		return new Response("投稿失敗:\n" + errorMessages.join("\n"), { status: 500 });
	}

	return new Response(`成功: ${successCount} 神社\n${errorMessages.join("\n")}`, {
		status: errorMessages.length ? 207 : 200, // マルチステータス
	});
}
