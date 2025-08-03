# ⛩️ 分散おみくじAPI - `jinjya-api`

## 概要

このプロジェクトは、**複数の神社（管理者）がおみくじを分散管理**できるAPIです。
ユーザーは `/api/draw` でおみくじを生成し、`/api/submit` で結果を投稿します。投稿されたデータは一時的にCloudflare KVに保存され、1時間ごとにバッチ処理で各神社のGoogle Apps Script（GAS）へ送信されます。

**神社側（スプレッドシート提供者）とユーザー側の役割が分かれています。**

---

## 🧙‍♂️ 神社を建てたい人向け（管理者）

### 1. Google Sheets を準備

以下の列を用意したスプレッドシートを作成してください：

```
timestamp | jinjya | fortune | message | tags | extra
```

- `tags`：{"恋愛":"良し","金運":"普通",...} のようなカテゴリごとの結果
- `extra`：{"LuckyColor":"青","Animal":"狐"} のような追加情報

### 2. GAS を設定

Google Apps Script を以下のように設定します：

```js
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("omikuji");
  const data = JSON.parse(e.postData.contents);
  const rows = Array.isArray(data) ? data : [data];

  rows.forEach(entry => {
    sheet.appendRow([
      entry.timestamp || new Date().toISOString(),
      entry.jinjya || "",
      entry.fortune || "",
      entry.message || "",
      JSON.stringify(entry.tags || {}),
      JSON.stringify(entry.extra || {})
    ]);
  });

  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
```

**→ ウェブアプリとして公開し、POST可能なURLを取得してください。**

### 3. API に登録（神社IDは一意）

**基本登録（タグ制限なし）:**
```bash
curl -X POST https://bakasekai.net/api/jinjya/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "furin",
    "name": "風鈴神社",
    "spreadsheet_url": "https://script.googleusercontent.com/...",
    "owner": "your-name-or-identifier"
  }'
```

**固定タグ付き登録（おすすめ）:**
```bash
curl -X POST https://bakasekai.net/api/jinjya/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "love_shrine",
    "name": "恋愛神社",
    "spreadsheet_url": "https://script.googleusercontent.com/...",
    "owner": "shrine-master",
    "tags": {
      "恋愛": "恋愛運について",
      "結婚": "結婚運について", 
      "人間関係": "人間関係について"
    }
  }'
```

**固定タグ機能とは？**
- 神社管理者が投稿可能なタグカテゴリを事前に制限できます
- ユーザーは指定されたカテゴリのみに運勢を投稿できます
- 一貫性のあるデータ収集が可能になります

---

## 👤 一般ユーザー（参拝者）

### おみくじを引く（GET）

```bash
curl https://bakasekai.net/api/draw
```

### 結果を提出する（POST）

```bash
curl -X POST https://bakasekai.net/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "jinjya": "furin",
    "fortune": "中吉",
    "message": "何事も成るようになります",
    "tags": {
      "恋愛": "穏やか",
      "仕事": "注意深く",
      "健康": "良好",
      "金運": "ちょっと無駄遣い",
      "学業": "コツコツやるべし"
    },
    "extra": {
      "ラッキーカラー": "青",
      "ラッキーアニマル": "狐",
      "開運方位": "南東"
    }
  }'
```

---

## 🧾 API一覧

| エンドポイント | メソッド | 概要 |
|----------------|----------|------|
| `/api/draw` | `GET` | ランダムなおみくじを引く |
| `/api/submit` | `POST` | おみくじ結果を送信（KVバッファに保存） |
| `/api/publish` | `POST` | バッファされたデータを各神社のGASへ送信 |
| `/api/read` | `GET` | 現在のKVバッファ内容を確認（開発用） |
| `/api/jinjya/list` | `GET` | 登録済み神社一覧 |
| `/api/jinjya/register` | `POST` | 神社を登録（GAS URLなど） |
| `/api/jinjya/deregister` | `POST` | 神社の登録を削除 |

### 📊 データフロー詳細

1. **投稿**: ユーザーが `/api/submit` でおみくじ結果を送信
2. **バッファ**: データは `buffer:{神社ID}:{タイムスタンプ}` の形式でCloudflare KVに一時保存
3. **バッチ処理**: 1時間ごと（毎時0分）にcronジョブが実行
4. **配信**: `/api/publish` でバッファされたデータを各神社のGASエンドポイントに送信
5. **削除**: 正常に送信されたデータはKVから削除

---

## 🗃️ データ構造テンプレ

**API送信データ形式（自由タグ）**:
```json
{
  "jinjya": "furin",
  "fortune": "大吉",
  "message": "今日は最高の日です。",
  "tags": {
    "恋愛": "運命的な出会いあり",
    "仕事": "大成功", 
    "健康": "絶好調",
    "金運": "臨時収入",
    "学業": "理解力向上"
  },
  "extra": {
    "ラッキーカラー": "金",
    "ラッキーアニマル": "猫",
    "開運方位": "東南",
    "ラッキーナンバー": "7"
  }
}
```

**API送信データ形式（固定タグ神社の場合）**:
```json
{
  "jinjya": "love_shrine",
  "fortune": "中吉",
  "message": "穏やかな日になりそうです。",
  "tags": {
    "恋愛": "素敵な出会いがあります",
    "結婚": "良い知らせが届くでしょう"
  },
  "extra": {
    "ラッキーカラー": "ピンク",
    "ラッキーアニマル": "うさぎ"
  }
}
```

**注意**: 固定タグが設定された神社では、`tags`に神社で許可されたカテゴリのみ使用できます。

**Google Sheets保存形式**:
```json
{
  "timestamp": "2025-08-03T12:00:00Z",
  "jinjya": "furin",
  "fortune": "大吉",
  "message": "今日は最高の日です。",
  "tags": "{\"恋愛\":\"運命的な出会いあり\",\"健康\":\"絶好調\"}",
  "extra": "{\"ラッキーカラー\":\"金\",\"ラッキーアニマル\":\"猫\"}"
}
```

---

## 🛡️ 安全設計・データ検証

### セキュリティ
- データは神社（オーナー）のスプレッドシートにしか送信されません
- クライアントは任意の神社に送信可能ですが、**GAS側の認証により不正投稿はブロックできます**
- 本API側ではパスワード・メールアドレス等の**個人情報を保持しません**

### データ検証
- **文字数制限**: すべての文字列フィールドは最大200文字まで
- **NGワード検証**: 不適切な投稿を自動フィルタリング
- **スキーマ検証**: Zodライブラリによる厳密な型チェック
- **必須フィールド**: `jinjya`, `fortune`, `message` は必須入力
- **固定タグ検証**: 神社に固定タグが設定されている場合、許可されたカテゴリのみ投稿可能

### エラー例
固定タグが設定された神社に間違ったカテゴリを投稿した場合：
```
400 Bad Request
Invalid tag category "学業". Allowed categories for this shrine: 恋愛, 結婚, 人間関係
```

---

## 💡 今後のアイデア（予定）

- Google / GitHub OAuth によるログイン認証
- おみくじの種類カスタマイズ（恋愛特化、戦国武将風、企業向けなど）
- 投稿数ランキング・人気神社表示
- おみくじの時限公開 or 定期的に更新

---

## 🛠️ 開発・デプロイ

### 開発コマンド
```bash
# 開発サーバー起動
npm run dev
# または
npm start

# テスト実行
npm test

# 型チェック
npm run cf-typegen

# 本番デプロイ
npm run deploy
```

### 技術スタック
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV Store
- **Language**: TypeScript
- **Validation**: Zod

---

## 📮 運営

- 開発者: [eightman](https://github.com/eightman999)
- ドメイン: `bakasekai.net`（Cloudflare Workers / Pagesで運用）
- リポジトリ: [jinjya-api](https://github.com/eightman999/jinjya-api)
