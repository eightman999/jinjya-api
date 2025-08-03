import { handleSubmit } from "./api/submit";
import { handleDraw } from "./api/draw";
import { Env } from '../types/worker-configuration';
import { ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { handlePublish } from "./api/publish";
import { handleRead } from "./api/read";
import { handleList } from "./api/jinjya_list";
import { handleRegister } from "./api/jinjya_register";
import { handleDeregister } from "./api/jinjya_deregister";

async function handleCron(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	console.log("⛩️ Cron Trigger発動: Publishing...");
	await handlePublish(env);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;

		console.log("📡 Request received:", {
			pathname,
			method: request.method,
		});

		if (request.method === "POST" && url.pathname === "/api/publish") {
			return await handlePublish(env);
		}
		if (pathname === "/api/submit" && request.method === "POST") {
			return await handleSubmit(request, env);
		}

		if (pathname === "/api/draw" && request.method === "GET") {
			return await handleDraw(request, env);
		}

		if (request.method === "GET" && url.pathname === "/api/read") {
			return await handleRead(env);
		}
		if (pathname === "/api/jinjya/list" && request.method === "GET") {
			return await handleList(env);
		}

		if (pathname === "/api/jinjya/register" && request.method === "POST") {
			return await handleRegister(request, env);
		}

		if (pathname === "/api/jinjya/deregister" && request.method === "POST") {
			return await handleDeregister(request, env);
		}

		return new Response(`Not Found: ${pathname}`, { status: 404 });
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		await handleCron(event, env, ctx);
	},
};
