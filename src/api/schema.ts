import { z } from "zod";

export const OmikujiSchema = z.object({
	jinjya: z.string().min(1).max(64),
	fortune: z.string(),
	message: z.string(),
	tags: z.record(z.string()).optional().default({}), // おみくじカテゴリ（恋愛、金運など）
	extra: z.record(z.string()).optional().default({}), // 追加情報（ラッキーカラー、動物など）
});
