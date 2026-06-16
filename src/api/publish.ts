import { OmikujiSchema } from './schema';
import type { Env } from '../../types/worker-configuration';
import { z } from 'zod';
import { rateLimited, text } from '../utils/http';

const BUFFER_PREFIX = 'buffer:'; // 例: buffer:furin:123456789
const BUFFER_DURATION_MS = 60 * 60 * 1000;

type Omikuji = z.infer<typeof OmikujiSchema>;
type PublishResult = { successCount: number; errors: string[] };

/**
 * KV バッファに溜まったおみくじを神社ごとに集計し、登録済み Google Sheets
 * webhook へ転送する。Cron からも HTTP ハンドラからも呼べるよう、HTTP の
 * 文脈（Request / レート制限）には依存しない。
 */
export async function publishBuffered(env: Env): Promise<PublishResult> {
	const now = Date.now();
	const cutoff = now - BUFFER_DURATION_MS;

	const list = await env.JINJYA_STORE.list({ prefix: BUFFER_PREFIX });

	// 神社ごとに { 削除用のKVキー, 送信データ } を束ねる
	const grouped: Record<string, { key: string; data: Omikuji & { timestamp: number } }[]> = {};

	for (const key of list.keys) {
		// キー形式: buffer:{jinjyaId}:{timestamp}
		const parts = key.name.split(':');
		const timestamp = parseInt(parts[parts.length - 1], 10);
		const jinjyaId = parts.slice(1, -1).join(':');
		if (!Number.isFinite(timestamp) || timestamp < cutoff) continue;

		const raw = await env.JINJYA_STORE.get(key.name);
		if (!raw) continue;

		try {
			const parsed = OmikujiSchema.parse(JSON.parse(raw));
			// 元データには timestamp が無いため、KV キーから復元して付与する
			(grouped[jinjyaId] ??= []).push({ key: key.name, data: { ...parsed, timestamp } });
		} catch (e) {
			console.warn('Invalid buffer data:', e);
		}
	}

	let successCount = 0;
	const errors: string[] = [];

	for (const jinjyaId of Object.keys(grouped)) {
		const entries = grouped[jinjyaId];

		// ① 神社URL取得（D1）
		const url = await env.JINJYA_DB.prepare(`SELECT spreadsheet_url FROM jinjya WHERE id = ? LIMIT 1`)
			.bind(jinjyaId)
			.first<string>('spreadsheet_url');

		if (!url) {
			errors.push(`神社ID "${jinjyaId}" のURLが見つかりません`);
			continue;
		}

		// ② POST送信
		let response: Response;
		try {
			response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(entries.map((e) => e.data)),
			});
		} catch (e) {
			console.error(`"${jinjyaId}" webhook fetch failed:`, e);
			errors.push(`"${jinjyaId}" 投稿失敗: ネットワークエラー`);
			continue;
		}

		if (!response.ok) {
			// 生レスポンスはログにのみ残し、クライアントには漏らさない
			const detail = await response.text().catch(() => '');
			console.error(`"${jinjyaId}" webhook responded ${response.status}:`, detail);
			errors.push(`"${jinjyaId}" 投稿失敗 (status ${response.status})`);
			continue;
		}

		// ③ 送信成功したバッファを削除（正確な KV キーで削除する）
		await Promise.all(entries.map((e) => env.JINJYA_STORE.delete(e.key)));
		successCount++;
	}

	return { successCount, errors };
}

export async function handlePublish(request: Request, env: Env): Promise<Response> {
	// レート制限チェック
	const limited = await rateLimited(request, env);
	if (limited) return limited;

	const { successCount, errors } = await publishBuffered(env);

	// 公開対象が一件も無い（バッファ空 or URL未登録のみ）
	if (successCount === 0 && errors.length === 0) {
		return text('公開対象のおみくじはありません', 200);
	}

	if (successCount === 0) {
		return text('投稿失敗:\n' + errors.join('\n'), 500);
	}

	return text(`成功: ${successCount} 神社\n${errors.join('\n')}`, errors.length ? 207 : 200);
}
