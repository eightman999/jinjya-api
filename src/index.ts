import { handleSubmit } from './api/submit';
import { handleDraw } from './api/draw';
import { Env } from '../types/worker-configuration';
import { ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { handlePublish, publishBuffered } from './api/publish';
import { handleRead } from './api/read';
import { handleList } from './api/jinjya_list';
import { handleRegister } from './api/jinjya_register';
import { handleDeregister } from './api/jinjya_deregister';
import { handleOmikujiAdd } from './api/omikuji_add';
import { preflight, text } from './utils/http';

async function handleCron(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	console.log('⛩️ Cron Trigger発動: Publishing...');
	await publishBuffered(env);
}

// 既知のAPIパス。ここに無いパスへのアクセスは脆弱性スキャナのボットが大半のため、
// ログを出さずに 404 を返す（Workers Logs の消費を抑える）。
const KNOWN_API_PATHS = new Set([
	'/api/publish',
	'/api/submit',
	'/api/draw',
	'/api/omikuji/add',
	'/api/read',
	'/api/jinjya/list',
	'/api/jinjya/register',
	'/api/jinjya/deregister',
]);

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;

		// HEAD は GET と同じルートで処理する（死活監視ツール対策）。
		// Workers ランタイムが HEAD レスポンスのボディを自動的に落とす。
		const method = request.method === 'HEAD' ? 'GET' : request.method;

		if (KNOWN_API_PATHS.has(pathname)) {
			console.log('📡 Request received:', {
				pathname,
				method: request.method,
			});
		}

		// CORS プリフライト
		if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
			return preflight();
		}

		// Handle API routes
		if (pathname === '/api/publish' && method === 'POST') {
			return await handlePublish(request, env);
		}
		if (pathname === '/api/submit' && method === 'POST') {
			return await handleSubmit(request, env);
		}
		if (pathname === '/api/draw' && method === 'GET') {
			return await handleDraw(request, env);
		}
		if (pathname === '/api/omikuji/add' && method === 'POST') {
			return await handleOmikujiAdd(request, env);
		}
		if (pathname === '/api/read' && method === 'GET') {
			return await handleRead(request, env);
		}
		if (pathname === '/api/jinjya/list' && method === 'GET') {
			return await handleList(request, env);
		}
		if (pathname === '/api/jinjya/register' && method === 'POST') {
			return await handleRegister(request, env);
		}
		if (pathname === '/api/jinjya/deregister' && method === 'POST') {
			return await handleDeregister(request, env);
		}

		// Serve static assets from public directory
		if (env.ASSETS) {
			// Rewrite root path to index.html
			if (pathname === '/' || pathname === '') {
				return env.ASSETS.fetch(new URL('/index.html', request.url));
			}

			// Try to serve the static asset
			const assetResponse = await env.ASSETS.fetch(request);

			// If asset exists, return it
			if (assetResponse.status !== 404) {
				return assetResponse;
			}
		}

		return text(`Not Found: ${pathname}`, 404);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		await handleCron(event, env, ctx);
	},
};
