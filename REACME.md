# ⛩️ 分散おみくじAPI - `jinjya-api`

## 概要

このプロジェクトは、**複数の神社（管理者）がおみくじを分散管理**できるAPIです。
ユーザーは `/api/draw` でおみくじを取得し、 `/api/submit` で結果を投稿、定期的に `/api/publish` によりスプレッドシートへ送信されます。

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

```bash
curl -X POST https://jinjya-api.eightman124.workers.dev/api/jinjya/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "furin",
    "name": "風鈴神社",
    "spreadsheet_url": "https://script.googleusercontent.com/...",
    "owner": "your-name-or-identifier"
  }'
```

---

## 👤 一般ユーザー（参拝者）

### おみくじを引く（GET）

```bash
curl https://jinjya-api.eightman124.workers.dev/api/draw
```

### 結果を提出する（POST）

```bash
curl -X POST https://jinjya-api.eightman124.workers.dev/api/submit \
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

## 🧾 管理API一覧

| エンドポイント | 概要 |
|----------------|------|
| `GET  /api/draw` | おみくじを引く |
| `POST /api/submit` | 結果を送信 |
| `POST /api/publish` | バッファされたデータを各神社のGASへ送信 |
| `GET  /api/jinjya/list` | 登録済み神社一覧 |
| `POST /api/jinjya/register` | 神社を登録（GAS URLなど）|

---

## 🗃️ データ構造テンプレ

**API送信データ形式**:
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

## 🛡️ 安全設計

- データは神社（オーナー）のスプレッドシートにしか送信されません
- クライアントは任意の神社に送信可能ですが、**GAS側の認証により不正投稿はブロックできます**
- 本API側ではパスワード・メールアドレス等の**個人情報を保持しません**

---

## 💡 今後のアイデア（予定）

- Google / GitHub OAuth によるログイン認証
- おみくじの種類カスタマイズ（恋愛特化、戦国武将風、企業向けなど）
- 投稿数ランキング・人気神社表示
- おみくじの時限公開 or 定期的に更新

---

## 📮 運営

- 開発者: [eightman](https://github.com/eightman999)
- ドメイン: `bakasekai.net`（Cloudflare Workers / Pagesで運用）
