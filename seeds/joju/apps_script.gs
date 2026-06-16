/**
 * 成就神社(joju) 受け取り用 Google Apps Script (Webアプリ)。
 *
 * jinjya-api の /api/publish（毎時cron）から POST される
 * 「おみくじオブジェクトの配列」を受け取り、スプレッドシートに行追加する。
 *
 * 受信ペイロード例:
 *   [{ jinjya, fortune, message, tags:{仕事,学業,試験,対人},
 *      extra:{ラッキーアイテム,ラッキーカラー,吉方位,開運数字}, timestamp }]
 *
 * 【デプロイ手順】
 *   1. 対象スプレッドシートで 拡張機能 > Apps Script を開き、このコードを貼り付け
 *   2. デプロイ > 新しいデプロイ > 種類「ウェブアプリ」
 *        - 次のユーザーとして実行: 自分
 *        - アクセスできるユーザー: 全員
 *   3. 発行された /exec の URL を、神社登録の spreadsheet_url に設定する
 */

var SHEET_NAME = 'omikuji';
var HEADER = [
  '日時', 'jinjya', '運勢', 'メッセージ',
  '仕事', '学業', '試験', '対人',
  'ラッキーアイテム', 'ラッキーカラー', '吉方位', '開運数字',
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var payload = JSON.parse(e.postData.contents);
    var items = Array.isArray(payload) ? payload : [payload];

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADER);
    }

    var rows = items.map(function (o) {
      var t = o.tags || {};
      var x = o.extra || {};
      return [
        o.timestamp ? new Date(Number(o.timestamp)) : new Date(),
        o.jinjya || '',
        o.fortune || '',
        o.message || '',
        t['仕事'] || '',
        t['学業'] || '',
        t['試験'] || '',
        t['対人'] || '',
        x['ラッキーアイテム'] || '',
        x['ラッキーカラー'] || '',
        x['吉方位'] || '',
        x['開運数字'] || '',
      ];
    });

    if (rows.length > 0) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, rows.length, HEADER.length)
        .setValues(rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/** 動作確認用（任意）: ブラウザで /exec を開くと簡単なメッセージを返す。 */
function doGet() {
  return ContentService
    .createTextOutput('jinjya-api receiver for "joju" is alive.')
    .setMimeType(ContentService.MimeType.TEXT);
}
