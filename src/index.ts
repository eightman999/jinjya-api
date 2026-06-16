import { handleSubmit } from './api/submit';
import { handleDraw } from './api/draw';
import { Env } from '../types/worker-configuration';
import { ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { handlePublish, publishBuffered } from './api/publish';
import { handleRead } from './api/read';
import { handleList } from './api/jinjya_list';
import { handleRegister } from './api/jinjya_register';
import { handleDeregister } from './api/jinjya_deregister';
import { preflight, text } from './utils/http';

async function handleCron(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	console.log('⛩️ Cron Trigger発動: Publishing...');
	await publishBuffered(env);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;

		console.log('📡 Request received:', {
			pathname,
			method: request.method,
		});

		// CORS プリフライト
		if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
			return preflight();
		}

		// Handle API routes
		if (pathname === '/api/publish' && request.method === 'POST') {
			return await handlePublish(request, env);
		}
		if (pathname === '/api/submit' && request.method === 'POST') {
			return await handleSubmit(request, env);
		}
		if (pathname === '/api/draw' && request.method === 'GET') {
			return await handleDraw(request, env);
		}
		if (pathname === '/api/read' && request.method === 'GET') {
			return await handleRead(request, env);
		}
		if (pathname === '/api/jinjya/list' && request.method === 'GET') {
			return await handleList(request, env);
		}
		if (pathname === '/api/jinjya/register' && request.method === 'POST') {
			return await handleRegister(request, env);
		}
		if (pathname === '/api/jinjya/deregister' && request.method === 'POST') {
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
