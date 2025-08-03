import { handleSubmit } from "./api/submit";
import { handleDraw } from "./api/draw";
import { Env } from '../types/worker-configuration';
import { ExecutionContext } from '@cloudflare/workers-types';

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

		return new Response("Not Found", { status: 404 });
	},
};
