import { Env } from '../../types/worker-configuration';
import { OmikujiSchema } from './schema';

const GAS_URL = "https://script.google.com/macros/s/AKfycbzYcT2Hjr4xqNwUJwt3uqGdnKjB0PwnI8zjJkWLKNWdlpp7vCVmQyoAGZ654Ln9Sp54Ig/exec";

const JINJYA_URLS: Record<string, string> = {
	furin: "https://script.google.com/macros/s/AKfycb.../exec",
	sakura: "https://script.google.com/macros/s/AKfycb.../exec",
};

export async function handlePublish(env: Env): Promise<Response> {
	const cutoff = Date.now() - 60 * 1000; // 1分前のタイムスタンプ

	for (const [jinjyaId, gasUrl] of Object.entries(JINJYA_URLS)) {
		const list = await env.JINJYA_STORE.list({ prefix: `buffer:${jinjyaId}:` });
		const validEntries = [];

		for (const key of list.keys) {
			const timestamp = parseInt(key.name.split(":")[2]);
			if (timestamp >= cutoff) {
				const raw = await env.JINJYA_STORE.get(key.name);
				if (!raw) continue;
				try {
					const parsed = OmikujiSchema.parse(JSON.parse(raw));
					validEntries.push(parsed);
				} catch (_) {}
			}
		}

		if (validEntries.length === 0) continue;

		const res = await fetch(gasUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validEntries),
		});

		if (res.ok) {
			for (const key of list.keys) {
				const timestamp = parseInt(key.name.split(":")[2]);
				if (timestamp >= cutoff) {
					await env.JINJYA_STORE.delete(key.name);
				}
			}
		}
	}

	return new Response("Published successfully", { status: 200 });
}
