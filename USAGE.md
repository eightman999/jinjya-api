# jinjya-api 利用ガイド / Usage Guide

## 日本語版

### 📖 概要

`jinjya-api`は、複数の神社が独立しておみくじを管理できる分散型APIです。ユーザーはおみくじを投稿し、他のユーザーがランダムに引くことができます。データは最終的に各神社のGoogle Sheetsに自動配信されます。

**APIベースURL**: `https://bakasekai.net/api`

---

### 🚀 クイックスタート

#### 1. おみくじを投稿する

```bash
curl -X POST https://bakasekai.net/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "jinjya": "furin",
    "fortune": "大吉",
    "message": "素晴らしい一日になります",
    "tags": {
      "恋愛": "良い出会いがあります",
      "金運": "投資のチャンス"
    },
    "extra": {
      "ラッキーカラー": "赤",
      "ラッキーアニマル": "龍"
    }
  }'
```

#### 2. おみくじを引く

```bash
curl https://bakasekai.net/api/draw?jinjya=furin
```

---

### 📚 APIエンドポイント詳細

#### 1️⃣ おみくじ投稿 - `POST /api/submit`

おみくじをバッファに投稿します。

**リクエストボディ**:
```json
{
  "jinjya": "神社ID（必須、1-64文字の半角英数字・ハイフン・アンダースコア）",
  "fortune": "運勢レベル（必須、例: 大吉、中吉、小吉、凶）",
  "message": "メッセージ本文（必須、最大200文字）",
  "tags": {
    "カテゴリ名": "カテゴリ別の運勢（オプション）"
  },
  "extra": {
    "キー": "追加情報（オプション）"
  }
}
```

**フィールド説明**:
- `jinjya`: 投稿先の神社ID（事前に登録が必要）
- `fortune`: 運勢の結果（大吉、中吉、小吉、吉、末吉、凶など）
- `message`: おみくじのメインメッセージ
- `tags`: カテゴリ別の運勢（恋愛、金運、仕事、健康、学業など）
  - **注意**: 神社が固定タグカテゴリを設定している場合、そのカテゴリのみ使用可能
- `extra`: ラッキーカラー、ラッキーアニマル、開運方位などの追加情報

**バリデーション**:
- 各フィールド（`tags`と`extra`のキー・値を含む）最大200文字
- NGワードチェック適用（`tags`と`extra`のキー・値を含む）
- レート制限: 60秒間に10リクエスト

**レスポンス**:
- `200 OK`: "奉納を受け付けました🙏"
- `400 Bad Request`: バリデーションエラー
- `429 Too Many Requests`: レート制限超過

**使用例**:
```javascript
// JavaScript (fetch)
const response = await fetch('https://bakasekai.net/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jinjya: 'furin',
    fortune: '中吉',
    message: '何事も成るようになります',
    tags: {
      恋愛: '穏やかな日々',
      仕事: '注意深く進めよう'
    }
  })
});

const result = await response.text();
console.log(result); // "奉納を受け付けました🙏"
```

---

#### 2️⃣ おみくじ抽選 - `GET /api/draw`

指定した神社のバッファからランダムにおみくじを1つ抽選します。

**クエリパラメータ**:
- `jinjya`: 神社ID（省略時は`default`）

**レスポンス例**:
```json
{
  "jinjya": "furin",
  "fortune": "大吉",
  "message": "今日は最高の日です",
  "tags": {
    "恋愛": "良好",
    "金運": "金運上昇"
  },
  "extra": {
    "ラッキーカラー": "金",
    "ラッキーアニマル": "龍"
  }
}
```

**エラーレスポンス**:
- `404 Not Found`: "まだ誰も奉納していません🙏" （バッファが空）
- `500 Internal Server Error`: データ取得失敗

**使用例**:
```python
# Python
import requests

response = requests.get('https://bakasekai.net/api/draw?jinjya=furin')
omikuji = response.json()

print(f"運勢: {omikuji['fortune']}")
print(f"メッセージ: {omikuji['message']}")
```

---

#### 3️⃣ 神社登録 - `POST /api/jinjya/register`

新しい神社を登録します。登録後、その神社IDでおみくじの投稿・抽選が可能になります。

**リクエストボディ**:
```json
{
  "id": "神社の一意ID（必須）",
  "name": "神社の表示名（必須）",
  "spreadsheet_url": "Google Apps Script WebhookのURL（必須）",
  "owner": "管理者識別子（オプション）",
  "tags": {
    "カテゴリ名": "説明（オプション）"
  }
}
```

**固定タグカテゴリについて**:
- `tags`を指定すると、その神社では指定したカテゴリのみ投稿可能
- 未指定の場合、任意のタグカテゴリを許可

**使用例（固定タグあり）**:
```bash
curl -X POST https://bakasekai.net/api/jinjya/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "love_shrine",
    "name": "恋愛神社",
    "spreadsheet_url": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
    "owner": "shrine_master",
    "tags": {
      "恋愛": "恋愛運について",
      "結婚": "結婚運について",
      "人間関係": "人間関係について"
    }
  }'
```

この場合、`love_shrine`への投稿では`恋愛`、`結婚`、`人間関係`のタグのみ使用可能です。

**レスポンス**:
- `201 Created`: "神社を登録しました"
- `409 Conflict`: 神社IDが既に存在
- `400 Bad Request`: 必須フィールド不足

---

#### 4️⃣ 神社一覧取得 - `GET /api/jinjya/list`

登録されている全神社の情報を取得します。

**レスポンス例**:
```json
[
  {
    "id": "furin",
    "name": "風鈴神社",
    "owner": "eightman",
    "created_at": 1691234567
  },
  {
    "id": "love_shrine",
    "name": "恋愛神社",
    "owner": "shrine_master",
    "created_at": 1691234890
  }
]
```

---

#### 5️⃣ データ配信 - `POST /api/publish`

バッファ内のおみくじデータを各神社のGoogle Sheetsに手動で配信します。送信されるデータには、KVに保存されたタイムスタンプが含まれます。

**注意**:
- 通常はCronジョブで毎時0分に自動実行されます
- このエンドポイントは手動配信や障害復旧時に使用
- レート制限の対象です
- Webhook側でエラーが発生した場合も、詳細なエラーメッセージは返さず一般的なステータスのみを返します

**レスポンス例**:
- `200 OK`: "成功: 2 神社"
- `200 OK`: "公開対象のおみくじはありません" (バッファが空の場合)

---

#### 6️⃣ 神社削除 - `POST /api/jinjya/deregister`

登録済みの神社を削除します。このエンドポイントもレート制限の対象です。

**リクエストボディ**:
```json
{
  "id": "削除する神社ID"
}
```

---

#### 7️⃣ バッファ確認 - `GET /api/read`

現在のKVバッファの内容を確認します（デバッグ用）。

**クエリパラメータ**:
- `jinjya`: 神社ID（オプション）。指定した場合はその神社のバッファのみ、省略した場合は全神社のバッファを返します。

---

### 🔗 Google Sheets連携の設定

おみくじデータを自動的にGoogle Sheetsに記録するための設定方法です。

#### ステップ1: Google Sheetsを作成

1. Google Sheetsで新しいスプレッドシートを作成
2. 以下のヘッダー行を追加:
   ```
   | タイムスタンプ | 神社ID | 運勢 | メッセージ | タグ | 追加情報 |
   ```

#### ステップ2: Google Apps Scriptを設定

1. `拡張機能` → `Apps Script` を開く
2. 以下のコードを貼り付け:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  // データが配列で送られてくる
  data.forEach(omikuji => {
    sheet.appendRow([
      new Date(),
      omikuji.jinjya,
      omikuji.fortune,
      omikuji.message,
      JSON.stringify(omikuji.tags || {}),
      JSON.stringify(omikuji.extra || {})
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    count: data.length
  })).setMimeType(ContentService.MimeType.JSON);
}
```

3. `デプロイ` → `新しいデプロイ` を選択
4. 種類: `ウェブアプリ`
5. アクセス権限: `全員`
6. デプロイして、生成されたURLをコピー

#### ステップ3: 神社を登録

```bash
curl -X POST https://bakasekai.net/api/jinjya/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my_shrine",
    "name": "私の神社",
    "spreadsheet_url": "コピーしたGoogle Apps ScriptのURL",
    "owner": "your_name"
  }'
```

これで、毎時0分にバッファ内のデータが自動的にGoogle Sheetsに記録されます。

---

### 💡 実装例

#### シンプルなおみくじアプリ（HTML + JavaScript）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>おみくじアプリ</title>
</head>
<body>
  <h1>🎋 おみくじを引く</h1>

  <div>
    <label>神社ID: <input type="text" id="jinjyaId" value="furin"></label>
    <button onclick="drawOmikuji()">おみくじを引く</button>
  </div>

  <div id="result"></div>

  <hr>

  <h2>おみくじを投稿</h2>
  <form onsubmit="submitOmikuji(event)">
    <label>運勢: <input type="text" name="fortune" required></label><br>
    <label>メッセージ: <textarea name="message" required></textarea></label><br>
    <button type="submit">投稿</button>
  </form>

  <script>
    const API_BASE = 'https://bakasekai.net/api';

    async function drawOmikuji() {
      const jinjya = document.getElementById('jinjyaId').value;
      const response = await fetch(`${API_BASE}/draw?jinjya=${jinjya}`);

      if (response.ok) {
        const omikuji = await response.json();
        document.getElementById('result').innerHTML = `
          <h2>${omikuji.fortune}</h2>
          <p>${omikuji.message}</p>
          <pre>${JSON.stringify(omikuji.tags, null, 2)}</pre>
        `;
      } else {
        document.getElementById('result').textContent = await response.text();
      }
    }

    async function submitOmikuji(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const jinjya = document.getElementById('jinjyaId').value;

      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jinjya,
          fortune: formData.get('fortune'),
          message: formData.get('message'),
          tags: { 恋愛: '良好' }
        })
      });

      alert(await response.text());
    }
  </script>
</body>
</html>
```

---

### ⚠️ 注意事項

- **レート制限**: 各エンドポイントは60秒間に10リクエストまで
- **CORS**: 全ての `/api/*` でCORSが有効です。
- **文字数制限**: 各フィールドは最大200文字
- **NGワード**: 不適切な内容は自動的に拒否されます
- **バッファ上限**: 1神社あたり1000件まで（超過時は古いデータから削除）
- **データ保持**: バッファデータは配信成功後に削除されます

---

---

## English Version

### 📖 Overview

`jinjya-api` is a distributed omikuji (fortune-telling) API that allows multiple shrines to independently manage their fortune data. Users can submit omikuji results, and others can randomly draw them. Data is automatically published to each shrine's Google Sheets.

**API Base URL**: `https://bakasekai.net/api`

---

### 🚀 Quick Start

#### 1. Submit an Omikuji

```bash
curl -X POST https://bakasekai.net/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "jinjya": "furin",
    "fortune": "Great Blessing",
    "message": "It will be a wonderful day",
    "tags": {
      "Love": "Good encounters ahead",
      "Money": "Investment opportunity"
    },
    "extra": {
      "Lucky Color": "Red",
      "Lucky Animal": "Dragon"
    }
  }'
```

#### 2. Draw an Omikuji

```bash
curl https://bakasekai.net/api/draw?jinjya=furin
```

---

### 📚 API Endpoint Details

#### 1️⃣ Submit Omikuji - `POST /api/submit`

Submit an omikuji to the buffer.

**Request Body**:
```json
{
  "jinjya": "Shrine ID (required, 1-64 chars: letters, digits, hyphens, underscores)",
  "fortune": "Fortune level (required, e.g., Great Blessing, Good Blessing)",
  "message": "Message body (required, max 200 characters)",
  "tags": {
    "Category": "Category-specific fortune (optional)"
  },
  "extra": {
    "Key": "Additional information (optional)"
  }
}
```

**Field Descriptions**:
- `jinjya`: Target shrine ID (must be registered beforehand)
- `fortune`: Fortune result (Great Blessing, Good Blessing, Small Blessing, Bad Luck, etc.)
- `message`: Main omikuji message
- `tags`: Category-specific fortunes (Love, Money, Work, Health, Study, etc.)
  - **Note**: If the shrine has fixed tag categories, only those categories are accepted
- `extra`: Additional info like lucky color, lucky animal, auspicious direction

**Validation**:
- Max 200 characters per field (including `tags` and `extra` keys and values)
- NG word filtering applied (including `tags` and `extra` keys and values)
- Rate limit: 10 requests per 60 seconds

**Response**:
- `200 OK`: "奉納を受け付けました🙏" (Offering accepted)
- `400 Bad Request`: Validation error
- `429 Too Many Requests`: Rate limit exceeded

**Example Usage**:
```javascript
// JavaScript (fetch)
const response = await fetch('https://bakasekai.net/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jinjya: 'furin',
    fortune: 'Good Blessing',
    message: 'Things will work out naturally',
    tags: {
      Love: 'Peaceful days',
      Work: 'Proceed carefully'
    }
  })
});

const result = await response.text();
console.log(result);
```

---

#### 2️⃣ Draw Omikuji - `GET /api/draw`

Randomly draw one omikuji from the specified shrine's buffer.

**Query Parameters**:
- `jinjya`: Shrine ID (defaults to `default` if omitted)

**Response Example**:
```json
{
  "jinjya": "furin",
  "fortune": "Great Blessing",
  "message": "Today is the best day",
  "tags": {
    "Love": "Excellent",
    "Money": "Fortune rising"
  },
  "extra": {
    "Lucky Color": "Gold",
    "Lucky Animal": "Dragon"
  }
}
```

**Error Responses**:
- `404 Not Found`: "まだ誰も奉納していません🙏" (No offerings yet)
- `500 Internal Server Error`: Data retrieval failed

**Example Usage**:
```python
# Python
import requests

response = requests.get('https://bakasekai.net/api/draw?jinjya=furin')
omikuji = response.json()

print(f"Fortune: {omikuji['fortune']}")
print(f"Message: {omikuji['message']}")
```

---

#### 3️⃣ Register Shrine - `POST /api/jinjya/register`

Register a new shrine. After registration, omikuji submission and drawing become available for that shrine ID.

**Request Body**:
```json
{
  "id": "Unique shrine ID (required)",
  "name": "Shrine display name (required)",
  "spreadsheet_url": "Google Apps Script Webhook URL (required)",
  "owner": "Owner identifier (optional)",
  "tags": {
    "Category Name": "Description (optional)"
  }
}
```

**About Fixed Tag Categories**:
- If `tags` is specified, only those categories are accepted for that shrine
- If omitted, any tag categories are allowed

**Example Usage (with fixed tags)**:
```bash
curl -X POST https://bakasekai.net/api/jinjya/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "love_shrine",
    "name": "Love Shrine",
    "spreadsheet_url": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
    "owner": "shrine_master",
    "tags": {
      "Love": "About love fortune",
      "Marriage": "About marriage fortune",
      "Relationships": "About relationships"
    }
  }'
```

In this case, submissions to `love_shrine` can only use `Love`, `Marriage`, and `Relationships` tags.

**Response**:
- `201 Created`: "神社を登録しました" (Shrine registered)
- `409 Conflict`: Shrine ID already exists
- `400 Bad Request`: Missing required fields

---

#### 4️⃣ List Shrines - `GET /api/jinjya/list`

Retrieve information about all registered shrines.

**Response Example**:
```json
[
  {
    "id": "furin",
    "name": "Wind Bell Shrine",
    "owner": "eightman",
    "created_at": 1691234567
  },
  {
    "id": "love_shrine",
    "name": "Love Shrine",
    "owner": "shrine_master",
    "created_at": 1691234890
  }
]
```

---

#### 5️⃣ Publish Data - `POST /api/publish`

Manually publish buffered omikuji data to each shrine's Google Sheets. The published payload includes a timestamp field restored from the KV buffer.

**Note**:
- Normally executed automatically by cron job at the top of every hour
- This endpoint is for manual publishing or disaster recovery
- Rate-limited
- Webhook errors are not echoed verbatim to the caller; only a generic status is returned.

**Response Example**:
- `200 OK`: "成功: 2 神社" (Success: 2 shrines)
- `200 OK`: "公開対象のおみくじはありません" (When buffer is empty)

---

#### 6️⃣ Deregister Shrine - `POST /api/jinjya/deregister`

Delete a registered shrine. This endpoint is rate-limited.

**Request Body**:
```json
{
  "id": "Shrine ID to delete"
}
```

---

#### 7️⃣ Read Buffer - `GET /api/read`

View current KV buffer contents (for debugging).

**Query Parameters**:
- `jinjya`: Shrine ID (optional). If specified, returns only that shrine's buffer. If omitted, returns buffers for all shrines.

---

### 🔗 Google Sheets Integration Setup

How to configure automatic recording of omikuji data to Google Sheets.

#### Step 1: Create Google Sheets

1. Create a new spreadsheet in Google Sheets
2. Add the following header row:
   ```
   | Timestamp | Shrine ID | Fortune | Message | Tags | Extra |
   ```

#### Step 2: Configure Google Apps Script

1. Open `Extensions` → `Apps Script`
2. Paste the following code:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  // Data is sent as an array
  data.forEach(omikuji => {
    sheet.appendRow([
      new Date(),
      omikuji.jinjya,
      omikuji.fortune,
      omikuji.message,
      JSON.stringify(omikuji.tags || {}),
      JSON.stringify(omikuji.extra || {})
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    count: data.length
  })).setMimeType(ContentService.MimeType.JSON);
}
```

3. Select `Deploy` → `New deployment`
4. Type: `Web app`
5. Access permissions: `Anyone`
6. Deploy and copy the generated URL

#### Step 3: Register Your Shrine

```bash
curl -X POST https://bakasekai.net/api/jinjya/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my_shrine",
    "name": "My Shrine",
    "spreadsheet_url": "Copied Google Apps Script URL",
    "owner": "your_name"
  }'
```

Now, buffered data will be automatically recorded to Google Sheets at the top of every hour.

---

### 💡 Implementation Examples

#### Simple Omikuji App (HTML + JavaScript)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Omikuji App</title>
</head>
<body>
  <h1>🎋 Draw Omikuji</h1>

  <div>
    <label>Shrine ID: <input type="text" id="jinjyaId" value="furin"></label>
    <button onclick="drawOmikuji()">Draw Omikuji</button>
  </div>

  <div id="result"></div>

  <hr>

  <h2>Submit Omikuji</h2>
  <form onsubmit="submitOmikuji(event)">
    <label>Fortune: <input type="text" name="fortune" required></label><br>
    <label>Message: <textarea name="message" required></textarea></label><br>
    <button type="submit">Submit</button>
  </form>

  <script>
    const API_BASE = 'https://bakasekai.net/api';

    async function drawOmikuji() {
      const jinjya = document.getElementById('jinjyaId').value;
      const response = await fetch(`${API_BASE}/draw?jinjya=${jinjya}`);

      if (response.ok) {
        const omikuji = await response.json();
        document.getElementById('result').innerHTML = `
          <h2>${omikuji.fortune}</h2>
          <p>${omikuji.message}</p>
          <pre>${JSON.stringify(omikuji.tags, null, 2)}</pre>
        `;
      } else {
        document.getElementById('result').textContent = await response.text();
      }
    }

    async function submitOmikuji(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const jinjya = document.getElementById('jinjyaId').value;

      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jinjya,
          fortune: formData.get('fortune'),
          message: formData.get('message'),
          tags: { Love: 'Excellent' }
        })
      });

      alert(await response.text());
    }
  </script>
</body>
</html>
```

---

### ⚠️ Important Notes

- **Rate Limiting**: Each endpoint allows 10 requests per 60 seconds
- **CORS**: CORS is enabled on all `/api/*` endpoints.
- **Character Limit**: Each field has a maximum of 200 characters
- **NG Words**: Inappropriate content is automatically rejected
- **Buffer Limit**: 1000 entries per shrine (oldest deleted when exceeded)
- **Data Retention**: Buffer data is deleted after successful publishing

---

## 📞 Support

For issues or questions:
- GitHub: https://github.com/eightman999/jinjya-api
- Documentation: See `CLAUDE.md` and `仕様書.md`

---

**Last Updated**: 2025-12-20
**Version**: 1.0.0
