# 成就神社 (`joju`) シード一式

仕事・学業の目標成就をテーマにした新しい神社のセットアップ用データ。

- **神社ID**: `joju`（`^[A-Za-z0-9_-]+$` 準拠）
- **神社名**: 成就神社
- **固定タグカテゴリ**: `仕事` / `学業` / `試験` / `対人`
  - 固定タグを設定しているため、`/api/submit` では**この4カテゴリ以外の tags キーは 400** で弾かれる。

## ファイル

| ファイル | 用途 | 列 |
|---|---|---|
| `shrine.csv` | 神社登録（`/api/jinjya/register`）用の1行 | `id, name, spreadsheet_url, owner, tags(JSON)` |
| `omikuji.csv` | おみくじ本体 56件（大吉〜大凶 ×各8） | `jinjya, fortune, message, 仕事, 学業, 試験, 対人, ラッキーアイテム, ラッキーカラー, 吉方位, 開運数字` |
| `sheets_template.csv` | publish 先 Google Sheets のヘッダー雛形 | 上記 + 先頭に `timestamp`（epoch ミリ秒） |
| `submit.py` | `omikuji.csv` を `/api/submit` へ一括投稿 | — |
| `generate_omikuji.py` | `omikuji.csv` の再生成スクリプト | — |

`omikuji.csv` の `仕事/学業/試験/対人` 列は API の **`tags`**、`ラッキー〜/吉方位/開運数字` 列は **`extra`** に対応する。

## セットアップ手順

### 1. 神社を登録する
`shrine.csv` の `spreadsheet_url` を、自分の Google Apps Script Webhook URL に差し替えてから登録する。

```bash
# 本番に登録（owner はオプションだが、本番DBは owner NOT NULL のため値を入れておく）
curl -X POST https://bakasekai.net/api/jinjya/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "joju",
    "name": "成就神社",
    "spreadsheet_url": "https://script.google.com/macros/s/REPLACE_WITH_YOUR_GAS_WEBHOOK/exec",
    "owner": "eightman",
    "tags": {"仕事":"仕事・キャリア運","学業":"学業・勉強運","試験":"試験・合格運","対人":"職場や学校の対人運"}
  }'
```

### 2. おみくじを一括投稿する
```bash
# ローカル(wrangler dev)で試す
python3 submit.py --base http://localhost:8787
# 本番へ投入
python3 submit.py --base https://bakasekai.net
```
> レート制限は **10req/60s（IP単位）**。`submit.py` は既定で 7秒間隔、429 を受けたら 60秒待って再試行する。56件で約6〜7分。

### 3. 動作確認
```bash
curl "https://bakasekai.net/api/draw?jinjya=joju"     # ランダムに1件引く
curl "https://bakasekai.net/api/read?jinjya=joju"      # joju のバッファ全件
```

### 4. Google Sheets への配信
毎時0分の cron（または `POST /api/publish`）で、バッファ済みデータが各神社の `spreadsheet_url` に送られる。
送信ペイロードは `{jinjya, fortune, message, tags{}, extra{}, timestamp}` の配列。`sheets_template.csv` は
それを GAS 側でフラットに記録する場合のシート列の雛形（`timestamp` は epoch ミリ秒）。

## 注意
- `omikuji.csv` を編集したら内容を増やせる。`generate_omikuji.py` の文面プールを編集して `python3 generate_omikuji.py` で再生成も可。
- 全文字列フィールドは最大200文字・NGワード検証あり（`tags`/`extra` はキーも値も対象）。
