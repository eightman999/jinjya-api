#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""omikuji.csv の各行を /api/submit へ一括投稿する。

例:
  # ローカル(wrangler dev)へ
  python3 submit.py --base http://localhost:8787
  # 本番へ
  python3 submit.py --base https://bakasekai.net

レート制限は 10req/60s（IP単位）なので、--delay でリクエスト間隔を空ける。
429 を受けたら 60秒待って自動再試行する。
"""
import argparse
import csv
import json
import os
import time
import urllib.error
import urllib.request

TAG_KEYS = ["仕事", "学業", "試験", "対人"]
EXTRA_KEYS = ["ラッキーアイテム", "ラッキーカラー", "吉方位", "開運数字"]

# Cloudflare の Bot ブロック(error 1010)を避けるため、ブラウザ風の UA を付ける。
# urllib の既定 UA (Python-urllib/x.y) は WAF にボット判定され 403 になる。
DEFAULT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def post(base, payload, ua=DEFAULT_UA):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        base.rstrip("/") + "/api/submit",
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": ua, "Accept": "*/*"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def main():
    ap = argparse.ArgumentParser(description="omikuji.csv を /api/submit へ一括投稿")
    ap.add_argument("--base", default="https://bakasekai.net", help="API ベースURL")
    ap.add_argument("--csv", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "omikuji.csv"))
    ap.add_argument("--delay", type=float, default=7.0, help="リクエスト間隔秒（レート制限対策, 既定7.0）")
    ap.add_argument("--user-agent", default=DEFAULT_UA, help="送信時の User-Agent（Cloudflare Bot対策）")
    args = ap.parse_args()

    with open(args.csv, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    ok = ng = 0
    for i, row in enumerate(rows, 1):
        payload = {
            "jinjya": row["jinjya"],
            "fortune": row["fortune"],
            "message": row["message"],
            "tags": {k: row[k] for k in TAG_KEYS if row.get(k)},
            "extra": {k: row[k] for k in EXTRA_KEYS if row.get(k)},
        }
        status, body = post(args.base, payload, args.user_agent)
        if status == 429:
            print(f"[{i}/{len(rows)}] 429 rate limited -> 60秒待機して再試行")
            time.sleep(60)
            status, body = post(args.base, payload, args.user_agent)

        if status == 200:
            ok += 1
            mark = "OK"
        else:
            ng += 1
            mark = "NG"
        print(f"[{i}/{len(rows)}] {mark} {status} {row['fortune']} {body[:40]}")

        if i < len(rows):
            time.sleep(args.delay)

    print(f"done: {ok} ok / {ng} ng (base={args.base})")


if __name__ == "__main__":
    main()
