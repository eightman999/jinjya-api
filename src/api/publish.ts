import { OmikujiSchema } from "./schema";
import { Env } from '../../types/worker-configuration';

const GAS_URL = "https://script.google.com/macros/s/AKfycbzCA60ujb9pU4tbC2ZD5i1PatnMu81wR9Hw6DKHUbZ2vRen_r_aXDaoEt2aK9cvwt03/exec";
const BUFFER_PREFIX = "buffer:furin:"; // Ver0では1神社固定
const BUFFER_DURATION_MS = 60 * 60 * 1000; // 1時間分
//ID-AKfycbzCA60ujb9pU4tbC2ZD5i1PatnMu81wR9Hw6DKHUbZ2vRen_r_aXDaoEt2aK9cvwt03
export async function handlePublish(env: Env): Promise<Response> {
	const now = Date.now();
	const cutoff = now - BUFFER_DURATION_MS;

	// 1時間以内に投稿されたバッファのみ取得
	const list = await env.JINJYA_STORE.list({ prefix: BUFFER_PREFIX });

	const validEntries = [];

	for (const key of list.keys) {
		// key例: buffer:furin:1690000000000
		const timestamp = parseInt(key.name.split(":")[2]);
		if (timestamp >= cutoff) {
			const raw = await env.JINJYA_STORE.get(key.name);
			if (!raw) continue;
			try {
				const parsed = OmikujiSchema.parse(JSON.parse(raw));
				validEntries.push(parsed);
			} catch (e) {
				console.warn("Invalid buffer data:", e);
			}
		}
	}

	if (validEntries.length === 0) {
		return new Response("No entries to publish", { status: 200 });
	}

	// GASにPOST
	const response = await fetch(GAS_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(validEntries),
	});

	if (!response.ok) {
		console.error("GAS投稿に失敗", await response.text());
		return new Response("Failed to send to GAS", { status: 500 });
	}

	// 投稿済みのバッファを削除
	for (const key of list.keys) {
		const timestamp = parseInt(key.name.split(":")[2]);
		if (timestamp >= cutoff) {
			await env.JINJYA_STORE.delete(key.name);
		}
	}

	return new Response("Published successfully", { status: 200 });
}
