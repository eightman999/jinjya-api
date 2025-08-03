# 推奨コマンド

## 開発コマンド
- `npm run dev` - 開発サーバー起動
- `npm start` - 開発サーバー起動（devのエイリアス）
- `npm test` - テスト実行
- `npm run deploy` - 本番環境へデプロイ
- `npm run cf-typegen` - Cloudflare Workers型定義生成

## Wranglerコマンド
- `wrangler dev` - ローカル開発サーバー
- `wrangler deploy` - デプロイ
- `wrangler types` - 型定義ファイル生成
- `wrangler d1 execute JINJYA_DB --file=schema.sql` - データベーススキーマ適用

## システムコマンド（macOS）
- `ls` - ファイル一覧表示
- `find` - ファイル検索
- `grep` - テキスト検索
- `git` - バージョン管理
- `cd` - ディレクトリ移動

## テスト・品質チェック
- `npm test` - Vitestでのテスト実行
- TypeScriptコンパイルチェックは`wrangler dev`や`wrangler deploy`時に自動実行

## デバッグ
- `wrangler tail` - ログストリーミング
- `console.log()` - Workers内でのログ出力