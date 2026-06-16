import { z } from "zod";

// jinjya は KV キー `buffer:{jinjya}:{timestamp}` の一部になるため、
// 区切り文字 ':' の混入を防ぐ目的で英数・ハイフン・アンダースコアに制限する。
export const OmikujiSchema = z.object({
	jinjya: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z0-9_-]+$/, 'jinjya must contain only letters, numbers, "-" or "_"'),
	fortune: z.string(),
	message: z.string(),
	tags: z.record(z.string(), z.string()).optional().default({}), // おみくじカテゴリ（恋愛、金運など）
	extra: z.record(z.string(), z.string()).optional().default({}), // 追加情報（ラッキーカラー、動物など）
});
