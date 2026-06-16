import { Env } from '../../types/worker-configuration';
import { checkRateLimit } from './checkRateLimit';

// すべての API レスポンスで共有する CORS ヘッダー。
// オープンな API なのでオリジンは開放しておく。
export const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

/** プレーンテキスト + CORS のレスポンスを返す。 */
export function text(body: string, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(body, { status, headers: { ...CORS_HEADERS, ...headers } });
}

/** JSON + CORS のレスポンスを返す。文字列はそのまま、それ以外は JSON.stringify する。 */
export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
	const body = typeof data === 'string' ? data : JSON.stringify(data);
	return new Response(body, {
		status,
		headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...headers },
	});
}

/** CORS プリフライト (OPTIONS) 用の空レスポンス。 */
export function preflight(): Response {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * レート制限ガード。制限超過時に 429 レスポンスを返し、許可時は null を返す。
 * 使い方: `const limited = await rateLimited(request, env); if (limited) return limited;`
 */
export async function rateLimited(request: Request, env: Env): Promise<Response | null> {
	const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
	if (!(await checkRateLimit(env, ip))) {
		return text('Too Many Requests', 429);
	}
	return null;
}
