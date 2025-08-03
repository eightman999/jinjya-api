# コードスタイルと規約

## TypeScript設定
- **Target**: ES2021
- **Module**: ES2022
- **Strict Mode**: 有効
- **型定義**: Cloudflare Workers用型定義を使用

## 命名規約
- **ファイル名**: snake_case（例: `jinjya_register.ts`）
- **関数名**: camelCase（例: `handleSubmit`）
- **定数**: UPPER_SNAKE_CASE（例: `MAX_LENGTH`, `NG_WORDS`）
- **型/インターフェース**: PascalCase（例: `OmikujiSubmission`）

## ファイル構造
```
src/
  api/           # APIエンドポイント
  constants/     # 定数
  types/         # 型定義
  utils/         # ユーティリティ
  index.ts       # メインエントリーポイント
```

## エラーハンドリング
- try-catchブロックでエラーキャッチ
- console.errorでエラーログ
- 適切なHTTPステータスコード返却

## バリデーション
- Zodスキーマを使用した入力検証
- NGワードフィルタリング
- 文字数制限チェック

## ログ出力
- `console.log()` でデバッグ情報
- `console.error()` でエラー情報
- 絵文字を使った分かりやすいログメッセージ（例: "⛩️", "🔥"）