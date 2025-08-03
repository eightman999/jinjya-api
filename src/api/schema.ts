import { z } from "zod";

export const OmikujiSchema = z.object({
	jinjya: z.string().min(1).max(64),
	fortune: z.string(),
	message: z.string(),
	love: z.string(),
	work: z.string(),
	health: z.string(),
	money: z.string(),
	study: z.string(),
});
