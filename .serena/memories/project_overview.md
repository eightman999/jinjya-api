# プロジェクト概要

## プロジェクトの目的
`jinjya-api`は、分散型おみくじAPIです。複数の神社（管理者）がそれぞれのおみくじを独立して管理し、ユーザーは統一されたAPIを通じておみくじを引いたり結果を投稿したりできるシステムです。

## 技術スタック
- **プラットフォーム**: Cloudflare Workers
- **ランタイム**: TypeScript/JavaScript (ES2021)
- **データベース**: Cloudflare D1 (SQLite)
- **ストレージ**: Cloudflare KV Store
- **バリデーション**: Zod
- **テスト**: Vitest + Cloudflare Workers test pool
- **デプロイ**: Wrangler CLI

## アーキテクチャ
- **バッファリングシステム**: ユーザーの投稿をKVストアで一時的にバッファリング
- **分散管理**: 各神社が独自のGoogle Sheetsエンドポイントを持つ
- **スケジュール実行**: 毎時0分にバッファデータを各神社のスプレッドシートに送信
- **APIゲートウェイ**: 統一されたエンドポイントで複数の神社を管理

## ドメイン
- プロダクション: `bakasekai.net/api/*`
- 開発者: eightman (GitHub: eightman999)