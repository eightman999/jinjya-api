import { handleSubmit } from "./api/submit";
import { handleDraw } from "./api/draw";
import { Env } from '../types/worker-configuration';
import { ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { handlePublish } from "./api/publish";
import { handleRead } from "./api/read";

async function handleCron(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	console.log("⛩️ Cron Trigger発動: Publishing...");
	await handlePublish(env);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;

		// API routing
		if (pathname === "/api/submit" && request.method === "POST") {
			return await handleSubmit(request, env);
		}

		if (pathname === "/api/draw" && request.method === "GET") {
			return await handleDraw(request, env);
		}

		if (request.method === "POST" && url.pathname === "/api/publish") {
			return await handlePublish(env);
		}
		if (request.method === "GET" && url.pathname === "/api/read") {
			return await handleRead(env);
		}

		return new Response("Not Found", { status: 404 });
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		await handleCron(event, env, ctx);
	},
};
